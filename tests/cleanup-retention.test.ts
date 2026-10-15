import test from 'node:test';
import assert from 'node:assert/strict';
import { saveProduct, getProducts, cleanupOldRecords, deleteProduct, saveCoupon, getCoupons, deleteCoupon } from '../src/lib/db';
import { Product, Coupon } from '../src/lib/types';

test('7-day retention: cleanupOldRecords purges products and coupons older than 7 days', () => {
  const now = Date.now();
  const TEN_DAYS_AGO = now - 10 * 24 * 60 * 60 * 1000;
  const TWO_DAYS_AGO = now - 2 * 24 * 60 * 60 * 1000;

  const oldProdId = `test_old_${Date.now()}`;
  const freshProdId = `test_fresh_${Date.now()}`;

  const oldProduct: Product = {
    id: oldProdId,
    title: 'Produto Antigo Expirado',
    price: 150.0,
    store: 'Amazon',
    url: 'https://amazon.com.br/test-old',
    channelName: '@canal_teste',
    rawText: 'Produto Antigo',
    createdAt: TEN_DAYS_AGO,
  };

  const freshProduct: Product = {
    id: freshProdId,
    title: 'Produto Recente 2 Dias',
    price: 150.0,
    store: 'Amazon',
    url: 'https://amazon.com.br/test-fresh',
    channelName: '@canal_teste',
    rawText: 'Produto Recente',
    createdAt: TWO_DAYS_AGO,
  };

  const oldCoupon: Coupon = {
    id: `coupon_old_${Date.now()}`,
    code: `OLD${Date.now()}`,
    store: 'Amazon',
    title: 'Cupom Antigo',
    url: 'https://amazon.com.br',
    channelName: '@canal_teste',
    rawText: 'Cupom Antigo',
    createdAt: TEN_DAYS_AGO,
  };

  const freshCoupon: Coupon = {
    id: `coupon_fresh_${Date.now()}`,
    code: `FRESH${Date.now()}`,
    store: 'Amazon',
    title: 'Cupom Recente',
    url: 'https://amazon.com.br',
    channelName: '@canal_teste',
    rawText: 'Cupom Recente',
    createdAt: TWO_DAYS_AGO,
  };

  // Save both
  saveProduct(oldProduct);
  saveProduct(freshProduct);
  saveCoupon(oldCoupon);
  saveCoupon(freshCoupon);

  // Default getProducts (withinDays: 7) should only return the fresh product
  const defaultQuery = getProducts({ search: 'Produto' });
  const hasOldInQuery = defaultQuery.products.some((p) => p.id === oldProdId);
  const hasFreshInQuery = defaultQuery.products.some((p) => p.id === freshProdId);

  assert.equal(hasOldInQuery, false, 'Old product (>7 days) must NOT be returned by default query');
  assert.equal(hasFreshInQuery, true, 'Fresh product (2 days) must be returned by query');

  // Run cleanupOldRecords
  const cleanupRes = cleanupOldRecords(7);
  assert.ok(cleanupRes.deletedProducts >= 1);
  assert.ok(cleanupRes.deletedCoupons >= 1);

  // Check coupons
  // Check coupons specifically by their unique codes
  const oldCouponQuery = getCoupons({ search: oldCoupon.code, withinDays: 0 });
  const freshCouponQuery = getCoupons({ search: freshCoupon.code, withinDays: 7 });
  assert.equal(oldCouponQuery.total, 0, 'Old coupon must be deleted');
  assert.equal(freshCouponQuery.total, 1, 'Fresh coupon must remain');


  // Check if old product was deleted from DB completely
  const allQuery = getProducts({ withinDays: 0, search: 'Produto Antigo Expirado' });
  const oldStillExists = allQuery.products.some((p) => p.id === oldProdId);
  assert.equal(oldStillExists, false, 'Old product must be completely removed from SQLite by cleanup');

  // Check if fresh product is still intact in DB
  const freshCheck = getProducts({ withinDays: 7, search: 'Produto Recente 2 Dias' });
  const freshStillExists = freshCheck.products.some((p) => p.id === freshProdId);
  assert.equal(freshStillExists, true, 'Fresh product must remain in SQLite');

  // Cleanup test fixtures
  deleteProduct(freshProdId);
  deleteCoupon(freshCoupon.id);
});
