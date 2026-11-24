import { useEffect, useMemo, useRef, useState } from 'react';
import { Calculator as CalcIcon, ChevronDown, Save, Trash2, Wand2 } from 'lucide-react';
import { api } from '../lib/api';
import { calculate, emptyCalc } from '../lib/calc';
import { addDaysISO, money, parseNum, todayISO } from '../lib/format';
import { PAYMENTS, STATUSES } from '../lib/constants';
import { useData } from '../lib/store';
import Calculator from './Calculator';
import ClientPicker from './ClientPicker';
import ImageField from './ImageField';
import { Field, ImageLightbox, Modal, NumInput, useToast } from './ui';

const toForm = (order, settings, filaments) => {
  const base = emptyCalc(settings, filaments);
  if (!order?.id) {
    return {
      title: order?.title || '',
      client_type: 'balcao',
      client_id: null,
      calc: { ...base, ...(order?.calc || {}) },
      total_price: order?.total_price ? String(order.total_price.toFixed(2)).replace('.', ',') : '',
      status: 'orcamento',
      payment_status: 'pendente',
      order_date: todayISO(),
      due_date: addDaysISO(todayISO(), 3),
      notes: '',
      image: null,
    };
  }
  return {
    title: order.title,
    client_type: order.client_type,
    client_id: order.client_id,
    calc: { ...base, ...order.calc, filament_id: order.calc?.filament_id ?? order.filament_id ?? base.filament_id },
    total_price: String(Number(order.total_price).toFixed(2)).replace('.', ','),
    status: order.status,
    payment_status: order.payment_status,
    order_date: order.order_date,
    due_date: order.due_date || '',
    notes: order.notes || '',
    image: order.image,
  };
};

export default function OrderModal({ open, order, onClose, onSaved, onDelete }) {
  const { settings, filaments } = useData();
  const toast = useToast();
  const [form, setForm] = useState(() => toForm(order, settings, filaments));
  const [showCalc, setShowCalc] = useState(true);
  const [saving, setSaving] = useState(false);
  const [zoom, setZoom] = useState(null);
  const uploads = useRef(new Set());
  const isEdit = !!order?.id;

  useEffect(() => {
    if (open) {
      setForm(toForm(order, settings, filaments));
      setShowCalc(!order?.id || !!order?.calc?.weight_g);
      uploads.current = new Set();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, order]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const result = useMemo(() => calculate(form.calc, settings || {}, filaments), [form.calc, settings, filaments]);

  const cleanupUploads = (keep) => {
    for (const f of uploads.current) if (f !== keep && f !== order?.image) api.del(`/api/upload/${f}`).catch(() => {});
    uploads.current = new Set();
  };

  const close = () => {
    cleanupUploads(null);
    onClose();
  };

  const applyCalc = (r) => {
    set({ total_price: r.total.toFixed(2).replace('.', ',') });
    toast(`Valor ${money(r.total)} aplicado ao pedido`);
  };

  const save = async (e) => {
    e?.preventDefault();
    if (!form.title.trim()) return toast('Informe o nome do pedido/peça', 'error');
    if (form.client_type === 'cliente' && !form.client_id) return toast('Selecione ou cadastre o cliente', 'error');
    setSaving(true);
    const c = form.calc;
    const payload = {
      ...form,
      filament_id: c.filament_id || null,
      filament_label: result.filament?.name || '',
      weight_g: parseNum(c.weight_g),
      print_minutes: Math.round(parseNum(c.hours) * 60 + parseNum(c.minutes)),
      quantity: result.qty,
      total_price: parseNum(form.total_price),
      calc: c,
    };
    try {
      const saved = isEdit ? await api.put(`/api/orders/${order.id}`, payload) : await api.post('/api/orders', payload);
      cleanupUploads(form.image);
      toast(isEdit ? 'Pedido atualizado' : 'Pedido criado');
      onSaved(saved);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const priceNum = parseNum(form.total_price);
  const diff = priceNum - result.total;

  return (
    <Modal
      open={open}
      onClose={close}
      size="xl"
      closeOnBackdrop={false}
      title={isEdit ? `Editar pedido #${order.id}` : 'Novo pedido'}
      footer={
        <>
          {isEdit && (
            <button type="button" className="btn btn-danger mr-auto" onClick={() => onDelete(order)}>
              <Trash2 size={16} /> Excluir
            </button>
          )}
          <button type="button" className="btn btn-ghost" onClick={close}>Cancelar</button>
          <button type="button" className="btn btn-primary px-6" onClick={save} disabled={saving}>
            <Save size={16} /> {saving ? 'Salvando…' : 'Salvar pedido'}
          </button>
        </>
      }
    >
      <form onSubmit={save} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-[280px_1fr]">
          {/* imagem */}
          <div>
            <span className="label">Foto / print do fatiador</span>
            <ImageField
              image={form.image}
              onChange={(image) => set({ image })}
              onUploaded={(f) => uploads.current.add(f)}
              onZoom={setZoom}
            />
          </div>

          {/* dados */}
          <div className="space-y-4">
            <Field label="Pedido / Peça *">
              <input className="input text-lg font-semibold" autoFocus={!isEdit} placeholder="Ex.: Suporte de headset, Chaveiro logo…"
                value={form.title} onChange={(e) => set({ title: e.target.value })} />
            </Field>
            <div>
              <span className="label">Cliente</span>
              <ClientPicker clientType={form.client_type} clientId={form.client_id} onChange={set} />
            </div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Field label="Data do pedido">
                <input type="date" className="input" value={form.order_date} onChange={(e) => set({ order_date: e.target.value })} />
              </Field>
              <Field label="Previsão de entrega">
                <input type="date" className="input" value={form.due_date} onChange={(e) => set({ due_date: e.target.value })} />
              </Field>
              <Field label="Status de produção">
                <select className="input" value={form.status} onChange={(e) => set({ status: e.target.value })}>
                  {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </Field>
              <Field label="Pagamento">
                <select className="input" value={form.payment_status} onChange={(e) => set({ payment_status: e.target.value })}>
                  {PAYMENTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Observações">
              <textarea className="input min-h-[64px]" rows={2} placeholder="Cor, acabamento, detalhes combinados…"
                value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
            </Field>
          </div>
        </div>

        {/* calculadora */}
        <div className="rounded-xl border border-zinc-800">
          <button type="button" onClick={() => setShowCalc((s) => !s)}
            className="flex w-full items-center justify-between rounded-t-xl px-4 py-3 text-left hover:bg-zinc-800/40">
            <span className="flex items-center gap-2 font-bold text-white">
              <CalcIcon size={18} className="text-amber-400" /> Calculadora de preço e dados técnicos
            </span>
            <span className="flex items-center gap-3 text-sm text-zinc-400">
              sugerido: <b className="font-mono text-amber-300">{money(result.total)}</b>
              <ChevronDown size={18} className={`transition ${showCalc ? 'rotate-180' : ''}`} />
            </span>
          </button>
          {showCalc && (
            <div className="border-t border-zinc-800 p-4">
              <Calculator value={form.calc} onChange={(calc) => set({ calc })} onApply={applyCalc} />
            </div>
          )}
        </div>

        {/* valor final */}
        <div className="flex flex-col gap-3 rounded-xl border-2 border-zinc-700 bg-zinc-950 p-4 sm:flex-row sm:items-end">
          <Field label="Valor final do pedido (editável)" className="sm:w-72">
            <NumInput value={form.total_price} onChange={(v) => set({ total_price: v })} prefix="R$"
              className="[&_input]:py-3 [&_input]:font-mono [&_input]:text-2xl [&_input]:font-black" placeholder="0,00" />
          </Field>
          <button type="button" className="btn btn-ghost py-3" onClick={() => applyCalc(result)} disabled={!result.total}>
            <Wand2 size={16} /> Usar sugerido ({money(result.total)})
          </button>
          <div className="text-sm text-zinc-400 sm:ml-auto sm:text-right">
            {priceNum > 0 && result.total > 0 && Math.abs(diff) >= 0.01 && (
              <div className={diff < 0 ? 'text-amber-300' : 'text-emerald-300'}>
                {diff < 0 ? 'Desconto de ' : 'Acréscimo de '}{money(Math.abs(diff))} sobre o sugerido
              </div>
            )}
            {priceNum > 0 && result.totalCost > 0 && (
              <div>Lucro estimado: <b className={priceNum - result.totalCost >= 0 ? 'text-emerald-300' : 'text-red-400'}>
                {money(priceNum - result.totalCost - priceNum * (parseNum(form.calc.fee_pct) / 100))}</b></div>
            )}
          </div>
        </div>
      </form>
      <ImageLightbox src={zoom} onClose={() => setZoom(null)} />
    </Modal>
  );
}
