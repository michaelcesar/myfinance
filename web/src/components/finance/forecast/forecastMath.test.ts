/**
 * Testes dos KPIs da previsão e dos atalhos de período.
 *
 * @module components/finance/forecast/forecastMath.test
 */
import { describe, expect, it } from 'vitest';
import type { Forecast, ForecastMonth } from '@/types/entities';
import { forecastKpis, periodRange, recurringAverages } from './forecastMath';

/**
 * Mês da previsão com valores padrão.
 *
 * @param month - Mês `YYYY-MM-01`
 * @param values - Campos a sobrescrever
 * @returns Mês completo
 */
function month(month: string, values: Partial<ForecastMonth> = {}): ForecastMonth {
  return { month, realized: false, incomeCents: 0, expenseCents: 0, resultCents: 0, yieldCents: 0, cashEndCents: 0, investmentsEndCents: 0, assetsEndCents: 0, netWorthEndCents: 0, ...values };
}

/** Previsão de três meses: começa com 100 mil, ganha 3.300 por mês, tem um carro de 68 mil. */
const forecast: Forecast = {
  from: '2026-11-01',
  to: '2027-01-01',
  currentMonth: '2026-11-01',
  cashTodayCents: 10_000_000,
  investmentsCents: 0,
  assetsCents: 6_800_000,
  months: [
    month('2026-11-01', { incomeCents: 380_000, expenseCents: 50_000, resultCents: 330_000, cashEndCents: 10_330_000, assetsEndCents: 6_800_000 }),
    month('2026-12-01', { incomeCents: 380_000, expenseCents: 600_000, resultCents: -220_000, cashEndCents: 10_110_000, assetsEndCents: 6_800_000 }),
    month('2027-01-01', { incomeCents: 380_000, expenseCents: 50_000, resultCents: 330_000, cashEndCents: 10_440_000, assetsEndCents: 6_800_000 }),
  ],
  rows: [],
  recurringIncomeCents: 380_000,
  recurringExpenseCents: 50_000,
};

describe('forecastKpis', () => {
  it('soma entradas, saídas e sobra, com margem e média', () => {
    const kpis = forecastKpis(forecast, { includeAssets: false });
    expect(kpis).toMatchObject({ incomeCents: 1_140_000, expenseCents: 700_000, resultCents: 440_000, averageResultCents: 146_667 });
    expect(kpis.marginRatio).toBeCloseTo(440_000 / 1_140_000, 6);
  });

  it('deixa os bens fora do patrimônio por padrão e soma quando ligado', () => {
    expect(forecastKpis(forecast, { includeAssets: false })).toMatchObject({ netWorthTodayCents: 10_000_000, netWorthEndCents: 10_440_000 });
    expect(forecastKpis(forecast, { includeAssets: true })).toMatchObject({ netWorthTodayCents: 16_800_000, netWorthEndCents: 17_240_000 });
  });

  it('diz se está crescendo pela variação do patrimônio no período', () => {
    const kpis = forecastKpis(forecast, { includeAssets: false });
    expect(kpis.netWorthChangeCents).toBe(440_000);
    expect(kpis.status).toBe('GROWING');
    const flat = forecastKpis({ ...forecast, months: forecast.months.map(item => ({ ...item, resultCents: 0, cashEndCents: 10_000_000 })) }, { includeAssets: false });
    expect(flat.status).toBe('STABLE');
    const losing = forecastKpis(
      { ...forecast, months: forecast.months.map((item, index) => ({ ...item, resultCents: -500_000, cashEndCents: 10_000_000 - 500_000 * (index + 1) })) },
      { includeAssets: false }
    );
    expect(losing.status).toBe('SHRINKING');
  });

  it('acha o mês mais apertado e o mês selecionado (padrão: o último)', () => {
    const kpis = forecastKpis(forecast, { includeAssets: false });
    expect(kpis.tightestMonth).toEqual({ month: '2026-12-01', cashEndCents: 10_110_000 });
    expect(kpis.selected).toEqual({ month: '2027-01-01', resultCents: 330_000, netWorthEndCents: 10_440_000 });
    expect(forecastKpis(forecast, { includeAssets: false, selectedMonth: '2026-12-01' }).selected?.resultCents).toBe(-220_000);
  });

  it('livro vazio não divide por zero', () => {
    const empty = forecastKpis({ ...forecast, cashTodayCents: 0, assetsCents: 0, months: [month('2026-11-01')] }, { includeAssets: false });
    expect(empty).toMatchObject({ marginRatio: null, netWorthChangeRatio: null, status: 'STABLE', resultCents: 0 });
  });
});

describe('realizado e previsto', () => {
  it('separa o que já aconteceu do que é estimativa', () => {
    const mixed = { ...forecast, months: [{ ...forecast.months[0], realized: true }, ...forecast.months.slice(1)] };
    const kpis = forecastKpis(mixed, { includeAssets: false });
    expect(kpis.realized).toEqual({ incomeCents: 380_000, expenseCents: 50_000, resultCents: 330_000 });
    expect(kpis.forecast).toEqual({ incomeCents: 760_000, expenseCents: 650_000, resultCents: 110_000 });
    expect(kpis.periodStartMonth).toBe('2026-11-01');
  });
});

describe('recurringAverages', () => {
  it('faz a média mensal dos recorrentes no período, mesmo que comecem depois do mês atual', () => {
    const withRows: Forecast = {
      ...forecast,
      rows: [
        {
          key: 'r1',
          recurrenceId: 'r1',
          description: 'Juscia',
          kind: 'INCOME',
          ledgerName: 'Bootcom',
          cells: { '2026-12-01': { amountCents: 380_000, paid: false, projected: false }, '2027-01-01': { amountCents: 380_000, paid: false, projected: true } },
        },
        { key: 'r2', recurrenceId: 'r2', description: 'Aluguel', kind: 'EXPENSE', ledgerName: 'Pessoal', cells: { '2026-12-01': { amountCents: 140_000, paid: false, projected: false } } },
        { key: 'other-income', recurrenceId: null, description: 'Outras receitas', kind: 'INCOME', ledgerName: null, cells: { '2026-11-01': { amountCents: 999_000, paid: true, projected: false } } },
      ],
    };
    expect(recurringAverages(withRows)).toEqual({ incomeCents: 253_333, expenseCents: 46_667 });
  });

  it('sem recorrentes, zero', () => {
    expect(recurringAverages(forecast)).toEqual({ incomeCents: 0, expenseCents: 0 });
  });
});

describe('periodRange', () => {
  it('monta cada atalho a partir do mês atual, atravessando o ano', () => {
    expect(periodRange('around', '2026-11')).toEqual({ from: '2025-12', to: '2027-11' });
    expect(periodRange('thisMonth', '2026-11')).toEqual({ from: '2026-11', to: '2026-11' });
    expect(periodRange('next3', '2026-11')).toEqual({ from: '2026-11', to: '2027-01' });
    expect(periodRange('next6', '2026-11')).toEqual({ from: '2026-11', to: '2027-04' });
    expect(periodRange('next12', '2026-11')).toEqual({ from: '2026-11', to: '2027-10' });
    expect(periodRange('last12', '2026-11')).toEqual({ from: '2025-12', to: '2026-11' });
    expect(periodRange('thisYear', '2026-11')).toEqual({ from: '2026-01', to: '2026-12' });
    expect(periodRange('nextYear', '2026-11')).toEqual({ from: '2027-01', to: '2027-12' });
    expect(periodRange('custom', '2026-11', { from: '2026-03', to: '2026-08' })).toEqual({ from: '2026-03', to: '2026-08' });
  });

  it('limita o personalizado a 60 meses e desinverte', () => {
    expect(periodRange('custom', '2026-11', { from: '2020-01', to: '2030-12' })).toEqual({ from: '2020-01', to: '2024-12' });
    expect(periodRange('custom', '2026-11', { from: '2026-08', to: '2026-03' })).toEqual({ from: '2026-03', to: '2026-08' });
  });
});
