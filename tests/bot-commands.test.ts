import test from 'node:test';
import assert from 'node:assert/strict';
import { handleBotCommand } from '../src/lib/bot-service';
import { getSubscriber } from '../src/lib/db';
import { matchProductWithFilter } from '../src/lib/notifier';
import { Product } from '../src/lib/types';

test('bot-service: handles /start and /ajuda', async () => {
  const chatId = `test_chat_${Date.now()}`;
  const response = await handleBotCommand(chatId, '/start', { firstName: 'Joan' });

  assert.ok(response.includes('Olá, Joan!'));
  assert.ok(response.includes('/filtro'));
  assert.ok(response.includes('/desconto'));
  assert.ok(response.includes('/status'));

  const sub = getSubscriber(chatId);
  assert.ok(sub);
  assert.equal(sub.chatId, chatId);
  assert.equal(sub.isEnabled, true);
});

test('bot-service: handles /filtro, /status, /adicionar, /remover, /limpar', async () => {
  const chatId = `test_chat_${Date.now()}`;

  // 1. Set filters
  const resFiltro = await handleBotCommand(chatId, '/filtro iphone 15, notebook gamer, ps5');
  assert.ok(resFiltro.includes('Filtros atualizados com sucesso'));

  let sub = getSubscriber(chatId);
  assert.ok(sub);
  assert.deepEqual(sub.keywords, ['iphone 15', 'notebook gamer', 'ps5']);

  // 2. Check /status
  const resStatus = await handleBotCommand(chatId, '/status');
  assert.ok(resStatus.includes('iphone 15'));
  assert.ok(resStatus.includes('notebook gamer'));
  assert.ok(resStatus.includes('ps5'));
  assert.ok(resStatus.includes('Ativado'));

  // 3. Add a keyword
  const resAdd = await handleBotCommand(chatId, '/adicionar rtx 4060');
  assert.ok(resAdd.includes('Filtro adicionado'));
  sub = getSubscriber(chatId);
  assert.ok(sub?.keywords.includes('rtx 4060'));
  assert.equal(sub?.keywords.length, 4);

  // 4. Remove a keyword
  const resRem = await handleBotCommand(chatId, '/remover notebook gamer');
  assert.ok(resRem.includes('Termo removido com sucesso'));
  sub = getSubscriber(chatId);
  assert.equal(sub?.keywords.includes('notebook gamer'), false);
  assert.equal(sub?.keywords.length, 3);

  // 5. Clear all keywords
  const resClear = await handleBotCommand(chatId, '/limpar');
  assert.ok(resClear.includes('removidos'));
  sub = getSubscriber(chatId);
  assert.equal(sub?.keywords.length, 0);
});

test('bot-service: handles /desconto, /ativar, /desativar', async () => {
  const chatId = `test_chat_${Date.now()}`;

  // Discount validation
  const resInvalid = await handleBotCommand(chatId, '/desconto abc');
  assert.ok(resInvalid.includes('número válido'));

  const resDiscount = await handleBotCommand(chatId, '/desconto 30');
  assert.ok(resDiscount.includes('30% OFF'));
  let sub = getSubscriber(chatId);
  assert.equal(sub?.minDiscount, 30);

  // Disable notifications
  const resDisable = await handleBotCommand(chatId, '/desativar');
  assert.ok(resDisable.includes('pausadas'));
  sub = getSubscriber(chatId);
  assert.equal(sub?.isEnabled, false);

  // Enable notifications
  const resEnable = await handleBotCommand(chatId, '/ativar');
  assert.ok(resEnable.includes('ativadas com sucesso'));
  sub = getSubscriber(chatId);
  assert.equal(sub?.isEnabled, true);
});

test('notifier: matchProductWithFilter filters by discount and keywords', () => {
  const sampleProduct: Product = {
    id: 'test_filter_prod',
    title: 'Apple iPhone 15 Pro 128GB Titânio',
    price: 6499.00,
    originalPrice: 8999.00,
    discountPercent: 27,
    store: 'Amazon',
    url: 'https://amazon.com.br/iphone',
    channelName: '@promos',
    rawText: 'Apple iPhone 15 Pro 128GB de R$ 8.999 por R$ 6.499',
    createdAt: Date.now(),
  };

  // Matches keyword 'iphone' and discount <= 25
  assert.equal(
    matchProductWithFilter(sampleProduct, { minDiscount: 25, keywords: ['iphone'] }),
    true
  );

  // Fails if minDiscount is higher than 27%
  assert.equal(
    matchProductWithFilter(sampleProduct, { minDiscount: 35, keywords: ['iphone'] }),
    false
  );

  // Fails if keywords don't match
  assert.equal(
    matchProductWithFilter(sampleProduct, { minDiscount: 20, keywords: ['playstation', 'notebook'] }),
    false
  );

  // Matches if keywords array is empty (accepts any keyword)
  assert.equal(
    matchProductWithFilter(sampleProduct, { minDiscount: 20, keywords: [] }),
    true
  );
});
