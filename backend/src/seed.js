require('dotenv').config();
const bcrypt = require('bcryptjs');
const { initDb, getDb } = require('./config/database');

async function seed() {
  await initDb();
  const db = getDb();

  console.log('Seeding database...');

  // Create admin user
  const adminPassword = bcrypt.hashSync('admin123', 10);
  db.prepare(`
    INSERT OR IGNORE INTO users (name, email, password, role, commission_rate)
    VALUES ('Administrador', 'admin@cosmeticos.com', ?, 'admin', 0)
  `).run(adminPassword);

  // Create sample representatives
  const repPassword = bcrypt.hashSync('rep123', 10);

  const reps = [
    { name: 'Carlos Silva', email: 'carlos@cosmeticos.com', brand_id: 1, commission: 5.0, phone: '11999990001' },
    { name: 'Maria Santos', email: 'maria@cosmeticos.com', brand_id: 1, commission: 6.0, phone: '11999990002' },
    { name: 'João Oliveira', email: 'joao@cosmeticos.com', brand_id: 2, commission: 5.5, phone: '11999990003' },
    { name: 'Ana Costa', email: 'ana@cosmeticos.com', brand_id: 2, commission: 5.0, phone: '11999990004' },
  ];

  for (const rep of reps) {
    db.prepare(`
      INSERT OR IGNORE INTO users (name, email, password, role, phone, brand_id, commission_rate)
      VALUES (?, ?, ?, 'representative', ?, ?, ?)
    `).run(rep.name, rep.email, repPassword, rep.phone, rep.brand_id, rep.commission);
  }

  // Create sample customers
  const customers = [
    { name: 'Salão Beleza Pura', trade_name: 'Beleza Pura', cnpj_cpf: '12345678000190', city: 'São Paulo', state: 'SP' },
    { name: 'Farmácia Vida', trade_name: 'Vida', cnpj_cpf: '98765432000110', city: 'Rio de Janeiro', state: 'RJ' },
    { name: 'Distribuidora Glamour', trade_name: 'Glamour', cnpj_cpf: '11223344000155', city: 'Belo Horizonte', state: 'MG' },
  ];

  for (const c of customers) {
    db.prepare(`
      INSERT OR IGNORE INTO customers (name, trade_name, cnpj_cpf, city, state, synced_with_bling, created_by)
      VALUES (?, ?, ?, ?, ?, 0, 1)
    `).run(c.name, c.trade_name, c.cnpj_cpf, c.city, c.state);
  }

  // Create sample orders with commissions
  const allReps = db.prepare("SELECT * FROM users WHERE role = 'representative'").all();
  const months = ['2025-11', '2025-12', '2026-01', '2026-02', '2026-03'];

  for (const month of months) {
    for (const rep of allReps) {
      const numOrders = Math.floor(Math.random() * 4) + 1;

      for (let i = 0; i < numOrders; i++) {
        const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
        const total = Math.round((Math.random() * 5000 + 500) * 100) / 100;
        const statuses = ['approved', 'invoiced', 'shipped', 'delivered'];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const customerId = Math.floor(Math.random() * 3) + 1;

        const orderResult = db.prepare(`
          INSERT INTO orders (brand_id, representative_id, customer_id, subtotal, discount, total, status, created_at)
          VALUES (?, ?, ?, ?, 0, ?, ?, '${month}-${day} 10:00:00')
        `).run(rep.brand_id, rep.id, customerId, total, total, status);

        const orderId = orderResult.lastInsertRowid;

        db.prepare(`
          INSERT INTO order_items (order_id, product_name, product_code, quantity, unit_price, total_price)
          VALUES (?, 'Produto Exemplo', 'PROD001', 10, ?, ?)
        `).run(orderId, total / 10, total);

        const commissionValue = Math.round(total * (rep.commission_rate / 100) * 100) / 100;
        const commissionStatus = month < '2026-02' ? 'paid' : (month === '2026-02' ? 'scheduled' : 'pending');
        const paymentDate = commissionStatus !== 'pending' ? `${month}-28` : null;

        db.prepare(`
          INSERT INTO commissions (order_id, representative_id, order_total, commission_rate, commission_value, status, payment_date, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, '${month}-${day} 10:00:00')
        `).run(orderId, rep.id, total, rep.commission_rate, commissionValue, commissionStatus, paymentDate);
      }
    }
  }

  console.log('Database seeded successfully!');
  console.log('');
  console.log('=== CREDENCIAIS DE TESTE ===');
  console.log('Admin:          admin@cosmeticos.com / admin123');
  console.log('Representante:  carlos@cosmeticos.com / rep123');
  console.log('Representante:  maria@cosmeticos.com / rep123');
  console.log('Representante:  joao@cosmeticos.com / rep123');
  console.log('Representante:  ana@cosmeticos.com / rep123');
}

seed().catch(console.error);
