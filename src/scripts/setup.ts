import { TelegramClient } from 'teleproto';
import { StringSession } from 'teleproto/sessions';
import input from 'input';
import fs from 'node:fs';
import path from 'node:path';
import { addMonitoredChannel, formatChannelUsername } from '../lib/db';

const envPath = path.resolve(process.cwd(), '.env.local');

function readEnvFile(): string {
  if (fs.existsSync(envPath)) {
    return fs.readFileSync(envPath, 'utf-8');
  }
  return '';
}

function updateEnvVariable(content: string, key: string, value: string): string {
  const regex = new RegExp(`^${key}=.*$`, 'm');
  if (regex.test(content)) {
    return content.replace(regex, `${key}=${value}`);
  }
  const separator = content.endsWith('\n') || content.length === 0 ? '' : '\n';
  return `${content}${separator}${key}=${value}\n`;
}

function getEnvValue(content: string, key: string): string {
  const match = content.match(new RegExp(`^${key}\\s*=\\s*([^\\r\\n]+)`, 'm'));
  return match ? match[1].trim() : '';
}

async function main() {
  console.log('\n[setup] Telegram Deals Radar');
  console.log('API ID and API HASH can be generated at: https://my.telegram.org (API development tools)\n');

  let envContent = readEnvFile();
  const existingApiId = getEnvValue(envContent, 'TELEGRAM_API_ID');
  const existingApiHash = getEnvValue(envContent, 'TELEGRAM_API_HASH');
  const existingSession = getEnvValue(envContent, 'TELEGRAM_STRING_SESSION');

  if (existingApiId && existingApiHash && existingSession) {
    console.log('Existing credentials detected in .env.local.');
    const reconfigure = await input.confirm('Reconfigure credentials?', { default: false });
    if (!reconfigure) {
      console.log('Configuration kept. Run: npm run dev\n');
      process.exit(0);
    }
  }

  let apiId = 0;
  while (!apiId) {
    const rawApiId = await input.text('Telegram API ID:', {
      default: existingApiId || '',
    });
    const parsed = parseInt(rawApiId.trim(), 10);
    if (!isNaN(parsed) && parsed > 0) {
      apiId = parsed;
    } else {
      console.log('Invalid API ID (numeric value required).\n');
    }
  }

  let apiHash = '';
  while (!apiHash) {
    const rawApiHash = await input.text('Telegram API HASH:', {
      default: existingApiHash || '',
    });
    const cleaned = rawApiHash.trim();
    if (cleaned.length >= 10) {
      apiHash = cleaned;
    } else {
      console.log('Invalid API HASH.\n');
    }
  }

  const rawChannels = await input.text('Channels to monitor (comma-separated):', {
    default: '@promobitoficial, @ofertaztelegram',
  });

  const initialChannels = rawChannels
    .split(',')
    .map((c) => formatChannelUsername(c.trim()))
    .filter(Boolean);

  console.log(`Configured channels: ${initialChannels.join(', ')}\n`);

  envContent = updateEnvVariable(envContent, 'TELEGRAM_API_ID', String(apiId));
  envContent = updateEnvVariable(envContent, 'TELEGRAM_API_HASH', apiHash);
  envContent = updateEnvVariable(envContent, 'TELEGRAM_CHANNELS', initialChannels.join(','));
  fs.writeFileSync(envPath, envContent, 'utf-8');

  try {
    for (const ch of initialChannels) {
      addMonitoredChannel(ch);
    }
  } catch {}

  console.log('Authenticating Telegram session...\n');

  const stringSession = new StringSession('');
  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.start({
    phoneNumber: async () => input.text('Phone number with country code (e.g. +5511999998888): '),
    password: async () => input.text('Two-step verification password (if enabled): '),
    phoneCode: async () => input.text('Telegram confirmation code: '),
    onError: (err: unknown) => {
      console.error('Login error:', err);
    },
  });

  const me = (await client.getMe()) as { firstName?: string; username?: string; phone?: string };
  const displayName = me.firstName || 'Usuário';
  const handle = me.username ? `@${me.username}` : me.phone || '';

  console.log(`Connected as: ${displayName} (${handle})`);

  const savedSession = client.session.save() as unknown as string;
  envContent = updateEnvVariable(envContent, 'TELEGRAM_STRING_SESSION', savedSession);
  fs.writeFileSync(envPath, envContent, 'utf-8');

  await client.disconnect();

  console.log('\nSetup complete. Run: npm run dev\n');
  process.exit(0);
}

main().catch((err: unknown) => {
  console.error('\nSetup error:', err);
  process.exit(1);
});
