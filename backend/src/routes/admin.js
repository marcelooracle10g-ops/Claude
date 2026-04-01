const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb } = require('../config/database');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Dashboard stats
router.get('/dashboard', authenticate, requireAdmin, (req, res) => {
  const db = getDb();
  const { start_date, end_date, brand_id } = req.query;

  let dateFilter = '';
  const params = [];
  if (start_date) {
    dateFilter += ' AND DATE(o.created_at) >= ?';
    params.push(start_date);
  }
  if (end_date) {
    dateFilter += ' AND DATE(o.created_at) <= ?';
    params.push(end_date);
  }
  let brandFilter = '';
  if (brand_id) {
    brandFilter = ' AND o.brand_id = ?';
    params.push(parseInt(brand_id));
  }

  const totalOrders = db.prepare(`
    SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as revenue
    FROM orders o WHERE 1=1 ${dateFilter} ${brandFilter}
  `).get(...params);

  const ordersByStatus = db.prepare(`
    SELECT status, COUNT(*) as count, COALESCE(SUM(total), 0) as revenue
    FROM orders o WHERE 1=1 ${dateFilter} ${brandFilter}
    GROUP BY status
  `).all(...params);

  const ordersByBrand = db.prepare(`
    SELECT b.name as brand_name, b.id as brand_id,
           COUNT(o.id) as count, COALESCE(SUM(o.total), 0) as revenue
    FROM orders o
    JOIN brands b ON o.brand_id = b.id
    WHERE 1=1 ${dateFilter} ${brandFilter}
    GROUP BY b.id
  `).all(...params);

  const topRepresentatives = db.prepare(`
    SELECT u.id, u.name, COUNT(o.id) as total_orders,
           COALESCE(SUM(o.total), 0) as total_revenue
    FROM orders o
    JOIN users u ON o.representative_id = u.id
    WHERE 1=1 ${dateFilter} ${brandFilter}
    GROUP BY u.id
    ORDER BY total_revenue DESC
    LIMIT 10
  `).all(...params);

  const monthlySales = db.prepare(`
    SELECT strftime('%Y-%m', o.created_at) as month,
           COUNT(o.id) as count, COALESCE(SUM(o.total), 0) as revenue
    FROM orders o WHERE 1=1 ${dateFilter} ${brandFilter}
    GROUP BY month
    ORDER BY month ASC
  `).all(...params);

  const pendingCommissions = db.prepare(`
    SELECT COALESCE(SUM(commission_value), 0) as total
    FROM commissions WHERE status = 'pending'
  `).get();

  const totalRepresentatives = db.prepare(`
    SELECT COUNT(*) as count FROM users WHERE role = 'representative' AND active = 1
  `).get();

  res.json({
    totalOrders: totalOrders.count,
    totalRevenue: totalOrders.revenue,
    ordersByStatus,
    ordersByBrand,
    topRepresentatives,
    monthlySales,
    pendingCommissions: pendingCommissions.total,
    totalRepresentatives: totalRepresentatives.count,
  });
});

// Manage representatives
router.get('/representatives', authenticate, requireAdmin, (req, res) => {
  const db = getDb();
  const reps = db.prepare(`
    SELECT u.id, u.name, u.email, u.phone, u.cpf, u.commission_rate,
           u.active, u.created_at, b.name as brand_name, b.id as brand_id,
           COUNT(o.id) as total_orders,
           COALESCE(SUM(o.total), 0) as total_sales
    FROM users u
    LEFT JOIN brands b ON u.brand_id = b.id
    LEFT JOIN orders o ON o.representative_id = u.id
    WHERE u.role = 'representative'
    GROUP BY u.id
    ORDER BY u.name ASC
  `).all();
  res.json(reps);
});

// Create representative
router.post('/representatives', authenticate, requireAdmin, (req, res) => {
  const db = getDb();
  const { name, email, password, phone, cpf, brand_id, commission_rate = 5.0 } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(400).json({ error: 'Email já cadastrado' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  const result = db.prepare(`
    INSERT INTO users (name, email, password, role, phone, cpf, brand_id, commission_rate)
    VALUES (?, ?, ?, 'representative', ?, ?, ?, ?)
  `).run(name, email, hashedPassword, phone || null, cpf || null, brand_id || null, commission_rate);

  const user = db.prepare('SELECT id, name, email, phone, cpf, brand_id, commission_rate, active FROM users WHERE id = ?')
    .get(result.lastInsertRowid);
  res.status(201).json(user);
});

// Update representative
router.put('/representatives/:id', authenticate, requireAdmin, (req, res) => {
  const db = getDb();
  const { name, email, phone, cpf, brand_id, commission_rate, active, password } = req.body;

  const updates = [];
  const params = [];

  if (name) { updates.push('name = ?'); params.push(name); }
  if (email) { updates.push('email = ?'); params.push(email); }
  if (phone !== undefined) { updates.push('phone = ?'); params.push(phone); }
  if (cpf !== undefined) { updates.push('cpf = ?'); params.push(cpf); }
  if (brand_id !== undefined) { updates.push('brand_id = ?'); params.push(brand_id); }
  if (commission_rate !== undefined) { updates.push('commission_rate = ?'); params.push(commission_rate); }
  if (active !== undefined) { updates.push('active = ?'); params.push(active ? 1 : 0); }
  if (password) { updates.push('password = ?'); params.push(bcrypt.hashSync(password, 10)); }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'Nenhum campo para atualizar' });
  }

  params.push(req.params.id);
  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  const user = db.prepare('SELECT id, name, email, phone, cpf, brand_id, commission_rate, active FROM users WHERE id = ?')
    .get(req.params.id);
  res.json(user);
});

// Get brands
router.get('/brands', authenticate, (req, res) => {
  const db = getDb();
  const brands = db.prepare('SELECT * FROM brands ORDER BY name').all();
  res.json(brands);
});

module.exports = router;
