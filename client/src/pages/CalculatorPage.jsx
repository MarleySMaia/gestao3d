import { useEffect, useState } from 'react';
import { Calculator as CalcIcon, ClipboardCopy, Eraser, FilePlus2 } from 'lucide-react';
import Calculator from '../components/Calculator';
import { useToast } from '../components/ui';
import { calculate, emptyCalc } from '../lib/calc';
import { duration, money, number, parseNum } from '../lib/format';
import { useData } from '../lib/store';

export default function CalculatorPage({ onCreateOrder }) {
  const { settings, filaments } = useData();
  const toast = useToast();
  const [calc, setCalc] = useState(() => emptyCalc(settings, filaments));
  const [title, setTitle] = useState('');

  // preenche o filamento padrão quando a lista chega
  useEffect(() => {
    if (!calc.filament_id && filaments.length) setCalc((c) => ({ ...c, filament_id: filaments[0].id }));
  }, [filaments, calc.filament_id]);

  const reset = () => { setCalc(emptyCalc(settings, filaments)); setTitle(''); };

  const copyQuote = async () => {
    const r = calculate(calc, settings, filaments);
    const mins = Math.round(parseNum(calc.hours) * 60 + parseNum(calc.minutes));
    const text = [
      `Orçamento impressão 3D${title ? ` — ${title}` : ''}`,
      `Material: ${r.filament?.name || '-'} • ${number(r.weight)}g • ${duration(mins) || '-'}`,
      r.qty > 1 ? `Quantidade: ${r.qty} un (${money(r.unitPrice)} cada)` : null,
      `Valor: ${money(r.total)}`,
    ].filter(Boolean).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      toast('Orçamento copiado — cole no WhatsApp');
    } catch {
      toast('Não foi possível copiar', 'error');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-black text-white sm:text-2xl"><CalcIcon className="text-amber-400" /> Calculadora avulsa</h1>
          <p className="text-sm text-zinc-400">Faça um orçamento rápido. Os custos base vêm da aba Configurações.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-ghost" onClick={reset}><Eraser size={16} /> Limpar</button>
          <button className="btn btn-ghost" onClick={copyQuote}><ClipboardCopy size={16} /> Copiar orçamento</button>
        </div>
      </div>
      <div className="card p-4 sm:p-5">
        <div className="mb-4">
          <span className="label">Nome da peça (opcional)</span>
          <input className="input" placeholder="Ex.: Vaso geométrico 15cm" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <Calculator
          value={calc}
          onChange={setCalc}
          applyLabel="Criar pedido com este valor"
          onApply={(r) => onCreateOrder({ title, calc, total_price: Math.round(r.total * 100) / 100 })}
        />
      </div>
      <p className="flex items-center gap-2 text-xs text-zinc-500"><FilePlus2 size={14} /> “Criar pedido” abre o formulário de pedido já preenchido com estes dados.</p>
    </div>
  );
}
