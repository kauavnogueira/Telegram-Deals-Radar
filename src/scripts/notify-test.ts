import { getNotifierConfig, sendTelegramNotification } from '../lib/notifier';
import { Product } from '../lib/types';

async function main() {
  console.log('--- Teste de Notificação Telegram Privado ---');
  const config = getNotifierConfig();

  console.log(`Bot Token: ${config.botToken ? config.botToken.substring(0, 10) + '...' : '[NÃO CONFIGURADO]'}`);
  console.log(`Chat ID:   ${config.chatId || '[NÃO CONFIGURADO]'}`);
  console.log(`Status:    ${config.enabled ? 'Ativado' : 'Desativado'}`);
  console.log(`Mínimo %:  ${config.minDiscount}%`);
  console.log(`Filtros:   ${config.keywords.length > 0 ? config.keywords.join(', ') : 'Todos os produtos'}`);

  if (!config.botToken || !config.chatId) {
    console.log('\n❌ Para testar, preencha as seguintes variáveis no seu arquivo .env.local:');
    console.log('   TELEGRAM_BOT_TOKEN=seu_token_do_botfather');
    console.log('   TELEGRAM_USER_CHAT_ID=seu_chat_id_pessoal\n');
    console.log('Como obter:');
    console.log('1. Crie um bot no Telegram falando com @BotFather e copie o token.');
    console.log('2. Inicie uma conversa com seu novo bot (/start).');
    console.log('3. Descubra seu ID pessoal enviando /start para o bot @userinfobot.');
    process.exit(1);
  }

  console.log('\nEnviando mensagem de teste de oferta...');
  const sampleProduct: Product = {
    id: `test_${Date.now()}`,
    title: 'Smart TV 55" 4K UHD Samsung Crystal',
    price: 2199.00,
    originalPrice: 2899.00,
    discountPercent: 24,
    coupon: 'DESCONTO100',
    store: 'Amazon',
    url: 'https://www.amazon.com.br',
    channelName: '@canal_de_ofertas',
    rawText: 'Smart TV 55 4K\nDe R$ 2.899 por R$ 2.199\nCupom: DESCONTO100',
    createdAt: Date.now(),
  };

  const result = await sendTelegramNotification(sampleProduct);
  if (result.success) {
    console.log('✅ Notificação de teste enviada com sucesso para o seu privado!');
  } else {
    console.error('❌ Falha ao enviar notificação:', result.error);
    console.log('\nVerifique se você clicou em "Iniciar" (/start) na conversa privada com o seu bot!');
  }
}

main().catch(console.error);
