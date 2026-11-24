import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import db, { DEFAULT_SETTINGS } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS = path.join(__dirname, 'uploads');
const CLIENT_DIST = path.join(__dirname, '..', 'client', 'dist');
const PORT = process.env.PORT || 3001;

fs.mkdirSync(UPLOADS, { recursive: true });

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use('/uploads', express.static(UPLOADS, { maxAge: '7d' }));

// ---------- helpers ----------
const today = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
const num = (v, def = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};
const round2 = (n) => Math.round(n * 100) / 100;
const STATUSES = ['orcamento', 'fila', 'imprimindo', 'pos', 'entregue', 'cancelado'];
const PAYMENTS = ['pendente', 'sinal', 'pago'];
const CLIENT_TYPES = ['balcao', 'interno', 'cliente'];

const wrap = (fn) => (req, res) => {
  try {
    fn(req, res);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || 'Erro inesperado' });
  }
};

function getSettings() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const out = { ...DEFAULT_SETTINGS };
  for (const r of rows) out[r.key] = num(r.value, DEFAULT_SETTINGS[r.key]);
  return out;
}

function removeImage(filename) {
  if (!filename) return;
  const safe = path.basename(filename);
  const full = path.join(UPLOADS, safe);
  fs.promises.unlink(full).catch(() => {});
}

/** Ajusta a tabela de pagamentos para refletir o status (pendente / sinal / pago). */
function syncPayments(orderId) {
  const order = db.prepare('SELECT total_price, payment_status FROM orders WHERE id = ?').get(orderId);
  if (!order) return;
  const { deposit_pct } = getSettings();
  const target =
    order.payment_status === 'pago'
      ? order.total_price
      : order.payment_status === 'sinal'
        ? round2((order.total_price * deposit_pct) / 100)
        : 0;
  const current = db.prepare('SELECT COALESCE(SUM(amount),0) AS s FROM payments WHERE order_id = ?').get(orderId).s;
  const diff = round2(target - current);
  if (Math.abs(diff) < 0.005) return;
  if (diff > 0) {
    db.prepare('INSERT INTO payments (order_id, amount, paid_at) VALUES (?, ?, ?)').run(orderId, diff, today());
  } else {
    db.prepare('DELETE FROM payments WHERE order_id = ?').run(orderId);
    if (target > 0) db.prepare('INSERT INTO payments (order_id, amount, paid_at) VALUES (?, ?, ?)').run(orderId, target, today());
  }
}

const ORDER_SELECT = `
  SELECT o.*, c.name AS client_name, c.phone AS client_phone,
         COALESCE((SELECT SUM(amount) FROM payments p WHERE p.order_id = o.id), 0) AS amount_paid
  FROM orders o
  LEFT JOIN clients c ON c.id = o.client_id
`;

function hydrate(o) {
  if (!o) return o;
  let calc = {};
  try { calc = JSON.parse(o.calc_json || '{}'); } catch { /* ignore */ }
  const { calc_json, ...rest } = o;
  return { ...rest, calc };
}

function normalizeOrder(body) {
  const title = String(body.title || '').trim();
  if (!title) throw new Error('Informe o nome do pedido/peça.');
  const client_type = CLIENT_TYPES.includes(body.client_type) ? body.client_type : 'balcao';
  const client_id = client_type === 'cliente' && body.client_id ? num(body.client_id) : null;
  if (client_type === 'cliente' && !client_id) throw new Error('Selecione ou cadastre um cliente.');
  return {
    title,
    client_type,
    client_id,
    filament_id: body.filament_id ? num(body.filament_id) : null,
    filament_label: String(body.filament_label || ''),
    weight_g: num(body.weight_g),
    print_minutes: Math.round(num(body.print_minutes)),
    quantity: Math.max(1, Math.round(num(body.quantity, 1))),
    calc_json: JSON.stringify(body.calc || {}),
    total_price: round2(num(body.total_price)),
    status: STATUSES.includes(body.status) ? body.status : 'orcamento',
    payment_status: PAYMENTS.includes(body.payment_status) ? body.payment_status : 'pendente',
    order_date: body.order_date || today(),
    due_date: body.due_date || null,
    notes: String(body.notes || ''),
    image: body.image ? path.basename(String(body.image)) : null,
  };
}

// ---------- settings ----------
app.get('/api/settings', wrap((req, res) => res.json(getSettings())));

app.put('/api/settings', wrap((req, res) => {
  const up = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
  const tx = db.transaction((data) => {
    for (const key of Object.keys(DEFAULT_SETTINGS)) {
      if (data[key] !== undefined) up.run(key, String(num(data[key], DEFAULT_SETTINGS[key])));
    }
  });
  tx(req.body || {});
  res.json(getSettings());
}));

// ---------- filaments ----------
app.get('/api/filaments', wrap((req, res) => {
  res.json(db.prepare('SELECT * FROM filaments ORDER BY name COLLATE NOCASE').all());
}));

app.post('/api/filaments', wrap((req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) throw new Error('Informe o nome/tipo do filamento.');
  const info = db.prepare('INSERT INTO filaments (name, brand, price_kg) VALUES (?, ?, ?)')
    .run(name, String(req.body.brand || '').trim(), num(req.body.price_kg));
  res.status(201).json(db.prepare('SELECT * FROM filaments WHERE id = ?').get(info.lastInsertRowid));
}));

app.put('/api/filaments/:id', wrap((req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) throw new Error('Informe o nome/tipo do filamento.');
  db.prepare('UPDATE filaments SET name = ?, brand = ?, price_kg = ? WHERE id = ?')
    .run(name, String(req.body.brand || '').trim(), num(req.body.price_kg), req.params.id);
  res.json(db.prepare('SELECT * FROM filaments WHERE id = ?').get(req.params.id));
}));

app.delete('/api/filaments/:id', wrap((req, res) => {
  db.prepare('DELETE FROM filaments WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
}));

// ---------- clients ----------
app.get('/api/clients', wrap((req, res) => {
  res.json(db.prepare(`
    SELECT c.*, (SELECT COUNT(*) FROM orders o WHERE o.client_id = c.id) AS orders_count
    FROM clients c ORDER BY c.name COLLATE NOCASE
  `).all());
}));

app.post('/api/clients', wrap((req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) throw new Error('Informe o nome do cliente.');
  const info = db.prepare('INSERT INTO clients (name, phone, notes) VALUES (?, ?, ?)')
    .run(name, String(req.body.phone || '').trim(), String(req.body.notes || '').trim());
  res.status(201).json(db.prepare('SELECT * FROM clients WHERE id = ?').get(info.lastInsertRowid));
}));

app.put('/api/clients/:id', wrap((req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) throw new Error('Informe o nome do cliente.');
  db.prepare('UPDATE clients SET name = ?, phone = ?, notes = ? WHERE id = ?')
    .run(name, String(req.body.phone || '').trim(), String(req.body.notes || '').trim(), req.params.id);
  res.json(db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id));
}));

app.delete('/api/clients/:id', wrap((req, res) => {
  // pedidos do cliente viram "Balcão" para não perder histórico
  db.transaction(() => {
    db.prepare("UPDATE orders SET client_type = 'balcao', client_id = NULL WHERE client_id = ?").run(req.params.id);
    db.prepare('DELETE FROM clients WHERE id = ?').run(req.params.id);
  })();
  res.json({ ok: true });
}));

// ---------- orders ----------
app.get('/api/orders', wrap((req, res) => {
  const rows = db.prepare(`${ORDER_SELECT} ORDER BY
      CASE WHEN o.status IN ('entregue','cancelado') THEN 1 ELSE 0 END,
      COALESCE(o.due_date, '9999-12-31'), o.id DESC`).all();
  res.json(rows.map(hydrate));
}));

app.get('/api/orders/:id', wrap((req, res) => {
  const o = db.prepare(`${ORDER_SELECT} WHERE o.id = ?`).get(req.params.id);
  if (!o) return res.status(404).json({ error: 'Pedido não encontrado' });
  res.json(hydrate(o));
}));

app.post('/api/orders', wrap((req, res) => {
  const o = normalizeOrder(req.body);
  const info = db.prepare(`
    INSERT INTO orders (title, client_type, client_id, filament_id, filament_label, weight_g, print_minutes, quantity,
      calc_json, total_price, status, payment_status, order_date, due_date, notes, image)
    VALUES (@title, @client_type, @client_id, @filament_id, @filament_label, @weight_g, @print_minutes, @quantity,
      @calc_json, @total_price, @status, @payment_status, @order_date, @due_date, @notes, @image)
  `).run(o);
  syncPayments(info.lastInsertRowid);
  res.status(201).json(hydrate(db.prepare(`${ORDER_SELECT} WHERE o.id = ?`).get(info.lastInsertRowid)));
}));

app.put('/api/orders/:id', wrap((req, res) => {
  const prev = db.prepare('SELECT image FROM orders WHERE id = ?').get(req.params.id);
  if (!prev) return res.status(404).json({ error: 'Pedido não encontrado' });
  const o = normalizeOrder(req.body);
  db.prepare(`
    UPDATE orders SET title=@title, client_type=@client_type, client_id=@client_id, filament_id=@filament_id,
      filament_label=@filament_label, weight_g=@weight_g, print_minutes=@print_minutes, quantity=@quantity,
      calc_json=@calc_json, total_price=@total_price, status=@status, payment_status=@payment_status,
      order_date=@order_date, due_date=@due_date, notes=@notes, image=@image,
      updated_at=datetime('now','localtime')
    WHERE id=@id
  `).run({ ...o, id: req.params.id });
  if (prev.image && prev.image !== o.image) removeImage(prev.image);
  syncPayments(req.params.id);
  res.json(hydrate(db.prepare(`${ORDER_SELECT} WHERE o.id = ?`).get(req.params.id)));
}));

// atualização rápida (status de produção / pagamento) direto na tabela
app.patch('/api/orders/:id', wrap((req, res) => {
  const { status, payment_status } = req.body || {};
  if (status !== undefined) {
    if (!STATUSES.includes(status)) throw new Error('Status inválido');
    db.prepare("UPDATE orders SET status = ?, updated_at = datetime('now','localtime') WHERE id = ?").run(status, req.params.id);
  }
  if (payment_status !== undefined) {
    if (!PAYMENTS.includes(payment_status)) throw new Error('Situação de pagamento inválida');
    db.prepare("UPDATE orders SET payment_status = ?, updated_at = datetime('now','localtime') WHERE id = ?").run(payment_status, req.params.id);
    syncPayments(req.params.id);
  }
  const o = db.prepare(`${ORDER_SELECT} WHERE o.id = ?`).get(req.params.id);
  if (!o) return res.status(404).json({ error: 'Pedido não encontrado' });
  res.json(hydrate(o));
}));

app.delete('/api/orders/:id', wrap((req, res) => {
  const prev = db.prepare('SELECT image FROM orders WHERE id = ?').get(req.params.id);
  db.prepare('DELETE FROM orders WHERE id = ?').run(req.params.id);
  if (prev?.image) removeImage(prev.image);
  res.json({ ok: true });
}));

// ---------- dashboard ----------
app.get('/api/summary', wrap((req, res) => {
  const t = today();
  const month = t.slice(0, 7);
  const receivable = db.prepare(`
    SELECT COALESCE(SUM(o.total_price - COALESCE((SELECT SUM(amount) FROM payments p WHERE p.order_id = o.id),0)),0) AS v,
           COUNT(*) AS n
    FROM orders o
    WHERE o.status NOT IN ('cancelado','orcamento') AND o.payment_status <> 'pago'
  `).get();
  const paidMonth = db.prepare(`
    SELECT COALESCE(SUM(p.amount),0) AS v, COUNT(DISTINCT p.order_id) AS n
    FROM payments p JOIN orders o ON o.id = p.order_id
    WHERE substr(p.paid_at,1,7) = ? AND o.status <> 'cancelado'
  `).get(month);
  const production = db.prepare(`SELECT COUNT(*) AS n FROM orders WHERE status IN ('fila','imprimindo','pos')`).get();
  const late = db.prepare(`
    SELECT COUNT(*) AS n FROM orders
    WHERE due_date IS NOT NULL AND due_date < ? AND status NOT IN ('entregue','cancelado')
  `).get(t);
  res.json({
    receivable: round2(receivable.v), receivable_count: receivable.n,
    paid_month: round2(paidMonth.v), paid_month_count: paidMonth.n,
    production: production.n,
    late: late.n,
  });
}));

// ---------- upload (arquivo ou print colado) ----------
const ALLOWED = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp', 'image/gif': '.gif', 'image/bmp': '.bmp' };
const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOADS,
    filename: (req, file, cb) => {
      const ext = ALLOWED[file.mimetype] || '.png';
      cb(null, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`);
    },
  }),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(ALLOWED[file.mimetype] ? null : new Error('Formato de imagem não suportado'), !!ALLOWED[file.mimetype]),
});

app.post('/api/upload', (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'Nenhuma imagem enviada' });
    res.status(201).json({ filename: req.file.filename, url: `/uploads/${req.file.filename}` });
  });
});

// imagem enviada mas descartada (pedido não salvo)
app.delete('/api/upload/:filename', wrap((req, res) => {
  const name = path.basename(req.params.filename);
  const used = db.prepare('SELECT 1 FROM orders WHERE image = ?').get(name);
  if (!used) removeImage(name);
  res.json({ ok: true });
}));

// ---------- frontend compilado (npm start) ----------
if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  app.get(/^\/(?!api|uploads).*/, (req, res) => res.sendFile(path.join(CLIENT_DIST, 'index.html')));
}

app.listen(PORT, () => {
  console.log(`\n  API Gestão 3D rodando em http://localhost:${PORT}`);
  if (fs.existsSync(CLIENT_DIST)) console.log(`  Interface disponível em http://localhost:${PORT}\n`);
});
