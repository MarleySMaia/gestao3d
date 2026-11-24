import { useEffect, useState } from 'react';
import { Check, Pencil, Plus, Save, Settings2, Disc3, Trash2, X, Zap, BadgePercent } from 'lucide-react';
import { api } from '../lib/api';
import { money, parseNum } from '../lib/format';
import { useData } from '../lib/store';
import { Field, NumInput, useToast } from '../components/ui';

const toStr = (v) => String(v ?? '').replace('.', ',');

function FilamentRow({ f, onSaved, onDelete }) {
  const [edit, setEdit] = useState(!f.id);
  const [v, setV] = useState({ name: f.name || '', brand: f.brand || '', price_kg: toStr(f.price_kg ?? '') });
  const toast = useToast();

  const save = async () => {
    if (!v.name.trim()) return toast('Informe o tipo do filamento', 'error');
    try {
      const body = { ...v, price_kg: parseNum(v.price_kg) };
      if (f.id) await api.put(`/api/filaments/${f.id}`, body);
      else await api.post('/api/filaments', body);
      setEdit(false);
      onSaved();
      toast('Filamento salvo');
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  if (!edit) {
    return (
      <tr className="border-b border-zinc-800/80">
        <td className="px-3 py-2.5 font-bold text-white">{f.name}</td>
        <td className="px-3 py-2.5 text-zinc-400">{f.brand || '—'}</td>
        <td className="px-3 py-2.5 text-right font-mono font-bold text-amber-300">{money(f.price_kg)}</td>
        <td className="px-3 py-2.5 text-right">
          <button className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-amber-300" onClick={() => setEdit(true)} title="Editar"><Pencil size={16} /></button>
          <button className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-red-400" onClick={() => onDelete(f)} title="Excluir"><Trash2 size={16} /></button>
        </td>
      </tr>
    );
  }
  const onKey = (e) => e.key === 'Enter' && save();
  return (
    <tr className="border-b border-zinc-800/80 bg-amber-400/5">
      <td className="px-2 py-2"><input className="input" placeholder="PLA, PETG, ABS, TPU…" value={v.name} autoFocus onKeyDown={onKey} onChange={(e) => setV({ ...v, name: e.target.value })} /></td>
      <td className="px-2 py-2"><input className="input" placeholder="Cor / marca" value={v.brand} onKeyDown={onKey} onChange={(e) => setV({ ...v, brand: e.target.value })} /></td>
      <td className="px-2 py-2"><NumInput prefix="R$" value={v.price_kg} onKeyDown={onKey} onChange={(x) => setV({ ...v, price_kg: x })} /></td>
      <td className="whitespace-nowrap px-2 py-2 text-right">
        <button className="rounded-lg p-1.5 text-emerald-300 hover:bg-zinc-800" onClick={save} title="Salvar"><Check size={18} /></button>
        <button className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800" onClick={() => (f.id ? setEdit(false) : onDelete(null))} title="Cancelar"><X size={18} /></button>
      </td>
    </tr>
  );
}

const FIELDS = {
  energy: [
    { key: 'energy_kwh', label: 'Tarifa de energia', prefix: 'R$', suffix: '/kWh', hint: 'Veja na conta de luz (com impostos)' },
    { key: 'printer_watts', label: 'Consumo médio da impressora', suffix: 'W', hint: 'Bambu A1 ~ 95W, P1S ~ 130W, Ender ~ 150W' },
    { key: 'machine_hour', label: 'Depreciação / manutenção', prefix: 'R$', suffix: '/h', hint: 'Bicos, correias, peças e desgaste' },
    { key: 'labor_hour', label: 'Valor da sua hora de trabalho', prefix: 'R$', suffix: '/h', hint: 'Usado quando a mão de obra é informada em tempo' },
  ],
  pricing: [
    { key: 'failure_pct', label: 'Taxa padrão de falha / perda', suffix: '%', hint: 'Impressões perdidas, purga, suportes' },
    { key: 'profit_pct', label: 'Margem de lucro padrão', suffix: '%', hint: '100% = dobro do custo' },
    { key: 'fee_pct', label: 'Taxa maquininha / marketplace', suffix: '%', hint: 'Ex.: Shopee ~ 20%, cartão ~ 4%' },
    { key: 'deposit_pct', label: 'Percentual do sinal', suffix: '%', hint: 'Valor considerado recebido em “Sinal”' },
  ],
};

export default function SettingsPage() {
  const { settings, setSettings, filaments, reloadFilaments } = useData();
  const toast = useToast();
  const [form, setForm] = useState({});
  const [adding, setAdding] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (settings) setForm(Object.fromEntries(Object.entries(settings).map(([k, v]) => [k, toStr(v)])));
  }, [settings]);

  const saveSettings = async () => {
    try {
      const body = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, parseNum(v)]));
      const s = await api.put('/api/settings', body);
      setSettings(s);
      setDirty(false);
      toast('Configurações salvas');
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const deleteFilament = async (f) => {
    if (!f) return setAdding(false);
    try {
      await api.del(`/api/filaments/${f.id}`);
      await reloadFilaments();
      toast('Filamento removido');
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const renderFields = (list) =>
    list.map((f) => (
      <Field key={f.key} label={f.label} hint={f.hint}>
        <NumInput prefix={f.prefix} suffix={f.suffix} value={form[f.key]} onChange={(v) => { setForm({ ...form, [f.key]: v }); setDirty(true); }} />
      </Field>
    ));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-white"><Settings2 className="text-amber-400" /> Configurações e custos base</h1>
          <p className="text-sm text-zinc-400">Estes valores alimentam a calculadora automaticamente.</p>
        </div>
      </div>

      {/* filamentos */}
      <section className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
          <h2 className="flex items-center gap-2 font-bold text-white"><Disc3 size={18} className="text-sky-400" /> Filamentos</h2>
          <button className="btn btn-ghost py-1.5" onClick={() => setAdding(true)} disabled={adding}><Plus size={16} /> Adicionar</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="text-left text-xs font-bold uppercase tracking-wide text-zinc-500">
              <tr className="border-b border-zinc-800">
                <th className="px-3 py-2">Nome / Tipo</th>
                <th className="px-3 py-2">Cor / Marca</th>
                <th className="w-44 px-3 py-2 text-right">Preço por kg</th>
                <th className="w-24 px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filaments.map((f) => <FilamentRow key={f.id} f={f} onSaved={reloadFilaments} onDelete={deleteFilament} />)}
              {adding && <FilamentRow f={{}} onSaved={() => { setAdding(false); reloadFilaments(); }} onDelete={deleteFilament} />}
            </tbody>
          </table>
          {!filaments.length && !adding && <div className="p-6 text-center text-zinc-500">Nenhum filamento cadastrado.</div>}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-4">
          <h2 className="mb-4 flex items-center gap-2 font-bold text-white"><Zap size={18} className="text-yellow-400" /> Energia e máquina</h2>
          <div className="grid gap-4 sm:grid-cols-2">{renderFields(FIELDS.energy)}</div>
        </section>
        <section className="card p-4">
          <h2 className="mb-4 flex items-center gap-2 font-bold text-white"><BadgePercent size={18} className="text-emerald-400" /> Regras de precificação</h2>
          <div className="grid gap-4 sm:grid-cols-2">{renderFields(FIELDS.pricing)}</div>
        </section>
      </div>

      <div className={`sticky bottom-4 flex justify-end transition ${dirty ? 'opacity-100' : 'pointer-events-none opacity-0'}`}>
        <button className="btn btn-primary px-6 py-3 text-base shadow-2xl shadow-amber-500/20" onClick={saveSettings}>
          <Save size={18} /> Salvar configurações
        </button>
      </div>
    </div>
  );
}
