import { TelegramClient } from 'teleproto';
import { StringSession } from 'teleproto/sessions';
import input from 'input';
import fs from 'node:fs';
import path from 'node:path';

const envPath = path.resolve(process.cwd(), '.env.local');
let envContent = '';
if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf-8');
}

const apiIdMatch = envContent.match(/TELEGRAM_API_ID\s*=\s*(\d+)/);
const apiHashMatch = envContent.match(/TELEGRAM_API_HASH\s*=\s*([a-f0-9]+)/i);

const apiId = apiIdMatch ? parseInt(apiIdMatch[1], 10) : 0;
const apiHash = apiHashMatch ? apiHashMatch[1].trim() : '';

if (!apiId || !apiHash) {
  console.error('[login] TELEGRAM_API_ID or TELEGRAM_API_HASH missing in .env.local.');
  console.error('Run: npm run setup\n');
  process.exit(1);
}
console.log(`[login] API_ID: ${apiId}`);

async function run() {
  const stringSession = new StringSession('');
  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.start({
    phoneNumber: async () => input.text('Phone number with country code (e.g. +5511999998888): '),
    password: async () => input.text('Two-step verification password (if enabled): '),
    phoneCode: async () => input.text('Telegram confirmation code: '),
    onError: (err: unknown) => {
      console.error('[login] Error:', err);
    },
  });

  const me = (await client.getMe()) as { firstName?: string; username?: string; phone?: string };
  console.log(`Connected as: ${me.firstName || ''} (${me.username ? '@' + me.username : me.phone || ''})`);

  const savedSession = client.session.save() as unknown as string;

  if (envContent.includes('TELEGRAM_STRING_SESSION=')) {
    envContent = envContent.replace(
      /TELEGRAM_STRING_SESSION=.*(?:\r?\n|$)/,
      `TELEGRAM_STRING_SESSION=${savedSession}\n`
    );
  } else {
    envContent += `\nTELEGRAM_STRING_SESSION=${savedSession}\n`;
  }

  fs.writeFileSync(envPath, envContent, 'utf-8');
  console.log('Session saved to .env.local.\n');
  await client.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error('[login] Fatal error:', err);
  process.exit(1);
});
