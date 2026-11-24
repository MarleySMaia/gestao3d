import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DB_PATH = path.join(__dirname, 'database.sqlite');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS filaments (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  brand      TEXT DEFAULT '',
  price_kg   REAL NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS clients (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  phone      TEXT DEFAULT '',
  notes      TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS orders (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  title          TEXT NOT NULL,
  client_type    TEXT NOT NULL DEFAULT 'balcao',  -- balcao | interno | cliente
  client_id      INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  filament_id    INTEGER REFERENCES filaments(id) ON DELETE SET NULL,
  filament_label TEXT DEFAULT '',
  weight_g       REAL DEFAULT 0,
  print_minutes  INTEGER DEFAULT 0,
  quantity       INTEGER DEFAULT 1,
  calc_json      TEXT DEFAULT '{}',
  total_price    REAL NOT NULL DEFAULT 0,
  status         TEXT NOT NULL DEFAULT 'orcamento',
  payment_status TEXT NOT NULL DEFAULT 'pendente', -- pendente | sinal | pago
  order_date     TEXT NOT NULL,
  due_date       TEXT,
  notes          TEXT DEFAULT '',
  image          TEXT,
  created_at     TEXT DEFAULT (datetime('now','localtime')),
  updated_at     TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS payments (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  amount   REAL NOT NULL,
  paid_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
`);

export const DEFAULT_SETTINGS = {
  energy_kwh: 0.95,          // R$/kWh
  printer_watts: 150,        // W
  machine_hour: 1.5,         // R$/h depreciação/manutenção
  failure_pct: 10,           // %
  profit_pct: 100,           // %
  fee_pct: 0,                // % maquininha/marketplace
  labor_hour: 20,            // R$/h mão de obra (quando informada em tempo)
  deposit_pct: 50,           // % do sinal
};

const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) insertSetting.run(k, String(v));

const filamentCount = db.prepare('SELECT COUNT(*) AS n FROM filaments').get().n;
if (filamentCount === 0) {
  const ins = db.prepare('INSERT INTO filaments (name, brand, price_kg) VALUES (?, ?, ?)');
  ins.run('PLA', '', 110);
  ins.run('PETG', '', 130);
}

export default db;
