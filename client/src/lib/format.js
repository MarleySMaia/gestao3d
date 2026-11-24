const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
export const money = (v) => brl.format(Number(v) || 0);
export const number = (v, d = 2) =>
  (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: d });

const pad = (n) => String(n).padStart(2, '0');
const toISO = (dt) => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;

/** 'AAAA-MM-DD' -> 'DD/MM/AAAA' */
export const dateBR = (iso) => {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
};

export const todayISO = () => toISO(new Date());

export const addDaysISO = (iso, days) => {
  const [y, m, d] = iso.split('-').map(Number);
  return toISO(new Date(y, m - 1, d + days));
};

/** dias entre hoje e a data (negativo = atrasado) */
export const daysUntil = (iso) => {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  const t = new Date();
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(t.getFullYear(), t.getMonth(), t.getDate())) / 86400000);
};

export const duration = (minutes) => {
  const m = Math.round(Number(minutes) || 0);
  if (!m) return '';
  const h = Math.floor(m / 60);
  const r = m % 60;
  return h ? `${h}h${r ? pad(r) + 'm' : ''}` : `${r}m`;
};

/** aceita "12,5", "1.234,56" ou "12.5" */
export const parseNum = (v) => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  let s = String(v ?? '').trim();
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
};
