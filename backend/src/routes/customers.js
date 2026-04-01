const express = require('express');
const { getDb } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const blingService = require('../services/blingService');

const router = express.Router();

// Search customers from Bling
router.get('/bling/search', authenticate, async (req, res) => {
  try {
    const { search = '', page = 1 } = req.query;
    const customers = await blingService.getCustomers(parseInt(page), search);
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get local customers
router.get('/', authenticate, (req, res) => {
  const db = getDb();
  const { search = '' } = req.query;

  let query = 'SELECT * FROM customers WHERE 1=1';
  const params = [];

  if (search) {
    query += ' AND (name LIKE ? OR cnpj_cpf LIKE ? OR trade_name LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  query += ' ORDER BY name ASC';
  const customers = db.prepare(query).all(...params);
  res.json(customers);
});

// Create local customer
router.post('/', authenticate, (req, res) => {
  const db = getDb();
  const { name, trade_name, cnpj_cpf, email, phone, address, city, state, zip_code, neighborhood } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Nome é obrigatório' });
  }

  const result = db.prepare(`
    INSERT INTO customers (name, trade_name, cnpj_cpf, email, phone, address, city, state, zip_code, neighborhood, created_by, synced_with_bling)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
  `).run(name, trade_name || null, cnpj_cpf || null, email || null, phone || null,
    address || null, city || null, state || null, zip_code || null, neighborhood || null, req.user.id);

  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(customer);
});

// Import customer from Bling
router.post('/import-from-bling', authenticate, async (req, res) => {
  try {
    const { bling_id } = req.body;
    const blingCustomer = await blingService.getCustomerById(bling_id);

    if (!blingCustomer) {
      return res.status(404).json({ error: 'Cliente não encontrado no Bling' });
    }

    const db = getDb();
    const existing = db.prepare('SELECT * FROM customers WHERE bling_id = ?').get(String(bling_id));

    if (existing) {
      return res.json(existing);
    }

    const endereco = blingCustomer.endereco || {};
    const result = db.prepare(`
      INSERT INTO customers (bling_id, name, trade_name, cnpj_cpf, email, phone, address, city, state, zip_code, neighborhood, synced_with_bling, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `).run(
      String(blingCustomer.id),
      blingCustomer.nome,
      blingCustomer.fantasia || null,
      blingCustomer.numeroDocumento || null,
      blingCustomer.email || null,
      blingCustomer.telefone || null,
      endereco.endereco || null,
      endereco.cidade || null,
      endereco.uf || null,
      endereco.cep || null,
      endereco.bairro || null,
      req.user.id
    );

    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(customer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Sync local customer to Bling
router.post('/:id/sync-to-bling', authenticate, async (req, res) => {
  try {
    const db = getDb();
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);

    if (!customer) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    if (customer.synced_with_bling && customer.bling_id) {
      return res.json({ message: 'Cliente já sincronizado', customer });
    }

    const blingCustomer = await blingService.createCustomerInBling(customer);

    db.prepare(`
      UPDATE customers SET bling_id = ?, synced_with_bling = 1 WHERE id = ?
    `).run(String(blingCustomer.id), customer.id);

    const updated = db.prepare('SELECT * FROM customers WHERE id = ?').get(customer.id);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
