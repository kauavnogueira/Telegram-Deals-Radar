import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTelegramMessage, extractProductTitle, cleanTitle, isStoreBanner } from '../src/lib/parser';

test('isStoreBanner identifies store-only lines and banners', () => {
  assert.equal(isStoreBanner('🎯 Amazon 🎯'), true);
  assert.equal(isStoreBanner('Amazon'), true);
  assert.equal(isStoreBanner('Na Amazon:'), true);
  assert.equal(isStoreBanner('Loja: Amazon Brasil'), true);
  assert.equal(isStoreBanner('MERCADO LIVRE'), true);
  assert.equal(isStoreBanner('🎯 HEADSHOT NO PREÇO — Shopee'), true);
  assert.equal(isStoreBanner('🎯 HEADSHOT NO PREÇO — Kabum'), true);
  assert.equal(isStoreBanner('Shopee'), true);
  assert.equal(isStoreBanner('Kabum!'), true);
  assert.equal(isStoreBanner('AliExpress'), true);

  // Real products with brand/store name must NOT be treated as store banners
  assert.equal(isStoreBanner('Amazon Echo Dot 5ª Geração com Alexa'), false);
  assert.equal(isStoreBanner('Amazon Fire TV Stick 4K'), false);
  assert.equal(isStoreBanner('Final Fantasy Resonance - Nintendo Switch 2 (Exclusivo Amazon)'), false);
  assert.equal(isStoreBanner('Smart TV 50" Crystal UHD 4K Samsung 50DU7700'), false);
});

test('cleanTitle cleans emojis and symbols without surrogate corruption', () => {
  const t1 = cleanTitle('🎯 Amazon 🎯');
  assert.equal(t1, 'Amazon');
  assert.equal(t1.includes('\uFFFD'), false);

  const t2 = cleanTitle('📱 MOTO G54 5G');
  assert.equal(t2, 'MOTO G54 5G');
  assert.equal(t2.includes('\uFFFD'), false);

  const t3 = cleanTitle('PARCELADO🔥🔥🔥🔥');
  assert.equal(t3, 'PARCELADO');

  // Must preserve numbers in model names
  const t4 = cleanTitle('Dune: Awakening - PlayStation 5');
  assert.equal(t4, 'Dune: Awakening - PlayStation 5');

  const t5 = cleanTitle('1STPLAYER Gabinete Gamer Rt5 Mid Tower');
  assert.equal(t5, '1STPLAYER Gabinete Gamer Rt5 Mid Tower');

  // Must preserve inner underscores in identifiers
  const t6 = cleanTitle('Cadeira Gamer EC1, Windows_XP, Preta');
  assert.equal(t6, 'Cadeira Gamer EC1, Windows_XP, Preta');
});

test('extractProductTitle skips Amazon store header and extracts real product title', () => {
  const rawText = `🎯 Amazon 🎯

Microfone Dinâmico Logitech G Yeti GX RGB Supercardioide USB, PC/Mac, Preto

🏆 R$ 599,90

Link: https://amzn.to/4iBcUDD

Atenção estoque sujeito a alteração

#Anúncio`;

  const parsed = parseTelegramMessage(rawText, { channelName: '@PCpartsOfertas' });
  assert.ok(parsed);
  assert.equal(parsed.title, 'Microfone Dinâmico Logitech G Yeti GX RGB Supercardioide USB, PC/Mac, Preto');
  assert.equal(parsed.store, 'Amazon');
  assert.equal(parsed.price, 599.9);
});

test('extractProductTitle handles products with Amazon in their genuine name', () => {
  const rawText = `Echo Dot 5ª Geração | Smart speaker com Alexa | Cor Preta
R$ 299,00 à vista
Link: https://www.amazon.com.br/dp/B09B8V1LZ3`;

  const parsed = parseTelegramMessage(rawText, { channelName: '@promos' });
  assert.ok(parsed);
  assert.equal(parsed.title, 'Echo Dot 5ª Geração | Smart speaker com Alexa | Cor Preta');
});

test('extractProductTitle skips HEADSHOT NO PREÇO store banners', () => {
  const rawText = `🎯 HEADSHOT NO PREÇO — Shopee

Memória Ram Next-Bit DDR4 16GB 3200MHz (1x16) - Chip Micron

💀 R$ 700,00
🏆 R$ 607,00
🎮👉 https://s.shopee.com.br/60RpssKyWH

Resgate o cupom da loja: https://s.shopee.com.br/5LC95eEmZV

#Anúncio

🔔 Campear esse preço`;

  const parsed = parseTelegramMessage(rawText, { channelName: '@PCpartsOfertas' });
  assert.ok(parsed);
  assert.equal(parsed.title, 'Memória Ram Next-Bit DDR4 16GB 3200MHz (1x16) - Chip Micron');
  assert.equal(parsed.store, 'Shopee');
  assert.equal(parsed.price, 607);
});

test('extractProductTitle skips generic category uppercase callout in favor of complete model title', () => {
  const rawText = `🔥 SMART TV 4K
Smart TV 50" Crystal UHD 4K Samsung 50DU7700
De R$ 2.499,00 por R$ 1.899,00
🎟️ Cupom: SAMSUNG100
Link: https://www.amazon.com.br/dp/B0CX234`;

  const parsed = parseTelegramMessage(rawText, { channelName: '@promos' });
  assert.ok(parsed);
  assert.equal(parsed.title, 'Smart TV 50" Crystal UHD 4K Samsung 50DU7700');
});

test('extractProductTitle ignores footer promo links like Amazon Prime trial', () => {
  const rawText = `Suporte para controle GOD OF WAR + Machado Leviathan

💵 R$ 49

🔗 LINK: https://s.shopee.com.br/W6wPT8bSO

(ANUNCIO)

🏆Amazon prime (30 dias grátis)
https://amzn.to/4lM3PHH`;

  const parsed = parseTelegramMessage(rawText, { channelName: '@canal_ofertas' });
  assert.ok(parsed);
  assert.equal(parsed.title, 'Suporte para controle GOD OF WAR + Machado Leviathan');
});

test('extractProductTitle defensive check never returns a bare store name', () => {
  assert.equal(extractProductTitle('🎯 Amazon 🎯'), 'Produto em Oferta');
  assert.equal(extractProductTitle('MERCADO LIVRE'), 'Produto em Oferta');
  assert.equal(extractProductTitle('Shopee'), 'Produto em Oferta');
});
