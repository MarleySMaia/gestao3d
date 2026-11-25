import { useMemo } from 'react';
import { CheckCheck, Clock, Package, Percent, Wrench, Zap, Cog, Weight, Layers, RotateCcw } from 'lucide-react';
import { calculate } from '../lib/calc';
import { money, number } from '../lib/format';
import { useData } from '../lib/store';
import { Field, NumInput, Segmented } from './ui';

/** escolhe se o valor vale para cada peça ou para o pedido todo */
function ScopeToggle({ value, onChange }) {
  return (
    <Segmented
      size="sm"
      value={value === 'pedido' ? 'pedido' : 'peca'}
      onChange={onChange}
      options={[{ value: 'peca', label: 'Por peça' }, { value: 'pedido', label: 'Pedido todo' }]}
    />
  );
}

/** explica, com números, como o valor entra no cálculo */
function ScopeHint({ scope, informed, qty, fallback }) {
  let text = fallback;
  if (informed > 0 && qty > 1) {
    text = scope === 'pedido'
      ? `${money(informed)} uma vez só → ${money(informed / qty)} por peça`
      : `${money(informed)} × ${qty} peças = ${money(informed * qty)}`;
  }
  return <span className="mt-1 block text-xs text-zinc-500">{text}</span>;
}

function Row({ icon, label, formula, value, strong, accent }) {
  return (
    <div className={`flex items-start justify-between gap-3 py-2 ${strong ? '' : 'border-b border-zinc-800/80'}`}>
      <div className="min-w-0">
        <div className={`flex items-center gap-2 ${strong ? 'font-bold text-white' : 'text-zinc-200'}`}>
          {icon}
          {label}
        </div>
        {formula && <div className="mt-0.5 truncate font-mono text-[11px] text-zinc-500">{formula}</div>}
      </div>
      <div className={`whitespace-nowrap font-mono tabular-nums ${accent || (strong ? 'font-bold text-white' : 'text-zinc-100')}`}>
        {value}
      </div>
    </div>
  );
}

/**
 * Calculadora de custo/preço.
 * value: estado dos campos; onChange(novoEstado); onApply(resultado) opcional
 */
export default function Calculator({ value, onChange, onApply, applyLabel = 'Aplicar valor ao pedido' }) {
  const { settings, filaments } = useData();
  const r = useMemo(() => calculate(value, settings || {}, filaments), [value, settings, filaments]);
  const set = (k) => (v) => onChange({ ...value, [k]: v });
  const s = settings || {};

  const resetPcts = () =>
    onChange({ ...value, failure_pct: s.failure_pct, profit_pct: s.profit_pct, fee_pct: s.fee_pct });

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1.05fr]">
      {/* ENTRADAS */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Filamento" className="col-span-2 sm:col-span-1">
            <select className="input" value={value.filament_id ?? ''} onChange={(e) => set('filament_id')(e.target.value)}>
              <option value="">— selecione —</option>
              {filaments.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}{f.brand ? ` · ${f.brand}` : ''} — {money(f.price_kg)}/kg
                </option>
              ))}
            </select>
          </Field>
          <Field label="Peso (de 1 peça)" className="col-span-2 sm:col-span-1">
            <NumInput value={value.weight_g} onChange={set('weight_g')} suffix="g" placeholder="0" />
          </Field>
          <Field label="Tempo (de 1 peça)" className="col-span-2 sm:col-span-1">
            <div className="flex gap-2">
              <NumInput value={value.hours} onChange={set('hours')} suffix="h" placeholder="0" />
              <NumInput value={value.minutes} onChange={set('minutes')} suffix="min" placeholder="0" />
            </div>
          </Field>
          <Field label="Quantidade de peças" className="col-span-2 sm:col-span-1">
            <NumInput value={value.quantity} onChange={set('quantity')} suffix="un" placeholder="1" />
          </Field>
          <div className="col-span-2 sm:col-span-1">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="label mb-0">Custos extras</span>
              <ScopeToggle value={value.extras_scope} onChange={set('extras_scope')} />
            </div>
            <NumInput value={value.extras} onChange={set('extras')} prefix="R$" placeholder="0,00" />
            <ScopeHint scope={r.extrasScope} informed={r.extrasInformed} qty={r.qty}
              fallback="Argolas, ímãs, parafusos, tinta, embalagem…" />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="label mb-0">Mão de obra / pós</span>
              <ScopeToggle value={value.labor_scope} onChange={set('labor_scope')} />
            </div>
            <div className="flex gap-2">
              <Segmented
                size="sm"
                className="shrink-0 self-center"
                value={value.labor_mode || 'valor'}
                onChange={set('labor_mode')}
                options={[{ value: 'valor', label: 'R$' }, { value: 'tempo', label: 'min' }]}
              />
              {value.labor_mode === 'tempo' ? (
                <NumInput value={value.labor_minutes} onChange={set('labor_minutes')} suffix="min" placeholder="0" className="flex-1" />
              ) : (
                <NumInput value={value.labor_value} onChange={set('labor_value')} prefix="R$" placeholder="0,00" className="flex-1" />
              )}
            </div>
            <ScopeHint scope={r.laborScope} informed={r.laborInformed} qty={r.qty}
              fallback={value.labor_mode === 'tempo' ? `a ${money(s.labor_hour)}/h (Configurações)` : 'Lixar, pintar, montar, remover suporte…'} />
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="label mb-0">Percentuais deste cálculo</span>
            <button type="button" onClick={resetPcts} className="flex items-center gap-1 text-xs text-zinc-400 hover:text-amber-300">
              <RotateCcw size={12} /> padrão
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Falha">
              <NumInput value={value.failure_pct} onChange={set('failure_pct')} suffix="%" />
            </Field>
            <Field label="Lucro">
              <NumInput value={value.profit_pct} onChange={set('profit_pct')} suffix="%" />
            </Field>
            <Field label="Taxa">
              <NumInput value={value.fee_pct} onChange={set('fee_pct')} suffix="%" />
            </Field>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {[50, 100, 150, 200, 300].map((p) => (
              <button key={p} type="button" onClick={() => set('profit_pct')(p)}
                className={`rounded-md border px-2 py-0.5 text-xs font-semibold ${
                  Number(value.profit_pct) === p ? 'border-amber-400 bg-amber-400/15 text-amber-300' : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'
                }`}>
                lucro {p}%
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* RESUMO */}
      <div className="flex flex-col rounded-xl border border-zinc-800 bg-zinc-950 p-4">
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">Resumo por peça</div>
        <div className="text-sm">
          <Row icon={<Weight size={15} className="text-sky-400" />} label="Material"
            formula={`${money(r.priceKg)}/kg ÷ 1000 × ${number(r.weight)} g`} value={money(r.material)} />
          <Row icon={<Zap size={15} className="text-yellow-400" />} label="Energia"
            formula={`${number(s.printer_watts)} W ÷ 1000 × ${number(r.hours)} h × ${money(s.energy_kwh)}/kWh`} value={money(r.energy)} />
          <Row icon={<Cog size={15} className="text-zinc-400" />} label="Depreciação / manutenção"
            formula={`${number(r.hours)} h × ${money(s.machine_hour)}/h`} value={money(r.depreciation)} />
          <Row icon={<Package size={15} className="text-pink-400" />} label="Extras"
            formula={r.extrasScope === 'pedido' && r.extrasInformed ? `${money(r.extrasInformed)} do pedido ÷ ${r.qty} peças` : null}
            value={money(r.extras)} />
          <Row icon={<Wrench size={15} className="text-orange-400" />} label="Mão de obra"
            formula={r.laborScope === 'pedido' && r.laborInformed ? `${money(r.laborInformed)} do pedido ÷ ${r.qty} peças` : null}
            value={money(r.labor)} />
          <Row label="Custo base" value={money(r.base)} strong />
          <Row icon={<Layers size={15} className="text-red-400" />} label={`+ Margem de falha (${number(value.failure_pct)}%)`}
            formula="custo base × (1 + % falha)" value={money(r.failureAmount)} />
          <Row label="Custo com falha" value={money(r.withFailure)} strong />
          <Row icon={<Percent size={15} className="text-emerald-400" />} label={`+ Lucro (${number(value.profit_pct)}%)`}
            value={money(r.profitAmount)} accent="text-emerald-300" />
          {Number(value.fee_pct) > 0 && (
            <Row icon={<Percent size={15} className="text-violet-400" />} label={`+ Taxa maquininha (${number(value.fee_pct)}%)`}
              formula="÷ (1 − % taxa)" value={money(r.feeAmount)} />
          )}
        </div>

        <div className="mt-auto pt-4">
          <div className="rounded-xl border-2 border-amber-400/70 bg-amber-400/10 p-4">
            <div className="flex items-end justify-between gap-2">
              <div>
                <div className="text-xs font-bold uppercase tracking-wide text-amber-300">Preço sugerido de venda</div>
                {r.qty > 1 && <div className="text-xs text-zinc-400">{money(r.unitPrice)} × {r.qty} un</div>}
              </div>
              <div className="font-mono text-3xl font-black tabular-nums text-amber-300">{money(r.total)}</div>
            </div>
            <div className="mt-2 flex justify-between text-xs text-zinc-400">
              <span>Custo total: <b className="text-zinc-200">{money(r.totalCost)}</b></span>
              <span>Lucro: <b className="text-emerald-300">{money(r.totalProfit)}</b></span>
            </div>
          </div>
          {onApply && (
            <button type="button" className="btn btn-primary mt-3 w-full py-3 text-base" onClick={() => onApply(r)} disabled={!r.total}>
              <CheckCheck size={18} /> {applyLabel}
            </button>
          )}
          <div className="mt-2 flex items-center gap-1 text-[11px] text-zinc-500">
            <Clock size={11} /> Preço = custo c/ falha × (1 + % lucro) ÷ (1 − % taxa)
          </div>
        </div>
      </div>
    </div>
  );
}
