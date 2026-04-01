const express = require('express');
const { getDb } = require('../config/database');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get commissions (admin sees all, rep sees own)
router.get('/', authenticate, (req, res) => {
  const db = getDb();
  const { representative_id, status, start_date, end_date, page = 1, limit = 50 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let query = `
    SELECT cm.*, o.created_at as order_date, o.status as order_status,
           u.name as representative_name, u.email as representative_email,
           c.name as customer_name, b.name as brand_name
    FROM commissions cm
    JOIN orders o ON cm.order_id = o.id
    JOIN users u ON cm.representative_id = u.id
    JOIN customers c ON o.customer_id = c.id
    JOIN brands b ON o.brand_id = b.id
    WHERE 1=1
  `;
  const params = [];

  if (req.user.role !== 'admin') {
    query += ' AND cm.representative_id = ?';
    params.push(req.user.id);
  } else if (representative_id) {
    query += ' AND cm.representative_id = ?';
    params.push(parseInt(representative_id));
  }

  if (status) {
    query += ' AND cm.status = ?';
    params.push(status);
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

  const commissions = db.prepare(query).all(...params);
  res.json({ commissions, total, page: parseInt(page), limit: parseInt(limit) });
});

// Commission summary (for charts)
router.get('/summary', authenticate, (req, res) => {
  const db = getDb();
  const { representative_id, start_date, end_date, group_by = 'month' } = req.query;

  let dateFormat;
  if (group_by === 'day') dateFormat = '%Y-%m-%d';
  else if (group_by === 'week') dateFormat = '%Y-W%W';
  else dateFormat = '%Y-%m';

  let whereClause = '1=1';
  const params = [];

  if (req.user.role !== 'admin') {
    whereClause += ' AND cm.representative_id = ?';
    params.push(req.user.id);
  } else if (representative_id) {
    whereClause += ' AND cm.representative_id = ?';
    params.push(parseInt(representative_id));
  }

  if (start_date) {
    whereClause += ' AND DATE(o.created_at) >= ?';
    params.push(start_date);
  }
  if (end_date) {
    whereClause += ' AND DATE(o.created_at) <= ?';
    params.push(end_date);
  }

  // Summary by period
  const byPeriod = db.prepare(`
    SELECT strftime('${dateFormat}', o.created_at) as period,
           COUNT(cm.id) as total_orders,
           SUM(cm.order_total) as total_sales,
           SUM(cm.commission_value) as total_commission,
           AVG(cm.commission_rate) as avg_rate
    FROM commissions cm
    JOIN orders o ON cm.order_id = o.id
    WHERE ${whereClause}
    GROUP BY period
    ORDER BY period ASC
  `).all(...params);

  // Summary by status
  const byStatus = db.prepare(`
    SELECT cm.status,
           COUNT(cm.id) as count,
           SUM(cm.commission_value) as total_value
    FROM commissions cm
    JOIN orders o ON cm.order_id = o.id
    WHERE ${whereClause}
    GROUP BY cm.status
  `).all(...params);

  // Summary by representative (admin only)
  let byRepresentative = [];
  if (req.user.role === 'admin') {
    byRepresentative = db.prepare(`
      SELECT u.id, u.name as representative_name,
             COUNT(cm.id) as total_orders,
             SUM(cm.order_total) as total_sales,
             SUM(cm.commission_value) as total_commission,
             AVG(cm.commission_rate) as avg_rate
      FROM commissions cm
      JOIN orders o ON cm.order_id = o.id
      JOIN users u ON cm.representative_id = u.id
      WHERE ${whereClause.replace('cm.representative_id = ?', '1=1')}
      GROUP BY u.id
      ORDER BY total_commission DESC
    `).all(...(start_date || end_date ? params.filter((_, i) => {
      if (!representative_id) return true;
      return i > 0;
    }) : []));
  }

  // Totals
  const totals = db.prepare(`
    SELECT COUNT(cm.id) as total_orders,
           COALESCE(SUM(cm.order_total), 0) as total_sales,
           COALESCE(SUM(cm.commission_value), 0) as total_commission,
           COALESCE(SUM(CASE WHEN cm.status = 'pending' THEN cm.commission_value ELSE 0 END), 0) as pending_commission,
           COALESCE(SUM(CASE WHEN cm.status = 'scheduled' THEN cm.commission_value ELSE 0 END), 0) as scheduled_commission,
           COALESCE(SUM(CASE WHEN cm.status = 'paid' THEN cm.commission_value ELSE 0 END), 0) as paid_commission
    FROM commissions cm
    JOIN orders o ON cm.order_id = o.id
    WHERE ${whereClause}
  `).get(...params);

  res.json({ byPeriod, byStatus, byRepresentative, totals });
});

// Schedule commission payment (admin)
router.patch('/:id/schedule', authenticate, requireAdmin, (req, res) => {
  const db = getDb();
  const { payment_date } = req.body;

  if (!payment_date) {
    return res.status(400).json({ error: 'Data de pagamento é obrigatória' });
  }

  db.prepare(`
    UPDATE commissions SET status = 'scheduled', payment_date = ? WHERE id = ?
  `).run(payment_date, req.params.id);

  res.json({ message: 'Pagamento agendado' });
});

// Batch schedule (admin)
router.post('/batch-schedule', authenticate, requireAdmin, (req, res) => {
  const db = getDb();
  const { commission_ids, payment_date } = req.body;

  if (!commission_ids?.length || !payment_date) {
    return res.status(400).json({ error: 'IDs das comissões e data de pagamento são obrigatórios' });
  }

  const placeholders = commission_ids.map(() => '?').join(',');
  db.prepare(`
    UPDATE commissions SET status = 'scheduled', payment_date = ?
    WHERE id IN (${placeholders}) AND status = 'pending'
  `).run(payment_date, ...commission_ids);

  res.json({ message: `${commission_ids.length} comissões agendadas` });
});

// Mark as paid (admin)
router.patch('/:id/pay', authenticate, requireAdmin, (req, res) => {
  const db = getDb();
  db.prepare(`
    UPDATE commissions SET status = 'paid', paid_at = CURRENT_TIMESTAMP WHERE id = ?
  `).run(req.params.id);

  res.json({ message: 'Comissão marcada como paga' });
});

// Batch mark as paid (admin)
router.post('/batch-pay', authenticate, requireAdmin, (req, res) => {
  const db = getDb();
  const { commission_ids } = req.body;

  if (!commission_ids?.length) {
    return res.status(400).json({ error: 'IDs das comissões são obrigatórios' });
  }

  const placeholders = commission_ids.map(() => '?').join(',');
  db.prepare(`
    UPDATE commissions SET status = 'paid', paid_at = CURRENT_TIMESTAMP
    WHERE id IN (${placeholders})
  `).run(...commission_ids);

  res.json({ message: `${commission_ids.length} comissões marcadas como pagas` });
});

module.exports = router;
