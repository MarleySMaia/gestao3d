import { parseNum } from './format';

/**
 * Calcula o preço sugerido de uma impressão 3D (valores por unidade e total).
 */
export function calculate(input, settings, filaments) {
  const fil = filaments.find((f) => String(f.id) === String(input.filament_id));
  const priceKg = fil ? Number(fil.price_kg) : 0;
  const qty = Math.max(1, Math.round(parseNum(input.quantity) || 1));
  const weight = parseNum(input.weight_g);
  const hours = parseNum(input.hours) + parseNum(input.minutes) / 60;
  const extras = parseNum(input.extras);
  const labor =
    input.labor_mode === 'tempo'
      ? (parseNum(input.labor_minutes) / 60) * parseNum(settings.labor_hour)
      : parseNum(input.labor_value);
  const failPct = parseNum(input.failure_pct) / 100;
  const profitPct = parseNum(input.profit_pct) / 100;
  const feePct = Math.min(parseNum(input.fee_pct) / 100, 0.99);

  const material = (priceKg / 1000) * weight;
  const energy = (parseNum(settings.printer_watts) / 1000) * hours * parseNum(settings.energy_kwh);
  const depreciation = hours * parseNum(settings.machine_hour);
  const base = material + energy + depreciation + extras + labor;
  const withFailure = base * (1 + failPct);
  const withProfit = withFailure * (1 + profitPct);
  const unitPrice = withProfit / (1 - feePct);

  return {
    filament: fil,
    priceKg,
    qty,
    weight,
    hours,
    material,
    energy,
    depreciation,
    extras,
    labor,
    base,
    failureAmount: withFailure - base,
    withFailure,
    profitAmount: withProfit - withFailure,
    feeAmount: unitPrice - withProfit,
    unitPrice,
    total: unitPrice * qty,
    totalCost: withFailure * qty,
    totalProfit: (withProfit - withFailure) * qty,
  };
}

export const emptyCalc = (settings = {}, filaments = []) => ({
  filament_id: filaments[0]?.id ?? '',
  weight_g: '',
  hours: '',
  minutes: '',
  quantity: 1,
  extras: '',
  labor_mode: 'valor',
  labor_value: '',
  labor_minutes: '',
  failure_pct: settings.failure_pct ?? 10,
  profit_pct: settings.profit_pct ?? 100,
  fee_pct: settings.fee_pct ?? 0,
});
