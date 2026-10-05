import test from 'node:test';
import assert from 'node:assert/strict';
import { formatProductMessage, shouldNotifyProduct, getNotifierConfig } from '../src/lib/notifier';
import { Product } from '../src/lib/types';

test('formatProductMessage formats HTML message with price, store, channel and coupon', () => {
  const product: Product = {
    id: 'test_prod_1',
    title: 'Monitor Gamer 27" 144Hz LG UltraGear',
    price: 999.90,
    originalPrice: 1399.00,
    discountPercent: 29,
    coupon: 'GAMER100',
    store: 'Amazon',
    url: 'https://www.amazon.com.br/dp/B01234',
    channelName: '@PCpartsOfertas',
    rawText: 'Monitor Gamer LG 27...',
    createdAt: Date.now(),
  };

  const { text, inlineUrl } = formatProductMessage(product);

  assert.ok(text.includes('<b>Monitor Gamer 27&quot; 144Hz LG UltraGear</b>') || text.includes('Monitor Gamer 27'));
  assert.ok(text.includes('R$&nbsp;999,90') || text.includes('999,90'));
  assert.ok(text.includes('1.399,00'));
  assert.ok(text.includes('-29%'));
  assert.ok(text.includes('<code>GAMER100</code>'));
  assert.ok(text.includes('Amazon'));
  assert.ok(text.includes('@PCpartsOfertas'));
  assert.equal(inlineUrl, 'https://www.amazon.com.br/dp/B01234');
});

test('formatProductMessage omits inlineUrl when product url is not http', () => {
  const product: Product = {
    id: 'test_prod_2',
    title: 'Mouse Sem Fio Logitech',
    price: 89.90,
    store: 'Shopee',
    url: '#',
    channelName: '@ofertas',
    rawText: 'Mouse Logitech...',
    createdAt: Date.now(),
  };

  const { inlineUrl } = formatProductMessage(product);
  assert.equal(inlineUrl, undefined);
});

test('shouldNotifyProduct respects enabled flag and returns false if disabled', () => {
  const config = getNotifierConfig();
  if (!config.enabled) {
    const product: Product = {
      id: 'test_prod_3',
      title: 'Teclado Mecânico Redragon',
      price: 199.00,
      store: 'Kabum',
      url: 'https://kabum.com.br',
      channelName: '@ofertas',
      rawText: 'Teclado...',
      createdAt: Date.now(),
    };

    const check = shouldNotifyProduct(product);
    assert.equal(check.shouldNotify, false);
    assert.ok(check.reason);
  }
});
