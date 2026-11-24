import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlarmClock, Building2, CalendarClock, Check, CircleDollarSign, Filter, ImageOff, Pencil, Plus, Printer, Search, Store, User, Wallet, X,
} from 'lucide-react';
import { api } from '../lib/api';
import { CLIENT_TYPES, PAYMENTS, PAYMENT_MAP, STATUSES, STATUS_MAP } from '../lib/constants';
import { dateBR, daysUntil, duration, money, number } from '../lib/format';
import OrderModal from '../components/OrderModal';
import { Badge, ImageLightbox, Modal, useToast } from '../components/ui';

const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const isClosed = (o) => o.status === 'entregue' || o.status === 'cancelado';

function SummaryCard({ icon, label, value, sub, tone, onClick, active }) {
  const tones = {
    amber: 'border-amber-400/50 text-amber-300',
    emerald: 'border-emerald-400/50 text-emerald-300',
    violet: 'border-violet-400/50 text-violet-300',
    red: 'border-red-500/60 text-red-400',
  };
  return (
    <button type="button" onClick={onClick}
      className={`card flex items-center gap-4 border-l-4 p-4 text-left transition hover:bg-zinc-800/60 ${tones[tone]} ${active ? 'ring-2 ring-amber-400/60' : ''}`}>
      <div className="rounded-xl bg-zinc-950 p-3">{icon}</div>
      <div className="min-w-0">
        <div className="text-xs font-bold uppercase tracking-wide text-zinc-400">{label}</div>
        <div className="truncate font-mono text-2xl font-black text-white tabular-nums">{value}</div>
        {sub && <div className="text-xs text-zinc-500">{sub}</div>}
      </div>
    </button>
  );
}

function DueDate({ order }) {
  const d = daysUntil(order.due_date);
  let cls = 'text-zinc-300';
  let tag = null;
  if (order.due_date && !isClosed(order)) {
    if (d < 0) { cls = 'text-red-400 font-bold'; tag = <Badge className="border-red-500/60 bg-red-500/20 text-red-300">ATRASADO {-d}d</Badge>; }
    else if (d === 0) { cls = 'text-amber-300 font-bold'; tag = <Badge className="border-amber-500/60 bg-amber-500/20 text-amber-300">HOJE</Badge>; }
    else if (d <= 2) { cls = 'text-amber-300 font-semibold'; tag = <Badge className="border-amber-500/50 bg-amber-500/10 text-amber-300">{d === 1 ? 'AMANHÃ' : `em ${d}d`}</Badge>; }
  }
  return (
    <div className="text-sm leading-tight">
      <div className="text-xs text-zinc-500">Pedido {dateBR(order.order_date)}</div>
      <div className={`flex flex-wrap items-center gap-1.5 ${cls}`}>
        <CalendarClock size={13} /> {dateBR(order.due_date)} {tag}
      </div>
    </div>
  );
}

function ClientCell({ order }) {
  const t = CLIENT_TYPES[order.client_type] || CLIENT_TYPES.balcao;
  const name = order.client_type === 'cliente' ? order.client_name : order.client_type === 'interno' ? 'Uso interno' : 'Cliente avulso';
  const Icon = order.client_type === 'cliente' ? User : order.client_type === 'interno' ? Building2 : Store;
  return (
    <div className="min-w-0">
      <div className="truncate font-semibold text-zinc-100">{name || '—'}</div>
      <span className={`mt-0.5 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-bold ${t.cls}`}>
        <Icon size={11} /> {t.label}
      </span>
      {order.client_phone && <div className="truncate text-xs text-zinc-500">{order.client_phone}</div>}
    </div>
  );
}

function StatusSelect({ order, onChange }) {
  const s = STATUS_MAP[order.status];
  return (
    <select value={order.status} onChange={(e) => onChange(order, { status: e.target.value })}
      className={`w-full cursor-pointer rounded-lg border px-2 py-1.5 text-sm font-bold outline-none focus:ring-2 focus:ring-amber-400/40 ${s?.cls}`}>
      {STATUSES.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
    </select>
  );
}

function PaymentCell({ order, onChange }) {
  const p = PAYMENT_MAP[order.payment_status];
  const remaining = order.total_price - order.amount_paid;
  return (
    <div className="space-y-1">
      <div className="font-mono text-lg font-black text-white tabular-nums">{money(order.total_price)}</div>
      <div className="flex items-center gap-1.5">
        <select value={order.payment_status} onChange={(e) => onChange(order, { payment_status: e.target.value })}
          className={`cursor-pointer rounded-md border px-1.5 py-0.5 text-xs font-bold outline-none ${p?.cls}`}>
          {PAYMENTS.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
        </select>
        {order.payment_status !== 'pago' && order.total_price > 0 && (
          <button type="button" title="Marcar como pago" onClick={() => onChange(order, { payment_status: 'pago' })}
            className="flex items-center gap-1 rounded-md border border-emerald-500/60 bg-emerald-500/10 px-1.5 py-0.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500 hover:text-white">
            <Check size={12} /> Pago
          </button>
        )}
      </div>
      {order.payment_status === 'sinal' && (
        <div className="text-[11px] text-zinc-400">falta {money(remaining)}</div>
      )}
    </div>
  );
}

function Thumb({ order, onZoom, size = 'h-16 w-16' }) {
  return order.image ? (
    <img src={`/uploads/${order.image}`} alt="" loading="lazy" onClick={() => onZoom(`/uploads/${order.image}`)}
      className={`${size} shrink-0 cursor-zoom-in rounded-lg border border-zinc-700 bg-zinc-950 object-cover hover:border-amber-400`} />
  ) : (
    <div className={`${size} flex shrink-0 items-center justify-center rounded-lg border border-dashed border-zinc-800 text-zinc-700`}>
      <ImageOff size={18} />
    </div>
  );
}

const techSummary = (o) =>
  [o.filament_label, o.weight_g ? `${number(o.weight_g)}g` : '', duration(o.print_minutes), o.quantity > 1 ? `${o.quantity} un` : '']
    .filter(Boolean)
    .join(' • ');

export default function OrdersPage({ newOrderPrefill, clearPrefill }) {
  const toast = useToast();
  const [orders, setOrders] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('todos');
  const [payment, setPayment] = useState('todos');
  const [modal, setModal] = useState({ open: false, order: null });
  const [zoom, setZoom] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  const load = useCallback(async () => {
    try {
      const [o, s] = await Promise.all([api.get('/api/orders'), api.get('/api/summary')]);
      setOrders(o);
      setSummary(s);
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  // pedido criado a partir da calculadora avulsa
  useEffect(() => {
    if (newOrderPrefill) {
      setModal({ open: true, order: newOrderPrefill });
      clearPrefill();
    }
  }, [newOrderPrefill, clearPrefill]);

  // atalho: N = novo pedido
  useEffect(() => {
    const onKey = (e) => {
      if (e.key.toLowerCase() !== 'n' || e.ctrlKey || e.metaKey || e.altKey) return;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName) || modal.open) return;
      e.preventDefault();
      setModal({ open: true, order: null });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modal.open]);

  const quickUpdate = async (order, patch) => {
    setOrders((list) => list.map((o) => (o.id === order.id ? { ...o, ...patch } : o)));
    try {
      const updated = await api.patch(`/api/orders/${order.id}`, patch);
      setOrders((list) => list.map((o) => (o.id === order.id ? updated : o)));
      api.get('/api/summary').then(setSummary);
      if (patch.payment_status === 'pago') toast(`#${order.id} marcado como pago`);
    } catch (e) {
      toast(e.message, 'error');
      load();
    }
  };

  const doDelete = async () => {
    const o = confirmDel;
    setConfirmDel(null);
    try {
      await api.del(`/api/orders/${o.id}`);
      toast('Pedido excluído');
      setModal({ open: false, order: null });
      load();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const filtered = useMemo(() => {
    const nq = norm(q.trim());
    return orders.filter((o) => {
      if (status === 'abertos' && isClosed(o)) return false;
      if (status === 'producao' && !['fila', 'imprimindo', 'pos'].includes(o.status)) return false;
      if (status === 'atrasados' && !(o.due_date && daysUntil(o.due_date) < 0 && !isClosed(o))) return false;
      if (!['todos', 'abertos', 'producao', 'atrasados'].includes(status) && o.status !== status) return false;
      if (payment === 'areceber' && (o.payment_status === 'pago' || ['cancelado', 'orcamento'].includes(o.status))) return false;
      if (!['todos', 'areceber'].includes(payment) && o.payment_status !== payment) return false;
      if (nq) {
        const hay = norm(`${o.title} ${o.client_name || ''} ${o.client_type === 'interno' ? 'interno' : ''} ${o.client_type === 'balcao' ? 'balcao avulso' : ''} ${o.notes} #${o.id}`);
        if (!hay.includes(nq)) return false;
      }
      return true;
    });
  }, [orders, q, status, payment]);

  const hasFilter = q || status !== 'todos' || payment !== 'todos';

  return (
    <div className="space-y-5">
      {/* cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard tone="amber" icon={<Wallet className="text-amber-300" />} label="Total a receber"
          value={money(summary?.receivable)} sub={`${summary?.receivable_count ?? 0} pedido(s) pendente(s)`}
          active={payment === 'areceber'} onClick={() => { setPayment(payment === 'areceber' ? 'todos' : 'areceber'); setStatus('todos'); }} />
        <SummaryCard tone="emerald" icon={<CircleDollarSign className="text-emerald-300" />} label="Pago no mês"
          value={money(summary?.paid_month)} sub={new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })} />
        <SummaryCard tone="violet" icon={<Printer className="text-violet-300" />} label="Em produção"
          value={summary?.production ?? 0} sub="na fila, imprimindo ou pós"
          active={status === 'producao'} onClick={() => { setStatus(status === 'producao' ? 'todos' : 'producao'); setPayment('todos'); }} />
        <SummaryCard tone="red" icon={<AlarmClock className="text-red-400" />} label="Atrasados"
          value={summary?.late ?? 0} sub="previsão vencida"
          active={status === 'atrasados'} onClick={() => { setStatus(status === 'atrasados' ? 'todos' : 'atrasados'); setPayment('todos'); }} />
      </div>

      {/* filtros */}
      <div className="card flex flex-col gap-3 p-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input className="input pl-10" placeholder="Buscar por cliente, peça ou nº do pedido…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Filter size={16} className="hidden text-zinc-500 lg:block" />
          <select className="input w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="todos">Todos os status</option>
            <option value="abertos">Em aberto (não entregues)</option>
            <option value="producao">Em produção</option>
            <option value="atrasados">Atrasados</option>
            <optgroup label="Status">
              {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </optgroup>
          </select>
          <select className="input w-auto" value={payment} onChange={(e) => setPayment(e.target.value)}>
            <option value="todos">Todo pagamento</option>
            <option value="areceber">A receber</option>
            {PAYMENTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          {hasFilter && (
            <button className="btn btn-ghost" onClick={() => { setQ(''); setStatus('todos'); setPayment('todos'); }}>
              <X size={16} /> Limpar
            </button>
          )}
          <button className="btn btn-primary" onClick={() => setModal({ open: true, order: null })} title="Atalho: N">
            <Plus size={18} /> Novo pedido
          </button>
        </div>
      </div>

      {/* tabela (desktop) */}
      <div className="card hidden overflow-hidden lg:block">
        <table className="w-full table-fixed">
          <thead className="border-b border-zinc-800 bg-zinc-950/60 text-left text-xs font-bold uppercase tracking-wide text-zinc-400">
            <tr>
              <th className="w-24 px-4 py-3">Foto</th>
              <th className="px-3 py-3">Pedido / Peça</th>
              <th className="w-48 px-3 py-3">Cliente</th>
              <th className="w-48 px-3 py-3">Datas</th>
              <th className="w-48 px-3 py-3">Produção</th>
              <th className="w-44 px-3 py-3">Financeiro</th>
              <th className="w-14 px-3 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/80">
            {filtered.map((o) => (
              <tr key={o.id} className={`align-middle transition hover:bg-zinc-800/30 ${o.status === 'cancelado' ? 'opacity-50' : ''}`}>
                <td className="px-4 py-3"><Thumb order={o} onZoom={setZoom} /></td>
                <td className="px-3 py-3">
                  <button className="block max-w-full text-left" onClick={() => setModal({ open: true, order: o })}>
                    <div className="truncate text-base font-bold text-white hover:text-amber-300">
                      <span className="mr-1.5 font-mono text-sm text-zinc-500">#{o.id}</span>{o.title}
                    </div>
                    <div className="truncate font-mono text-sm text-zinc-400">{techSummary(o) || '—'}</div>
                    {o.notes && <div className="truncate text-xs text-zinc-500">{o.notes}</div>}
                  </button>
                </td>
                <td className="px-3 py-3"><ClientCell order={o} /></td>
                <td className="px-3 py-3"><DueDate order={o} /></td>
                <td className="px-3 py-3"><StatusSelect order={o} onChange={quickUpdate} /></td>
                <td className="px-3 py-3"><PaymentCell order={o} onChange={quickUpdate} /></td>
                <td className="px-3 py-3">
                  <button className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-amber-300" title="Editar"
                    onClick={() => setModal({ open: true, order: o })}>
                    <Pencil size={17} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && <EmptyState loading={loading} hasFilter={hasFilter} onNew={() => setModal({ open: true, order: null })} />}
      </div>

      {/* cards (mobile/tablet) */}
      <div className="space-y-3 lg:hidden">
        {filtered.map((o) => (
          <div key={o.id} className={`card p-3 ${o.status === 'cancelado' ? 'opacity-50' : ''}`}>
            <div className="flex gap-3">
              <Thumb order={o} onZoom={setZoom} size="h-20 w-20" />
              <button className="min-w-0 flex-1 text-left" onClick={() => setModal({ open: true, order: o })}>
                <div className="font-bold text-white"><span className="mr-1 font-mono text-sm text-zinc-500">#{o.id}</span>{o.title}</div>
                <div className="font-mono text-xs text-zinc-400">{techSummary(o) || '—'}</div>
                <div className="mt-1"><ClientCell order={o} /></div>
              </button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <DueDate order={o} />
              <PaymentCell order={o} onChange={quickUpdate} />
              <div className="col-span-2"><StatusSelect order={o} onChange={quickUpdate} /></div>
            </div>
          </div>
        ))}
        {!filtered.length && (
          <div className="card"><EmptyState loading={loading} hasFilter={hasFilter} onNew={() => setModal({ open: true, order: null })} /></div>
        )}
      </div>

      <OrderModal
        open={modal.open}
        order={modal.order}
        onClose={() => setModal({ open: false, order: null })}
        onSaved={() => { setModal({ open: false, order: null }); load(); }}
        onDelete={(o) => setConfirmDel(o)}
      />
      <ImageLightbox src={zoom} onClose={() => setZoom(null)} />
      <Modal open={!!confirmDel} onClose={() => setConfirmDel(null)} size="sm" title="Excluir pedido?"
        footer={<>
          <button className="btn btn-ghost" onClick={() => setConfirmDel(null)}>Cancelar</button>
          <button className="btn btn-danger" onClick={doDelete}>Excluir definitivamente</button>
        </>}>
        <p className="text-zinc-300">O pedido <b className="text-white">#{confirmDel?.id} — {confirmDel?.title}</b> e sua imagem serão removidos. Esta ação não pode ser desfeita.</p>
      </Modal>
    </div>
  );
}

function EmptyState({ loading, hasFilter, onNew }) {
  if (loading) return <div className="p-10 text-center text-zinc-500">Carregando…</div>;
  return (
    <div className="flex flex-col items-center gap-3 p-10 text-center">
      <Printer size={40} className="text-zinc-700" />
      <div className="text-zinc-400">{hasFilter ? 'Nenhum pedido encontrado com esses filtros.' : 'Nenhum pedido cadastrado ainda.'}</div>
      {!hasFilter && <button className="btn btn-primary" onClick={onNew}><Plus size={18} /> Criar primeiro pedido</button>}
    </div>
  );
}
