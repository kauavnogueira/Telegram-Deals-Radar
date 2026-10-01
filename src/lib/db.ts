import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { Product, ProductFilterQuery, SortOption, Coupon, CouponFilterQuery, MonitoredChannel } from './types';
import { extractProductTitle, isStoreBanner } from './parser';
const DB_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_PATH = path.join(DB_DIR, 'products.sqlite');

let dbInstance: DatabaseSync | null = null;

export function getDatabase(): DatabaseSync {
  if (!dbInstance) {
    dbInstance = new DatabaseSync(DB_PATH);
    dbInstance.exec('PRAGMA journal_mode = WAL;');
    dbInstance.exec('PRAGMA busy_timeout = 5000;');
    initTables(dbInstance);
  }
  return dbInstance;
}

export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function formatChannelUsername(raw: string): string {
  if (!raw) return '';
  let cleaned = raw.trim();
  cleaned = cleaned.replace(/^https?:\/\/t\.me\//i, '');
  cleaned = cleaned.replace(/^t\.me\//i, '');
  cleaned = cleaned.replace(/[/?#].*$/, '');
  cleaned = cleaned.trim();
  if (!cleaned) return '';
  if (/^-?\d+$/.test(cleaned)) {
    return cleaned;
  }
  cleaned = cleaned.replace(/^@+/, '');
  if (!cleaned) return '';
  return `@${cleaned}`;
}
function initTables(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      telegram_message_id INTEGER,
      channel_name TEXT NOT NULL,
      channel_id TEXT,
      title TEXT NOT NULL,
      price REAL NOT NULL,
      original_price REAL,
      discount_percent REAL,
      coupon TEXT,
      url TEXT NOT NULL,
      store TEXT NOT NULL,
      raw_text TEXT NOT NULL,
      image_url TEXT,
      normalized_text TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_products_price ON products (price);
    CREATE INDEX IF NOT EXISTS idx_products_discount ON products (discount_percent);
    CREATE INDEX IF NOT EXISTS idx_products_created_at ON products (created_at);
    CREATE INDEX IF NOT EXISTS idx_products_store ON products (store);
    CREATE INDEX IF NOT EXISTS idx_products_channel_msg ON products (channel_name, telegram_message_id);
    CREATE TABLE IF NOT EXISTS coupons (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      store TEXT NOT NULL,
      title TEXT NOT NULL,
      discount_description TEXT,
      min_spend REAL,
      channel_name TEXT NOT NULL,
      url TEXT NOT NULL,
      raw_text TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      UNIQUE(code, store)
    );

    CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons (code);
    CREATE INDEX IF NOT EXISTS idx_coupons_store ON coupons (store);
    CREATE INDEX IF NOT EXISTS idx_coupons_created_at ON coupons (created_at);

    CREATE TABLE IF NOT EXISTS collector_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS monitored_channels (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      title TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_monitored_channels_username ON monitored_channels (username);
  `);

  try {
    db.exec('ALTER TABLE products ADD COLUMN normalized_text TEXT;');
  } catch {
  }

  db.exec('CREATE INDEX IF NOT EXISTS idx_products_normalized_text ON products (normalized_text);');

  try {
    interface UnmigratedRow {
      id: string;
      title: string;
      coupon?: string | null;
      store: string;
      channel_name: string;
    }
    const unmigrated = db.prepare("SELECT id, title, coupon, store, channel_name FROM products WHERE normalized_text IS NULL").all() as unknown as UnmigratedRow[];
    if (unmigrated && unmigrated.length > 0) {
      const updateStmt = db.prepare("UPDATE products SET normalized_text = ? WHERE id = ?");
      for (const row of unmigrated) {
        const norm = normalizeText(`${row.title} ${row.coupon || ''} ${row.store || ''} ${row.channel_name || ''}`);
        updateStmt.run(norm, row.id);
      }
    }
  } catch (err) {
    console.error('Erro na migração de normalized_text:', err);
  }

  try {
    repairBadProductTitles(db);
  } catch (err) {
    console.error('Erro na auto-cura de títulos:', err);
  }

  try {
    interface CountResult {
      count: number;
    }
    const channelCountRow = db.prepare('SELECT COUNT(*) as count FROM monitored_channels').get() as unknown as CountResult | undefined;
    if (!channelCountRow || Number(channelCountRow.count) === 0) {
      let defaultChannels: string[] = [];
      const envPath = path.resolve(process.cwd(), '.env.local');
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf-8');
        const match = envContent.match(/TELEGRAM_CHANNELS\s*=\s*([^\r\n]+)/);
        if (match && match[1]) {
          defaultChannels = match[1].split(',').map((c) => c.trim()).filter(Boolean);
        }
      }

      if (defaultChannels.length === 0) {
        defaultChannels = ['@promobitoficial', '@ofertaztelegram'];
      }

      const insertChannelStmt = db.prepare(
        'INSERT OR IGNORE INTO monitored_channels (id, username, title, is_active, created_at) VALUES (?, ?, ?, 1, ?)'
      );

      const now = Date.now();
      for (const ch of defaultChannels) {
        const formatted = formatChannelUsername(ch);
        if (formatted) {
          const id = `ch_${now}_${Math.random().toString(36).substring(2, 7)}`;
          insertChannelStmt.run(id, formatted, null, now);
        }
      }

      try {
        interface ChannelNameRow {
          channel_name: string;
        }
        const existingProductChannels = db.prepare('SELECT DISTINCT channel_name FROM products').all() as unknown as ChannelNameRow[];
        for (const row of existingProductChannels) {
          if (row.channel_name) {
            const formatted = formatChannelUsername(row.channel_name);
            if (formatted) {
              const id = `ch_${now}_${Math.random().toString(36).substring(2, 7)}`;
              insertChannelStmt.run(id, formatted, null, now);
            }
          }
        }
      } catch {}
    }
  } catch (err) {
    console.error('Erro na inicialização de monitored_channels:', err);
  }
}


export function repairBadProductTitles(database?: DatabaseSync): number {
  const db = database || getDatabase();
  try {
    interface ProductRepairRow {
      id: string;
      title: string;
      raw_text: string;
      coupon?: string | null;
      store: string;
      channel_name: string;
    }
    const rows = db.prepare('SELECT id, title, raw_text, coupon, store, channel_name FROM products').all() as unknown as ProductRepairRow[];
    if (!rows || rows.length === 0) return 0;

    let repaired = 0;
    const updateStmt = db.prepare('UPDATE products SET title = ?, normalized_text = ? WHERE id = ?');

    for (const row of rows) {
      const titleLower = (row.title || '').trim().toLowerCase();
      const hasCorruptedChar = (row.title || '').includes('\uFFFD') || /[\uD800-\uDFFF]/.test(row.title || '');
      const isBanner = isStoreBanner(row.title) || titleLower === 'amazon';
      const isShortUppercaseHook =
        row.title === row.title.toUpperCase() &&
        /[A-Z]/.test(row.title) &&
        row.title.length < 28;

      if (hasCorruptedChar || isBanner || isShortUppercaseHook) {
        const newTitle = extractProductTitle(row.raw_text);
        if (newTitle && newTitle !== row.title && !isStoreBanner(newTitle)) {
          const norm = normalizeText(`${newTitle} ${row.coupon || ''} ${row.store || ''} ${row.channel_name || ''}`);
          updateStmt.run(newTitle, norm, row.id);
          repaired++;
        }
      }
    }

    if (repaired > 0) {
      console.log(`[db] Repaired ${repaired} bad product titles.`);
    }
    return repaired;
  } catch (err) {
    console.error('Erro ao reparar títulos de produtos:', err);
    return 0;
  }
}

function mapRowToProduct(row: any): Product {
  return {
    id: row.id,
    telegramMessageId: row.telegram_message_id ?? undefined,
    channelName: row.channel_name,
    channelId: row.channel_id ?? undefined,
    title: row.title,
    price: Number(row.price),
    originalPrice: row.original_price != null ? Number(row.original_price) : null,
    discountPercent: row.discount_percent != null ? Number(row.discount_percent) : null,
    coupon: row.coupon ?? null,
    url: row.url,
    store: row.store,
    rawText: row.raw_text,
    imageUrl: row.image_url ?? null,
    createdAt: Number(row.created_at),
  };
}

export function saveProduct(product: Product): boolean {
  const db = getDatabase();
  const normalizedText = normalizeText(
    `${product.title} ${product.coupon || ''} ${product.store || ''} ${product.channelName || ''}`
  );

  const stmt = db.prepare(`
    INSERT INTO products (
      id, telegram_message_id, channel_name, channel_id,
      title, price, original_price, discount_percent, coupon,
      url, store, raw_text, image_url, normalized_text, created_at
    ) VALUES (
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?
    )
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      price = excluded.price,
      original_price = excluded.original_price,
      discount_percent = excluded.discount_percent,
      coupon = excluded.coupon,
      url = excluded.url,
      store = excluded.store,
      raw_text = excluded.raw_text,
      normalized_text = excluded.normalized_text;
  `);

  try {
    stmt.run(
      product.id,
      product.telegramMessageId ?? null,
      product.channelName,
      product.channelId ?? null,
      product.title,
      product.price,
      product.originalPrice ?? null,
      product.discountPercent ?? null,
      product.coupon ?? null,
      product.url,
      product.store,
      product.rawText,
      product.imageUrl ?? null,
      normalizedText,
      product.createdAt
    );
    return true;
  } catch (err) {
    console.error('Erro ao salvar produto no SQLite:', err);
    return false;
  }
}

export function hasProductByMessageId(channelName: string, messageId: number): boolean {
  try {
    const db = getDatabase();
    const row = db
      .prepare('SELECT 1 FROM products WHERE channel_name = ? AND telegram_message_id = ? LIMIT 1')
      .get(channelName, messageId);
    return Boolean(row);
  } catch {
    return false;
  }
}

export function getProducts(query: ProductFilterQuery = {}): {
  products: Product[];
  total: number;
} {
  const db = getDatabase();

  const conditions: string[] = [];
  const params: any[] = [];

  if (query.search && query.search.trim()) {
    const rawSearch = query.search.trim();
    const normSearch = normalizeText(rawSearch);
    conditions.push('(normalized_text LIKE ? OR title LIKE ?)');
    params.push(`%${normSearch}%`, `%${rawSearch}%`);
  }

  if (query.minPrice !== undefined && query.minPrice !== null && query.minPrice >= 0) {
    conditions.push('price >= ?');
    params.push(query.minPrice);
  }

  if (query.maxPrice !== undefined && query.maxPrice !== null && query.maxPrice > 0) {
    conditions.push('price <= ?');
    params.push(query.maxPrice);
  }

  if (query.store && query.store !== 'all') {
    conditions.push('store = ?');
    params.push(query.store);
  }

  if (query.channels && query.channels.length > 0) {
    const placeholders = query.channels.map(() => '?').join(',');
    conditions.push(`channel_name IN (${placeholders})`);
    params.push(...query.channels);
  } else if (query.channel && query.channel !== 'all') {
    conditions.push('channel_name = ?');
    params.push(query.channel);
  }

  if (query.hasCoupon) {
    conditions.push("coupon IS NOT NULL AND coupon != ''");
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countStmt = db.prepare(`SELECT COUNT(*) as count FROM products ${whereClause}`);
  const countResult: any = countStmt.get(...params);
  const total = countResult?.count ? Number(countResult.count) : 0;

  let orderByClause = 'ORDER BY created_at DESC';
  switch (query.sortBy) {
    case 'price_asc':
      conditions.push('price > 0');
      orderByClause = 'ORDER BY price ASC, created_at DESC';
      break;
    case 'price_desc':
      orderByClause = 'ORDER BY price DESC, created_at DESC';
      break;
    case 'discount_desc':
      orderByClause = 'ORDER BY discount_percent DESC NULLS LAST, price ASC';
      break;
    case 'date_asc':
      orderByClause = 'ORDER BY created_at ASC';
      break;
    case 'date_desc':
    default:
      orderByClause = 'ORDER BY created_at DESC';
      break;
  }

  const limit = Math.min(query.limit || 50, 100);
  const offset = query.offset || 0;

  const dataStmt = db.prepare(`
    SELECT * FROM products
    ${whereClause}
    ${orderByClause}
    LIMIT ? OFFSET ?
  `);

  const rows = dataStmt.all(...params, limit, offset);
  const products = rows.map(mapRowToProduct);

  return { products, total };
}

export function deleteProduct(id: string): boolean {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM products WHERE id = ?');
  stmt.run(id);
  return true;
}

export function clearAllProducts(): void {
  const db = getDatabase();
  db.exec('DELETE FROM products;');
}

export function saveCoupon(coupon: Coupon): boolean {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO coupons (
      id, code, store, title, discount_description, min_spend, channel_name, url, raw_text, created_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
    ON CONFLICT(code, store) DO UPDATE SET
      title = excluded.title,
      discount_description = COALESCE(excluded.discount_description, coupons.discount_description),
      min_spend = COALESCE(excluded.min_spend, coupons.min_spend),
      channel_name = excluded.channel_name,
      url = excluded.url,
      raw_text = excluded.raw_text,
      created_at = excluded.created_at;
  `);

  try {
    stmt.run(
      coupon.id,
      coupon.code,
      coupon.store,
      coupon.title,
      coupon.discountDescription ?? null,
      coupon.minSpend ?? null,
      coupon.channelName,
      coupon.url,
      coupon.rawText,
      coupon.createdAt
    );
    return true;
  } catch (err) {
    console.error('Erro ao salvar cupom no SQLite:', err);
    return false;
  }
}

export function getCoupons(query: CouponFilterQuery = {}): {
  coupons: Coupon[];
  total: number;
} {
  const db = getDatabase();
  const conditions: string[] = [];
  const params: any[] = [];

  if (query.search && query.search.trim()) {
    const s = query.search.trim();
    conditions.push('(code LIKE ? OR title LIKE ? OR store LIKE ?)');
    params.push(`%${s}%`, `%${s}%`, `%${s}%`);
  }

  if (query.store && query.store !== 'all') {
    conditions.push('store = ?');
    params.push(query.store);
  }

  if (query.channel && query.channel !== 'all') {
    conditions.push('channel_name = ?');
    params.push(query.channel);
  } else if (query.channels && query.channels.length > 0) {
    const placeholders = query.channels.map(() => '?').join(',');
    conditions.push(`channel_name IN (${placeholders})`);
    params.push(...query.channels);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countStmt = db.prepare(`SELECT COUNT(*) as count FROM coupons ${whereClause}`);
  const countRes: any = countStmt.get(...params);
  const total = Number(countRes?.count || 0);

  const limit = Math.max(1, Math.min(query.limit || 50, 100));
  const offset = Math.max(0, query.offset || 0);

  const selectStmt = db.prepare(`
    SELECT * FROM coupons
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `);

  const rows = selectStmt.all(...params, limit, offset) as any[];

  const coupons: Coupon[] = rows.map((r) => ({
    id: r.id,
    code: r.code,
    store: r.store,
    title: r.title,
    discountDescription: r.discount_description ?? null,
    minSpend: r.min_spend != null ? Number(r.min_spend) : null,
    channelName: r.channel_name,
    url: r.url,
    rawText: r.raw_text,
    createdAt: Number(r.created_at),
  }));

  return { coupons, total };
}

export function deleteCoupon(id: string): boolean {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM coupons WHERE id = ?');
  stmt.run(id);
  return true;
}

export function getStats() {
  const db = getDatabase();
  const totalStmt = db.prepare('SELECT COUNT(*) as count FROM products');
  const totalRes: any = totalStmt.get();
  const total = Number(totalRes?.count || 0);

  const couponStmt = db.prepare('SELECT COUNT(*) as count FROM coupons');
  const couponRes: any = couponStmt.get();
  const withCouponCount = Number(couponRes?.count || 0);

  const productsCount = total;
  const avgPriceStmt = db.prepare('SELECT AVG(price) as avgPrice FROM products WHERE price > 0');
  const avgPriceRes: any = avgPriceStmt.get();
  const avgPrice = avgPriceRes?.avgPrice ? Number(Number(avgPriceRes.avgPrice).toFixed(2)) : 0;

  const maxPriceStmt = db.prepare('SELECT MAX(price) as maxPrice FROM products');
  const maxPriceRes: any = maxPriceStmt.get();
  const maxPrice = Math.ceil(Number(maxPriceRes?.maxPrice || 10000));

  const discountStmt = db.prepare('SELECT AVG(discount_percent) as avgDiscount FROM products WHERE discount_percent > 0');
  const discountRes: any = discountStmt.get();
  const avgDiscount = discountRes?.avgDiscount ? Math.round(Number(discountRes.avgDiscount)) : 0;

  const storesStmt = db.prepare(`
    SELECT store, COUNT(*) as count
    FROM products
    GROUP BY store
    ORDER BY count DESC
    LIMIT 8
  `);
  const stores = (storesStmt.all() as any[]).map(row => ({
    store: String(row.store),
    count: Number(row.count),
  }));

  const productChannelsStmt = db.prepare(`
    SELECT channel_name, COUNT(*) as count
    FROM products
    GROUP BY channel_name
    ORDER BY count DESC
  `);
  interface ChannelNameCountRow {
    channel_name: string;
    count: number;
  }
  const productChannels = (productChannelsStmt.all() as unknown as ChannelNameCountRow[]).map(row => ({
    channel: String(row.channel_name),
    count: Number(row.count),
  }));

  const monitored = getMonitoredChannels(true);
  const channelMap = new Map<string, number>();

  for (const m of monitored) {
    channelMap.set(m.username, 0);
  }
  for (const pc of productChannels) {
    channelMap.set(pc.channel, pc.count);
  }

  const channels = Array.from(channelMap.entries())
    .map(([channel, count]) => ({
      channel,
      count,
    }))
    .sort((a, b) => b.count - a.count);
  return {
    total,
    productsCount,
    withCouponCount,
    avgDiscount,
    avgPrice,
    maxPrice,
    stores,
    channels,
  };
}

interface MonitoredChannelRow {
  id: string;
  username: string;
  title: string | null;
  is_active: number;
  created_at: number;
  product_count?: number;
}

export function getMonitoredChannels(activeOnly = false): MonitoredChannel[] {
  const db = getDatabase();
  try {
    const query = activeOnly
      ? `
        SELECT 
          mc.id, 
          mc.username, 
          mc.title, 
          mc.is_active, 
          mc.created_at,
          (SELECT COUNT(*) FROM products p WHERE LOWER(p.channel_name) = LOWER(mc.username)) as product_count
        FROM monitored_channels mc
        WHERE mc.is_active = 1
        ORDER BY mc.created_at ASC
      `
      : `
        SELECT 
          mc.id, 
          mc.username, 
          mc.title, 
          mc.is_active, 
          mc.created_at,
          (SELECT COUNT(*) FROM products p WHERE LOWER(p.channel_name) = LOWER(mc.username)) as product_count
        FROM monitored_channels mc
        ORDER BY mc.is_active DESC, mc.created_at ASC
      `;
    const rows = db.prepare(query).all() as unknown as MonitoredChannelRow[];
    return rows.map((r) => ({
      id: String(r.id),
      username: String(r.username),
      title: r.title ? String(r.title) : undefined,
      isActive: Boolean(r.is_active),
      createdAt: Number(r.created_at),
      productCount: Number(r.product_count || 0),
    }));
  } catch (err) {
    console.error('Erro ao buscar canais monitorados:', err);
    return [];
  }
}

export function addMonitoredChannel(
  rawChannel: string,
  title?: string
): { success: boolean; channel?: MonitoredChannel; error?: string } {
  const username = formatChannelUsername(rawChannel);
  if (!username || username === '@') {
    return { success: false, error: 'Nome de canal inválido. Use o formato @nome_do_canal ou selecione um canal da lista.' };
  }
  const isValidTelegramUsername = /^@[a-zA-Z0-9_]{3,32}$/.test(username) || /^-?\d{5,25}$/.test(username);
  if (!isValidTelegramUsername) {
    return {
      success: false,
      error: 'O nome do canal deve ter entre 3 e 32 caracteres alfanuméricos ou ser um ID numérico válido do Telegram.',
    };
  }

  const db = getDatabase();
  try {
    interface ExistingRow {
      id: string;
      username: string;
      is_active: number;
    }
    const existing = db
      .prepare('SELECT id, username, is_active FROM monitored_channels WHERE LOWER(username) = LOWER(?) LIMIT 1')
      .get(username) as unknown as ExistingRow | undefined;

    const now = Date.now();
    if (existing) {
      if (!existing.is_active) {
        db.prepare('UPDATE monitored_channels SET is_active = 1 WHERE id = ?').run(existing.id);
        return {
          success: true,
          channel: {
            id: existing.id,
            username: existing.username,
            title: title || undefined,
            isActive: true,
            createdAt: now,
            productCount: 0,
          },
        };
      }
      return { success: false, error: `O canal ${username} já está na sua lista de monitoramento.` };
    }

    const id = `ch_${now}_${Math.random().toString(36).substring(2, 7)}`;
    db.prepare(
      'INSERT INTO monitored_channels (id, username, title, is_active, created_at) VALUES (?, ?, ?, 1, ?)'
    ).run(id, username, title || null, now);

    return {
      success: true,
      channel: {
        id,
        username,
        title: title || undefined,
        isActive: true,
        createdAt: now,
        productCount: 0,
      },
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Erro ao salvar canal no banco';
    return { success: false, error: errorMsg };
  }
}

interface StatementRunResult {
  changes: number;
  lastInsertRowid: number | bigint;
}

function hasChanges(result: unknown): boolean {
  if (result && typeof result === 'object' && 'changes' in result) {
    const changes = result.changes;
    return typeof changes === 'number' && changes > 0;
  }
  return false;
}

export function removeMonitoredChannel(rawChannel: string): boolean {
  const username = formatChannelUsername(rawChannel);
  if (!username) return false;
  const db = getDatabase();
  try {
    const res = db
      .prepare('DELETE FROM monitored_channels WHERE LOWER(username) = LOWER(?)')
      .run(username);
    return hasChanges(res);
  } catch (err) {
    console.error('Erro ao remover canal:', err);
    return false;
  }
}

export function toggleMonitoredChannel(rawChannel: string, isActive: boolean): boolean {
  const username = formatChannelUsername(rawChannel);
  if (!username) return false;
  const db = getDatabase();
  try {
    const res = db
      .prepare('UPDATE monitored_channels SET is_active = ? WHERE LOWER(username) = LOWER(?)')
      .run(isActive ? 1 : 0, username);
    return hasChanges(res);
  } catch (err) {
    console.error('Erro ao alternar status do canal:', err);
    return false;
  }
}
