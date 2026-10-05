import fs from 'node:fs';
import path from 'node:path';
import { Product } from './types';

let cachedEnv: Record<string, string> | null = null;

function getEnvValue(key: string, defaultValue = ''): string {
  if (process.env[key]) {
    return process.env[key]!;
  }

  if (!cachedEnv) {
    cachedEnv = {};
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      const lines = content.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx > 0) {
          const k = trimmed.substring(0, eqIdx).trim();
          const v = trimmed.substring(eqIdx + 1).trim();
          cachedEnv[k] = v;
        }
      }
    }
  }

  return cachedEnv[key] || defaultValue;
}

export function getNotifierConfig() {
  const botToken = getEnvValue('TELEGRAM_BOT_TOKEN', '');
  const chatId = getEnvValue('TELEGRAM_USER_CHAT_ID', '');
  const enabledStr = getEnvValue('TELEGRAM_NOTIFY_ENABLED', 'true');
  const minDiscountStr = getEnvValue('TELEGRAM_NOTIFY_MIN_DISCOUNT', '0');
  const keywordsStr = getEnvValue('TELEGRAM_NOTIFY_KEYWORDS', '');

  const minDiscount = parseInt(minDiscountStr, 10) || 0;
  const keywords = keywordsStr
    .split(',')
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean);

  const enabled = (enabledStr === 'true' || enabledStr === '1') && Boolean(botToken && chatId);

  return {
    botToken,
    chatId,
    enabled,
    minDiscount,
    keywords,
  };
}

const sentProductIds = new Set<string>();

export function shouldNotifyProduct(product: Product): { shouldNotify: boolean; reason?: string } {
  const config = getNotifierConfig();

  if (!config.enabled) {
    return { shouldNotify: false, reason: 'Notificações desativadas ou bot_token/chat_id não configurados' };
  }

  if (sentProductIds.has(product.id)) {
    return { shouldNotify: false, reason: 'Produto já notificado recentemente' };
  }

  if (config.keywords.length > 0) {
    const titleLower = product.title.toLowerCase();
    const matched = config.keywords.some((kw) => titleLower.includes(kw));
    if (!matched) {
      return { shouldNotify: false, reason: `Título não contém palavras-chave monitoradas: [${config.keywords.join(', ')}]` };
    }
  }

  if (config.minDiscount > 0) {
    const discount = product.discountPercent || 0;
    if (discount < config.minDiscount) {
      return {
        shouldNotify: false,
        reason: `Desconto (${discount}%) menor que o mínimo configurado (${config.minDiscount}%)`,
      };
    }
  }

  return { shouldNotify: true };
}

export function formatProductMessage(product: Product): { text: string; inlineUrl?: string } {
  const title = escapeHtml(product.title);
  const store = escapeHtml(product.store);
  const channel = escapeHtml(product.channelName);
  const priceFormatted = product.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  let priceLine = `💰 <b>Preço:</b> ${priceFormatted}`;
  if (product.originalPrice && product.originalPrice > product.price) {
    const origFormatted = product.originalPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const discountTag = product.discountPercent ? ` (-${product.discountPercent}%)` : '';
    priceLine += `\n<s>De: ${origFormatted}</s>${discountTag}`;
  }

  let couponLine = '';
  if (product.coupon) {
    couponLine = `\n🎟️ <b>Cupom:</b> <code>${escapeHtml(product.coupon)}</code>`;
  }

  let urlLine = '';
  let inlineUrl: string | undefined = undefined;
  if (product.url && /^https?:\/\//i.test(product.url)) {
    inlineUrl = product.url;
    urlLine = `\n\n🔗 <a href="${escapeHtml(product.url)}">Clique aqui para abrir na loja</a>`;
  }

  const text = `🔥 <b>NOVA OFERTA ENCONTRADA!</b>\n\n` +
    `📦 <b>${title}</b>\n\n` +
    `${priceLine}\n` +
    `🏪 <b>Loja:</b> ${store}` +
    `${couponLine}\n` +
    `📢 <b>Canal:</b> ${channel}` +
    `${urlLine}`;

  return { text, inlineUrl };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export async function sendTelegramNotification(product: Product): Promise<{ success: boolean; error?: string }> {
  const config = getNotifierConfig();

  if (!config.botToken || !config.chatId) {
    return { success: false, error: 'TELEGRAM_BOT_TOKEN ou TELEGRAM_USER_CHAT_ID não definidos' };
  }

  const { text, inlineUrl } = formatProductMessage(product);

  interface TelegramPayload {
    chat_id: string;
    text: string;
    parse_mode: 'HTML';
    disable_web_page_preview: boolean;
    reply_markup?: {
      inline_keyboard: Array<Array<{ text: string; url: string }>>;
    };
  }

  const payload: TelegramPayload = {
    chat_id: config.chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: false,
  };

  if (inlineUrl) {
    payload.reply_markup = {
      inline_keyboard: [
        [
          {
            text: `🛒 Comprar na ${product.store || 'Loja'}`,
            url: inlineUrl,
          },
        ],
      ],
    };
  }

  try {
    const url = `https://api.telegram.org/bot${config.botToken}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as { ok?: boolean; description?: string };

    if (!response.ok || !data.ok) {
      const err = data.description || `HTTP ${response.status}`;
      return { success: false, error: err };
    }

    sentProductIds.add(product.id);
    if (sentProductIds.size > 2000) {
      const firstItems = Array.from(sentProductIds).slice(0, 500);
      for (const id of firstItems) {
        sentProductIds.delete(id);
      }
    }

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}

export async function sendTelegramCustomMessage(message: string): Promise<{ success: boolean; error?: string }> {
  const config = getNotifierConfig();

  if (!config.botToken || !config.chatId) {
    return { success: false, error: 'TELEGRAM_BOT_TOKEN ou TELEGRAM_USER_CHAT_ID não definidos' };
  }

  try {
    const url = `https://api.telegram.org/bot${config.botToken}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: config.chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });

    const data = (await response.json()) as { ok?: boolean; description?: string };

    if (!response.ok || !data.ok) {
      return { success: false, error: data.description || `HTTP ${response.status}` };
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}
