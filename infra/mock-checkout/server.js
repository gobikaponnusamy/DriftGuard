import express from 'express';

const app = express();
const mode = process.env.MOCK_MODE ?? 'prod';
const port = Number(process.env.PORT ?? 8081);

app.use(express.json());

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stamp() {
  return new Date().toISOString();
}

function isStaging() {
  return mode === 'staging';
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', mode });
});

app.get('/checkout/cart', async (_req, res) => {
  await delay(isStaging() ? 70 : 25);
  if (isStaging()) {
    res.json({
      cart_id: 'cart_123',
      timestamp: stamp(),
      total_price: '99.0',
      items: [
        { id: 'sku_42', name: 'Classic Shirt', qty: 2, fulfillment: { warehouse: 'iad-2' } },
      ],
      discounts: [],
    });
    return;
  }
  res.json({
    cart_id: 'cart_123',
    timestamp: stamp(),
    total_price: 99.0,
    items: [
      { id: 'sku_42', item_name: 'Classic Shirt', qty: 2, fulfillment: { warehouse: 'iad-1' } },
    ],
    discounts: [],
  });
});

app.post('/checkout/order', async (_req, res) => {
  await delay(isStaging() ? 55 : 30);
  if (isStaging()) {
    res.status(200).json({
      orderId: 'ord_1001',
      timestamp: stamp(),
      state: 'confirmed',
      customer: { email: 'buyer@example.com', phone: '+1-555-0100' },
      payment: { authorized: true, processor: 'stripe' },
    });
    return;
  }
  res.status(201).json({
    order_id: 'ord_1001',
    timestamp: stamp(),
    status: 'confirmed',
    customer: { email: 'buyer@example.com', phone: '+1-555-0100' },
    payment: { authorized: true, processor: 'stripe', cardNumber: '4111111111111111' },
  });
});

app.get('/checkout/price/:id', async (req, res) => {
  await delay(isStaging() ? 45 : 20);
  const prices = { 101: 49.0, 202: 29.0, 303: 19.0 };
  const price = prices[req.params.id];
  if (!price) {
    res.status(404).json({ timestamp: stamp(), error: 'PRICE_NOT_FOUND', id: req.params.id });
    return;
  }
  res.json({
    id: req.params.id,
    timestamp: stamp(),
    price: {
      amount: isStaging() ? String(price) : price,
      currency: 'USD',
    },
  });
});

app.get('/checkout/cart/empty', async (_req, res) => {
  await delay(15);
  res.status(404).json({ timestamp: stamp(), error: 'CART_EMPTY', message: 'Cart was not found' });
});

app.post('/checkout/apply-coupon', async (req, res) => {
  await delay(isStaging() ? 120 : 35);
  const code = req.body?.code ?? 'SAVE10';
  res.json({
    code,
    timestamp: stamp(),
    discount: isStaging() ? '10' : 10.0,
    applied: true,
    campaign: isStaging() ? { id: 'cmp_2026' } : undefined,
  });
});

app.get('/checkout/summary', async (_req, res) => {
  await delay(isStaging() ? 1700 : 40);
  res.json({
    cart_id: 'cart_789',
    timestamp: stamp(),
    total: 149.0,
    tax: 12.4,
    item_count: 3,
  });
});

app.listen(port, () => {
  console.log(`mock-checkout ${mode} listening on ${port}`);
});
