const express = require('express');
const { authenticate } = require('../middleware/auth');
const blingService = require('../services/blingService');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, search = '' } = req.query;
    const products = await blingService.getProducts(parseInt(page), 100, search);
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/price-tables', authenticate, async (req, res) => {
  try {
    const tables = await blingService.getPriceTables();
    res.json(tables);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/price-tables/:id/products', authenticate, async (req, res) => {
  try {
    const { page = 1 } = req.query;
    const products = await blingService.getPriceTableProducts(req.params.id, parseInt(page));
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const product = await blingService.getProductById(req.params.id);
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
