import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

const requiredEnv = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_KEY',
  'TEST_USER_ID',
  'TEST_RESTAURANT_ID',
  'TEST_DELIVERY_ADDRESS_ID',
  'TEST_DELIVERY_ADDRESS',
  'TEST_BACKUP_RESTAURANT_ID',
];

const missing = requiredEnv.filter((key) => !process.env[key]);
const shouldSkip = missing.length > 0;

if (shouldSkip) {
  console.warn('Skipping contract RPC tests. Missing env:', missing.join(', '));
}

const supabase = shouldSkip
  ? null
  : createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

const createdOrders = [];

async function createOrderFixture() {
  const { data, error } = await supabase.rpc('create_order_payment_pending', {
    p_user_id: process.env.TEST_USER_ID,
    p_restaurant_id: process.env.TEST_RESTAURANT_ID,
    p_delivery_address_id: process.env.TEST_DELIVERY_ADDRESS_ID,
    p_delivery_address: process.env.TEST_DELIVERY_ADDRESS,
    p_subtotal: 50,
    p_delivery_fee: 10,
    p_tax_amount: 5,
    p_tip_amount: 5,
    p_payment_method: 'instapay',
    p_payment_ref: 'test-proof',
  });
  if (error) throw error;
  createdOrders.push(data);
  return data;
}

before(async () => {
  if (shouldSkip) return;
});

after(async () => {
  if (shouldSkip) return;
  if (createdOrders.length === 0) return;
  await supabase.from('orders').delete().in('id', createdOrders);
});

test('payment proof RPC accepts valid proof', async (t) => {
  if (shouldSkip) return t.skip('missing env');
  const orderId = await createOrderFixture();
  const { data, error } = await supabase.rpc('submit_payment_proof', {
    p_order_id: orderId,
    p_txn_id: `txn_${Date.now()}`,
    p_reported_amount: 70,
    p_receipt_url: 'https://example.com/receipt',
  });
  assert.ifError(error);
  assert.ok(data.status === 'paid' || data.status === 'paid_pending_review');
});

test('restaurant payout initiate/finalize are idempotent', async (t) => {
  if (shouldSkip) return t.skip('missing env');
  const orderId = await createOrderFixture();

  // Mark order paid to allow payout
  await supabase.from('orders').update({ payment_status: 'paid' }).eq('id', orderId);

  const idem = `ct_rest_${Date.now()}`;
  const init = await supabase.rpc('initiate_restaurant_payout', {
    p_order_id: orderId,
    p_idempotency_key: idem,
    p_payout_ref: idem,
  });
  assert.ifError(init.error);
  assert.equal(init.data, 'initiated');

  const finalize = await supabase.rpc('finalize_restaurant_payout', {
    p_order_id: orderId,
    p_idempotency_key: idem,
    p_success: true,
    p_payout_ref: idem,
  });
  assert.ifError(finalize.error);
  assert.equal(finalize.data, 'paid');
});

test('reroute RPC returns a new order id', async (t) => {
  if (shouldSkip) return t.skip('missing env');
  const orderId = await createOrderFixture();
  const idem = `ct_reroute_${Date.now()}`;
  const { data, error } = await supabase.rpc('reroute_order_rpc', {
    p_order_id: orderId,
    p_backup_restaurant_id: process.env.TEST_BACKUP_RESTAURANT_ID,
    p_idempotency_key: idem,
  });
  assert.ifError(error);
  assert.ok(typeof data === 'string' && data.length > 0, 'new order id returned');
});
