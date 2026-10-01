import { TelegramClient } from 'teleproto';
import { StringSession } from 'teleproto/sessions';
import { NewMessage } from 'teleproto/events';
import fs from 'node:fs';
import path from 'node:path';
import { parseTelegramMessage, parseTelegramCoupon } from '../lib/parser';
import { saveProduct, hasProductByMessageId, saveCoupon, getMonitoredChannels } from '../lib/db';
const envPath = path.resolve(process.cwd(), '.env.local');
let envContent = '';
if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf-8');
}

function getEnvVar(key: string, defaultValue = ''): string {
  const match = envContent.match(new RegExp(`${key}\\s*=\\s*([^\\r\\n]+)`));
  return match ? match[1].trim() : defaultValue;
}

const apiIdRaw = getEnvVar('TELEGRAM_API_ID', '');
const apiId = apiIdRaw ? parseInt(apiIdRaw, 10) : 0;
const apiHash = getEnvVar('TELEGRAM_API_HASH', '');
const sessionString = getEnvVar('TELEGRAM_STRING_SESSION', '');
const channelsRaw = getEnvVar('TELEGRAM_CHANNELS', '');

function getActiveChannels(): string[] {
  try {
    const dbChannels = getMonitoredChannels(true).map((c) => c.username);
    if (dbChannels.length > 0) return dbChannels;
  } catch {}
  return channelsRaw.split(',').map((c) => c.trim()).filter(Boolean);
}

const initialChannels = getActiveChannels();
if (!apiId || !apiHash || !sessionString) {
  console.error('[collector] Missing Telegram credentials in .env.local. Run "npm run setup".');
  process.exit(1);
}
console.log(`[collector] Monitoring: ${initialChannels.join(', ')}`);

async function main() {
  const stringSession = new StringSession(sessionString);
  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 10,
  });

  await client.connect();

  if (!(await client.checkAuthorization())) {
    console.error('[collector] Session expired or invalid. Run "npm run login".');
    process.exit(1);
  }

  const me = (await client.getMe()) as { firstName?: string };
  console.log(`[collector] Connected as ${me.firstName || 'Telegram User'}`);
  const imagesDir = path.resolve(process.cwd(), 'public', 'images', 'products');
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }

  async function downloadProductImage(msg: { id?: number; media?: unknown }): Promise<string | null> {
    if (!msg.media) return null;
    try {
      const filename = `prod_${msg.id}_${Date.now()}.jpg`;
      const fullPath = path.join(imagesDir, filename);
      await client.downloadMedia(msg.media as unknown as Parameters<typeof client.downloadMedia>[0], { outputFile: fullPath });
      if (fs.existsSync(fullPath)) {
        return `/images/products/${filename}`;
      }
    } catch {
    }
    return null;
  }

  const SEVEN_DAYS_AGO_SEC = Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000);
  console.log('[collector] Fetching 7-day history...');
  const currentChannels = getActiveChannels();
  for (const channel of currentChannels) {
    try {
      console.log(`[collector] Syncing ${channel}`);
      const entity = await client.getEntity(channel);
      const messages = await client.getMessages(entity, { limit: 80 });
      let collectedInChannel = 0;
      for (const msg of messages) {
        if (!msg.message) continue;

        if (msg.id && hasProductByMessageId(channel, msg.id)) {
          continue;
        }

        if (msg.date && msg.date < SEVEN_DAYS_AGO_SEC) {
          break;
        }
        const coupon = parseTelegramCoupon(msg.message, {
          channelName: channel,
          messageId: msg.id,
          createdAt: msg.date ? msg.date * 1000 : Date.now(),
        });
        if (coupon) {
          saveCoupon(coupon);
        }

        const product = parseTelegramMessage(msg.message, {
          channelName: channel,
          messageId: msg.id,
        });

        if (product) {
          const imgUrl = await downloadProductImage(msg);
          if (imgUrl) {
            product.imageUrl = imgUrl;
          }

          if (msg.date) {
            product.createdAt = msg.date * 1000;
          }

          saveProduct(product);
          collectedInChannel++;
        }
      }
      console.log(`[collector] Fetched ${collectedInChannel} offers from ${channel}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`[collector] Failed to fetch history for ${channel}: ${message}`);
    }
  }

  console.log('[collector] Listening for incoming messages...');
  client.addEventHandler(async (event: unknown) => {
    try {
      const ev = event as { message?: { message?: string; id?: number; date?: number; media?: unknown; getChat?: () => Promise<unknown> } };
      const message = ev.message;
      if (!message || !message.message) return;

      const chat = message.getChat ? ((await message.getChat()) as { username?: string; title?: string } | undefined) : undefined;
      const channelUsername = chat?.username ? `@${chat.username}` : chat?.title || 'Canal Desconhecido';
      const cleanChannelUsername = (chat?.username || '').toLowerCase().replace('@', '');
      const cleanChatTitle = (chat?.title || '').toLowerCase();

      const activeChannels = getActiveChannels();
      const isMonitored = activeChannels.some((c) => {
        const cleanC = c.toLowerCase().replace('@', '');
        return cleanC === cleanChannelUsername || cleanChatTitle.includes(cleanC);
      });
      const coupon = parseTelegramCoupon(message.message, {
        channelName: channelUsername,
        messageId: message.id,
        createdAt: message.date ? message.date * 1000 : Date.now(),
      });
      if (coupon) {
        saveCoupon(coupon);
        console.log(`[cupom] ${coupon.code} (${coupon.store})`);
      }

      const product = parseTelegramMessage(message.message, {
        channelName: channelUsername,
        messageId: message.id,
      });
      if (product) {
        const imgUrl = await downloadProductImage(message);
        if (imgUrl) {
          product.imageUrl = imgUrl;
        }

        saveProduct(product);
        console.log(`[oferta] ${product.title} - R$ ${product.price.toFixed(2)} (${channelUsername})`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[collector] Message handler error:', message);
    }
  }, new NewMessage({}));
}

main().catch((err) => {
  console.error('[collector] Error:', err);
});
