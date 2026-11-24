export const STATUSES = [
  { value: 'orcamento', label: 'Orçamento', cls: 'bg-zinc-700/60 text-zinc-100 border-zinc-500' },
  { value: 'fila', label: 'Na Fila', cls: 'bg-sky-500/15 text-sky-300 border-sky-500/60' },
  { value: 'imprimindo', label: 'Imprimindo', cls: 'bg-violet-500/15 text-violet-300 border-violet-500/60' },
  { value: 'pos', label: 'Pós-processamento', cls: 'bg-orange-500/15 text-orange-300 border-orange-500/60' },
  { value: 'entregue', label: 'Pronto / Entregue', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/60' },
  { value: 'cancelado', label: 'Cancelado', cls: 'bg-red-500/10 text-red-300/80 border-red-500/40' },
];
export const STATUS_MAP = Object.fromEntries(STATUSES.map((s) => [s.value, s]));

export const PAYMENTS = [
  { value: 'pendente', label: 'Pendente', cls: 'bg-red-500/15 text-red-300 border-red-500/60' },
  { value: 'sinal', label: 'Sinal 50%', cls: 'bg-amber-500/15 text-amber-300 border-amber-500/60' },
  { value: 'pago', label: 'Pago', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/60' },
];
export const PAYMENT_MAP = Object.fromEntries(PAYMENTS.map((s) => [s.value, s]));

export const CLIENT_TYPES = {
  balcao: { label: 'Balcão', cls: 'bg-zinc-700 text-zinc-100' },
  interno: { label: 'Interno', cls: 'bg-indigo-500/25 text-indigo-200' },
  cliente: { label: 'Cliente', cls: 'bg-teal-500/20 text-teal-200' },
};
