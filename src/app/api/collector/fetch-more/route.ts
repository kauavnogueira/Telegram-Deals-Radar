import { NextRequest, NextResponse } from 'next/server';
import { TelegramClient } from 'teleproto';
import { StringSession } from 'teleproto/sessions';
import fs from 'node:fs';
import path from 'node:path';
import { parseTelegramMessage, parseTelegramCoupon } from '@/lib/parser';
import { saveProduct, saveCoupon, getMonitoredChannels } from '@/lib/db';
export async function POST(req: NextRequest) {
  try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf-8');
    }

    const sessionMatch = envContent.match(/TELEGRAM_STRING_SESSION\s*=\s*([^\r\n]+)/);
    const sessionString = sessionMatch ? sessionMatch[1].trim() : '';

    if (!sessionString) {
      return NextResponse.json(
        {
          error:
            'Nenhuma sessão do Telegram configurada. Por favor, rode "npm run login" no terminal primeiro.',
        },
        { status: 401 }
      );
    }

    const apiIdMatch = envContent.match(/TELEGRAM_API_ID\s*=\s*(\d+)/);
    const apiHashMatch = envContent.match(/TELEGRAM_API_HASH\s*=\s*([a-f0-9]+)/i);
    const channelsMatch = envContent.match(/TELEGRAM_CHANNELS\s*=\s*([^\r\n]+)/);

    const apiId = apiIdMatch ? parseInt(apiIdMatch[1], 10) : 0;
    const apiHash = apiHashMatch ? apiHashMatch[1].trim() : '';
    const channelsRaw = channelsMatch ? channelsMatch[1].trim() : '';
    const dbChannels = getMonitoredChannels(true).map((c) => c.username);
    const channels = dbChannels.length > 0 ? dbChannels : channelsRaw.split(',').map((c) => c.trim()).filter(Boolean);
    if (!apiId || !apiHash) {
      return NextResponse.json(
        {
          error:
            'Credenciais TELEGRAM_API_ID ou TELEGRAM_API_HASH não configuradas no .env.local. Rode "npm run setup".',
        },
        { status: 401 }
      );
    }
    const body = await req.json().catch(() => ({}));
    const limit = Math.min(body.limit || 15, 30);
    const targetChannel = body.channel;

    const client = new TelegramClient(new StringSession(sessionString), apiId, apiHash, {
      connectionRetries: 3,
    });

    await client.connect();

    const imagesDir = path.resolve(process.cwd(), 'public', 'images', 'products');
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }

    let totalCollected = 0;
    const channelsToScan = targetChannel && targetChannel !== 'all' ? [targetChannel] : channels;
    const SEVEN_DAYS_AGO_SEC = Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000);

    for (const ch of channelsToScan) {
      try {
        const entity = await client.getEntity(ch);
        const messages = await client.getMessages(entity, { limit });

        for (const msg of messages) {
          if (!msg.message) continue;

          if (msg.date && msg.date < SEVEN_DAYS_AGO_SEC) {
            break;
          }

          const coupon = parseTelegramCoupon(msg.message, {
            channelName: ch,
            messageId: msg.id,
            createdAt: msg.date ? msg.date * 1000 : Date.now(),
          });
          if (coupon) {
            saveCoupon(coupon);
          }

          const product = parseTelegramMessage(msg.message, {
            channelName: ch,
            messageId: msg.id,
          });

          if (product) {
            if (msg.media) {
              try {
                const filename = `prod_${msg.id}_${Date.now()}.jpg`;
                const fullPath = path.join(imagesDir, filename);
                await client.downloadMedia(msg.media, { outputFile: fullPath });
                if (fs.existsSync(fullPath)) {
                  product.imageUrl = `/images/products/${filename}`;
                }
              } catch (e) {
              }
            }

            if (msg.date) {
              product.createdAt = msg.date * 1000;
            }

            saveProduct(product);
            totalCollected++;
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Falha na leitura do canal';
        console.warn(`[fetch-more] Failed to read ${ch}: ${msg}`);
      }
    }

    await client.disconnect();

    return NextResponse.json({
      success: true,
      newOffersCount: totalCollected,
      scannedChannels: channelsToScan.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno no coletor';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
