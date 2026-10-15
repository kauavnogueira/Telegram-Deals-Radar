import { startBotListener, stopBotListener } from '../lib/bot-service';

async function main() {
  console.log('--- Radam Ofertas Telegram Bot Listener ---');
  console.log('Aguardando comandos (/start, /filtro, /desconto, /status, /ajuda)...');

  await startBotListener();

  const shutdown = () => {
    console.log('\nEncerrando bot listener...');
    stopBotListener();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('[bot] Erro fatal:', err);
  process.exit(1);
});
