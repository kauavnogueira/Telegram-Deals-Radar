import { NextRequest, NextResponse } from 'next/server';
import { TelegramClient } from 'teleproto';
import { StringSession } from 'teleproto/sessions';
import fs from 'node:fs';
import path from 'node:path';
import { getMonitoredChannels } from '@/lib/db';
import { TelegramAccountChannel } from '@/lib/types';

export async function GET(_req: NextRequest) {
  let client: TelegramClient | null = null;
  try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf-8');
    }

    const getEnvVar = (key: string, defaultValue = ''): string => {
      const match = envContent.match(new RegExp(`${key}\\s*=\\s*([^\\r\\n]+)`));
      return match ? match[1].trim() : (process.env[key] || defaultValue);
    };

    const apiIdRaw = getEnvVar('TELEGRAM_API_ID');
    const apiId = apiIdRaw ? parseInt(apiIdRaw, 10) : 0;
    const apiHash = getEnvVar('TELEGRAM_API_HASH');
    const sessionString = getEnvVar('TELEGRAM_STRING_SESSION');

    if (!sessionString) {
      return NextResponse.json(
        {
          error:
            'Nenhuma sessão do Telegram configurada. Por favor, realize o login primeiro no terminal ("npm run login").',
        },
        { status: 401 }
      );
    }

    if (!apiId || !apiHash) {
      return NextResponse.json(
        {
          error:
            'Credenciais TELEGRAM_API_ID ou TELEGRAM_API_HASH não configuradas no .env.local. Rode "npm run setup".',
        },
        { status: 400 }
      );
    }

    client = new TelegramClient(new StringSession(sessionString), apiId, apiHash, {
      connectionRetries: 3,
    });

    await client.connect();

    if (!(await client.checkAuthorization())) {
      return NextResponse.json(
        { error: 'Sessão do Telegram expirada ou inválida. Rode "npm run login" no terminal.' },
        { status: 401 }
      );
    }

    const dialogs = await client.getDialogs({});
    const monitored = getMonitoredChannels(false);
    const monitoredSet = new Set(
      monitored.flatMap((m) => [
        m.username.toLowerCase(),
        m.username.toLowerCase().replace(/^@/, ''),
      ])
    );

    const channels: TelegramAccountChannel[] = [];

    for (const d of dialogs) {
      if (!d.isChannel && !d.isGroup) continue;

      const rawUsername =
        d.entity && 'username' in d.entity && typeof d.entity.username === 'string' && d.entity.username
          ? d.entity.username
          : null;
      const username = rawUsername ? `@${rawUsername}` : null;
      const id = d.id ? d.id.toString() : '';
      const title = d.title || d.name || username || id || 'Canal sem nome';
      const identifier = username || id;

      const isMonitored =
        monitoredSet.has(identifier.toLowerCase()) ||
        monitoredSet.has(identifier.toLowerCase().replace(/^@/, '')) ||
        (username ? monitoredSet.has(username.toLowerCase()) : false) ||
        (id ? monitoredSet.has(id.toLowerCase()) : false);

      channels.push({
        id,
        title,
        username,
        identifier,
        isChannel: Boolean(d.isChannel),
        isGroup: Boolean(d.isGroup),
        isMonitored,
      });
    }

    // Sort alphabetically by title
    channels.sort((a, b) => a.title.localeCompare(b.title, 'pt-BR', { sensitivity: 'base' }));

    return NextResponse.json({ channels });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao buscar canais do Telegram';
    console.error('[api/channels/telegram] Erro:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    if (client) {
      try {
        await client.disconnect();
      } catch {}
    }
  }
}
