const express = require('express');
const { getDb } = require('../config/database');
const { authenticate, requireAdmin } = require('../middleware/auth');
const blingService = require('../services/blingService');

const router = express.Router();

// Get orders (admin sees all, rep sees own)
router.get('/', authenticate, (req, res) => {
  const db = getDb();
  const { status, brand_id, representative_id, start_date, end_date, page = 1, limit = 50 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let query = `
    SELECT o.*, c.name as customer_name, u.name as representative_name, b.name as brand_name
    FROM orders o
    JOIN customers c ON o.customer_id = c.id
    JOIN users u ON o.representative_id = u.id
    JOIN brands b ON o.brand_id = b.id
    WHERE 1=1
  `;
  const params = [];

  if (req.user.role !== 'admin') {
    query += ' AND o.representative_id = ?';
    params.push(req.user.id);
  } else if (representative_id) {
    query += ' AND o.representative_id = ?';
    params.push(parseInt(representative_id));
  }

  if (status) {
    query += ' AND o.status = ?';
    params.push(status);
  }
  if (brand_id) {
    query += ' AND o.brand_id = ?';
    params.push(parseInt(brand_id));
  }
  if (start_date) {
    query += ' AND DATE(o.created_at) >= ?';
    params.push(start_date);
  }
  if (end_date) {
    query += ' AND DATE(o.created_at) <= ?';
    params.push(end_date);
  }

  const countQuery = query.replace(/SELECT .* FROM/, 'SELECT COUNT(*) as total FROM');
  const total = db.prepare(countQuery).get(...params).total;

  query += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), offset);

  const orders = db.prepare(query).all(...params);
  res.json({ orders, total, page: parseInt(page), limit: parseInt(limit) });
});

// Get order details
router.get('/:id', authenticate, (req, res) => {
  const db = getDb();
  const order = db.prepare(`
    SELECT o.*, c.name as customer_name, c.cnpj_cpf as customer_document,
           u.name as representative_name, b.name as brand_name
    FROM orders o
    JOIN customers c ON o.customer_id = c.id
    JOIN users u ON o.representative_id = u.id
    JOIN brands b ON o.brand_id = b.id
    WHERE o.id = ?
  `).get(req.params.id);

  if (!order) {
    return res.status(404).json({ error: 'Pedido não encontrado' });
  }

  if (req.user.role !== 'admin' && order.representative_id !== req.user.id) {
    return res.status(403).json({ error: 'Acesso negado' });
  }

  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
  const commission = db.prepare('SELECT * FROM commissions WHERE order_id = ?').get(order.id);

  res.json({ ...order, items, commission });
});

// Create order
router.post('/', authenticate, (req, res) => {
  const db = getDb();
  const { brand_id, customer_id, items, notes, price_table_id, price_table_name, payment_condition, discount = 0 } = req.body;

  if (!brand_id || !customer_id || !items || items.length === 0) {
    return res.status(400).json({ error: 'Marca, cliente e itens são obrigatórios' });
  }

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const total = subtotal - (discount || 0);

  const insertOrder = db.transaction(() => {
    const result = db.prepare(`
      INSERT INTO orders (brand_id, representative_id, customer_id, subtotal, discount, total, notes, price_table_id, price_table_name, payment_condition, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `).run(brand_id, req.user.id, customer_id, subtotal, discount, total, notes || null,
      price_table_id || null, price_table_name || null, payment_condition || null);

    const orderId = result.lastInsertRowid;

    const insertItem = db.prepare(`
      INSERT INTO order_items (order_id, bling_product_id, product_name, product_code, quantity, unit_price, total_price)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const item of items) {
      insertItem.run(orderId, item.bling_product_id || null, item.product_name,
        item.product_code || null, item.quantity, item.unit_price, item.quantity * item.unit_price);
    }

    // Create commission record
    const user = db.prepare('SELECT commission_rate FROM users WHERE id = ?').get(req.user.id);
    const commissionRate = user.commission_rate || 5.0;
    const commissionValue = total * (commissionRate / 100);

    db.prepare(`
      INSERT INTO commissions (order_id, representative_id, order_total, commission_rate, commission_value, status)
      VALUES (?, ?, ?, ?, ?, 'pending')
    `).run(orderId, req.user.id, total, commissionRate, commissionValue);

    return orderId;
  });

  const orderId = insertOrder();
  const order = db.prepare(`
    SELECT o.*, c.name as customer_name, u.name as representative_name, b.name as brand_name
    FROM orders o
    JOIN customers c ON o.customer_id = c.id
    JOIN users u ON o.representative_id = u.id
    JOIN brands b ON o.brand_id = b.id
    WHERE o.id = ?
  `).get(orderId);

  res.status(201).json(order);
});

// Send order to Bling
router.post('/:id/send-to-bling', authenticate, async (req, res) => {
  const db = getDb();
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);

  if (!order) {
    return res.status(404).json({ error: 'Pedido não encontrado' });
  }

  if (order.status !== 'pending') {
    return res.status(400).json({ error: 'Pedido já foi enviado ao Bling' });
  }

  try {
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(order.customer_id);
    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
    const rep = db.prepare('SELECT name FROM users WHERE id = ?').get(order.representative_id);

    // Sync customer to Bling if not yet synced
    if (!customer.synced_with_bling || !customer.bling_id) {
      const blingCustomer = await blingService.createCustomerInBling(customer);
      db.prepare('UPDATE customers SET bling_id = ?, synced_with_bling = 1 WHERE id = ?')
        .run(String(blingCustomer.id), customer.id);
      customer.bling_id = String(blingCustomer.id);
    }

    const blingOrder = await blingService.createOrder({
      bling_customer_id: customer.bling_id,
      items,
      notes: order.notes,
      price_table_id: order.price_table_id,
      representative_name: rep.name,
    });

    db.prepare(`
      UPDATE orders SET bling_order_id = ?, status = 'sent_to_bling', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(String(blingOrder.id), order.id);

    res.json({ message: 'Pedido enviado ao Bling com sucesso', bling_order_id: blingOrder.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update order status (admin)
router.patch('/:id/status', authenticate, requireAdmin, (req, res) => {
  const db = getDb();
  const { status } = req.body;
  const validStatuses = ['pending', 'sent_to_bling', 'approved', 'invoiced', 'shipped', 'delivered', 'cancelled'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Status inválido' });
  }

  db.prepare('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(status, req.params.id);

  res.json({ message: 'Status atualizado' });
});

module.exports = router;
