const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', '..', 'data', 'cosmetics.db');

let db = null;
let SQL = null;

// Wrapper to provide better-sqlite3-like API over sql.js
class PreparedStatement {
  constructor(database, sql) {
    this.database = database;
    this.sql = sql;
  }

  run(...params) {
    this.database.run(this.sql, params);
    const lastId = this.database.exec('SELECT last_insert_rowid() as id')[0];
    const changes = this.database.getRowsModified();
    saveDb();
    return {
      lastInsertRowid: lastId ? lastId.values[0][0] : 0,
      changes,
    };
  }

  get(...params) {
    const stmt = this.database.prepare(this.sql);
    stmt.bind(params);
    if (stmt.step()) {
      const cols = stmt.getColumnNames();
      const vals = stmt.get();
      stmt.free();
      const row = {};
      cols.forEach((col, i) => { row[col] = vals[i]; });
      return row;
    }
    stmt.free();
    return undefined;
  }

  all(...params) {
    const results = [];
    const stmt = this.database.prepare(this.sql);
    stmt.bind(params);
    while (stmt.step()) {
      const cols = stmt.getColumnNames();
      const vals = stmt.get();
      const row = {};
      cols.forEach((col, i) => { row[col] = vals[i]; });
      results.push(row);
    }
    stmt.free();
    return results;
  }
}

class DatabaseWrapper {
  constructor(sqlDb) {
    this.db = sqlDb;
  }

  prepare(sql) {
    return new PreparedStatement(this.db, sql);
  }

  exec(sql) {
    this.db.run(sql);
    saveDb();
  }

  transaction(fn) {
    return (...args) => {
      this.db.run('BEGIN TRANSACTION');
      try {
        const result = fn(...args);
        this.db.run('COMMIT');
        saveDb();
        return result;
      } catch (err) {
        this.db.run('ROLLBACK');
        throw err;
      }
    };
  }
}

function saveDb() {
  if (db && db.db) {
    const data = db.db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

async function initDb() {
  if (db) return db;

  SQL = await initSqlJs();

  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  let sqlDb;
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    sqlDb = new SQL.Database(fileBuffer);
  } else {
    sqlDb = new SQL.Database();
  }

  sqlDb.run('PRAGMA foreign_keys = ON');
  db = new DatabaseWrapper(sqlDb);
  initializeDatabase(db);
  return db;
}

function getDb() {
  if (!db) {
    throw new Error('Database not initialized. Call initDb() first.');
  }
  return db;
}

function initializeDatabase(db) {
  db.db.run(`
    CREATE TABLE IF NOT EXISTS brands (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      logo_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'representative')),
      phone TEXT,
      cpf TEXT,
      brand_id INTEGER,
      commission_rate REAL DEFAULT 5.0,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (brand_id) REFERENCES brands(id)
    )
  `);
  db.db.run(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bling_id TEXT,
      name TEXT NOT NULL,
      trade_name TEXT,
      cnpj_cpf TEXT,
      email TEXT,
      phone TEXT,
      address TEXT,
      city TEXT,
      state TEXT,
      zip_code TEXT,
      neighborhood TEXT,
      synced_with_bling INTEGER DEFAULT 0,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);
  db.db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bling_order_id TEXT,
      brand_id INTEGER NOT NULL,
      representative_id INTEGER NOT NULL,
      customer_id INTEGER NOT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'sent_to_bling', 'approved', 'invoiced', 'shipped', 'delivered', 'cancelled')),
      subtotal REAL NOT NULL DEFAULT 0,
      discount REAL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0,
      notes TEXT,
      price_table_id TEXT,
      price_table_name TEXT,
      payment_condition TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (brand_id) REFERENCES brands(id),
      FOREIGN KEY (representative_id) REFERENCES users(id),
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    )
  `);
  db.db.run(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      bling_product_id TEXT,
      product_name TEXT NOT NULL,
      product_code TEXT,
      quantity REAL NOT NULL,
      unit_price REAL NOT NULL,
      total_price REAL NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    )
  `);
  db.db.run(`
    CREATE TABLE IF NOT EXISTS commissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      representative_id INTEGER NOT NULL,
      order_total REAL NOT NULL,
      commission_rate REAL NOT NULL,
      commission_value REAL NOT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'scheduled', 'paid')),
      payment_date DATE,
      paid_at DATETIME,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (representative_id) REFERENCES users(id)
    )
  `);
  db.db.run(`
    CREATE TABLE IF NOT EXISTS bling_tokens (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      access_token TEXT NOT NULL,
      refresh_token TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.db.run("INSERT OR IGNORE INTO brands (name, slug) VALUES ('White Bull Cosméticos', 'whitebull')");
  db.db.run("INSERT OR IGNORE INTO brands (name, slug) VALUES ('Kings Cosméticos', 'kings')");
  saveDb();
}

module.exports = { getDb, initDb };
