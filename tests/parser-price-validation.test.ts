import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTelegramMessage, extractAccuratePrices, validateProductPrice } from '../src/lib/parser';

test('extractAccuratePrices correctly multiplies installments when only installment is provided', () => {
  const text1 = `Notebook Acer Nitro 5
10x de R$ 389,00 sem juros
Link: https://amzn.to/example`;

  const p1 = extractAccuratePrices(text1);
  assert.equal(p1.price, 3890);

  const text2 = `Smartphone Motorola G54
💥 12x R$ 89,90 sem juros
Link: https://amzn.to/example`;

  const p2 = extractAccuratePrices(text2);
  assert.equal(p2.price, 1078.8);
});

test('extractAccuratePrices prioritizes cash / upfront price over installment line', () => {
  const text = `Smart TV 50 Crystal 4K
De R$ 2.499,00
Por R$ 1.899,00 à vista
ou 10x de R$ 219,90
Link: https://amzn.to/example`;

  const p = extractAccuratePrices(text);
  assert.equal(p.price, 1899);
  assert.equal(p.originalPrice, 2499);
});

test('extractAccuratePrices ignores shipping, coupon value, and cashback lines', () => {
  const text = `Monitor Gamer 24" 165Hz
Preço: R$ 799,00
Use cupom: TECH50 (desconto de R$ 50,00)
Frete fixo de R$ 19,90
Cashback de R$ 30,00
Link: https://amzn.to/example`;

  const p = extractAccuratePrices(text);
  assert.equal(p.price, 799);
});

test('validateProductPrice rejects high-value categories with accessory-level prices (anti-false positive)', () => {
  // iPhone for R$ 39,90 must be rejected
  const fakePhone = validateProductPrice({
    title: 'iPhone 15 128GB Preto',
    price: 39.90,
  });
  assert.equal(fakePhone.valid, false);

  // Notebook for R$ 89,00 must be rejected
  const fakeLaptop = validateProductPrice({
    title: 'Notebook Dell Inspiron 15 Core i5',
    price: 89.00,
  });
  assert.equal(fakeLaptop.valid, false);

  // Smart TV for R$ 49,00 must be rejected
  const fakeTv = validateProductPrice({
    title: 'Smart TV 50 Samsung Crystal UHD 4K',
    price: 49.00,
  });
  assert.equal(fakeTv.valid, false);

  // PS5 for R$ 79,00 must be rejected
  const fakeConsole = validateProductPrice({
    title: 'PlayStation 5 Slim 1TB com 2 Jogos',
    price: 79.00,
  });
  assert.equal(fakeConsole.valid, false);

  // RTX 4060 for R$ 120,00 must be rejected
  const fakeGpu = validateProductPrice({
    title: 'Placa de Vídeo GeForce RTX 4060 8GB',
    price: 120.00,
  });
  assert.equal(fakeGpu.valid, false);
});

test('validateProductPrice accepts genuine accessories even at low prices', () => {
  // Capa para iPhone is an accessory, so R$ 29,90 is valid
  const caseValid = validateProductPrice({
    title: 'Capa Anti-Impacto para iPhone 15 Silicone',
    price: 29.90,
  });
  assert.equal(caseValid.valid, true);

  // Suporte para notebook is an accessory, so R$ 45,00 is valid
  const standValid = validateProductPrice({
    title: 'Suporte Articulado para Notebook Alumínio',
    price: 45.00,
  });
  assert.equal(standValid.valid, true);

  // Cabo HDMI para TV is valid
  const cableValid = validateProductPrice({
    title: 'Cabo HDMI 2.1 Ultra High Speed 8K para Smart TV',
    price: 35.00,
  });
  assert.equal(cableValid.valid, true);
});

test('validateProductPrice rejects absurd discount (> 85%) on low price products', () => {
  const absurd = validateProductPrice({
    title: 'Smart TV 65 4K LG UHD',
    price: 49.90,
    originalPrice: 3899.00,
    discountPercent: 98,
  });
  assert.equal(absurd.valid, false);
});

test('validateProductPrice rejects prices below absolute minimum R$ 5,00 unless free sample', () => {
  const tooLow = validateProductPrice({
    title: 'Caneta Esferográfica Azul',
    price: 1.99,
  });
  assert.equal(tooLow.valid, false);

  const sampleOk = validateProductPrice({
    title: 'Amostra Grátis Café Gourmet 50g',
    price: 0.01,
  });
  assert.equal(sampleOk.valid, true);
});

test('parseTelegramMessage returns null for products failing price validation', () => {
  const rawText = `iPhone 15 Pro Max 256GB Titânio
R$ 29,90
Link: https://amzn.to/example`;

  const parsed = parseTelegramMessage(rawText, { channelName: '@ofertas' });
  assert.equal(parsed, null);
});

test('parseTelegramMessage succeeds for valid products and calculates safe prices', () => {
  const rawText = `Smartphone Samsung Galaxy S23 128GB
De R$ 3.999,00 por R$ 2.499,00 à vista
Link: https://amzn.to/example`;

  const parsed = parseTelegramMessage(rawText, { channelName: '@ofertas' });
  assert.ok(parsed);
  assert.equal(parsed.price, 2499);
  assert.equal(parsed.originalPrice, 3999);
  assert.equal(parsed.discountPercent, 38);
});
