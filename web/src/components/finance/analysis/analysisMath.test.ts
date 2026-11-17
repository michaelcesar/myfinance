/**
 * Testes das regras da tela de análises.
 *
 * @module components/finance/analysis/analysisMath.test
 */
import { describe, expect, it } from 'vitest';
import type { Analysis, AnalysisCategory } from '@/types/entities';
import { analysisRange, concentration, dataWindow, incomeStability, insights, rankCategories, savingsCandidates } from './analysisMath';

/**
 * Categoria com valores padrão.
 *
 * @param name - Nome
 * @param values - Campos a sobrescrever
 * @returns Categoria completa
 */
function category(name: string, values: Partial<AnalysisCategory> = {}): AnalysisCategory {
  return { key: name, categoryId: name, name, totalCents: 0, previousCents: 0, variableCents: 0, previousVariableCents: 0, monthly: [0, 0, 0], ...values };
}

/** Análise de três meses com renda concentrada e mercado subindo. */
const analysis: Analysis = {
  from: '2026-09-01',
  to: '2026-11-01',
  previousFrom: '2026-06-01',
  previousTo: '2026-08-01',
  months: ['2026-09-01', '2026-10-01', '2026-11-01'],
  incomeCents: 3_000_000,
  expenseCents: 1_800_000,
  previousIncomeCents: 2_800_000,
  previousExpenseCents: 1_500_000,
  fixedExpenseCents: 900_000,
  variableExpenseCents: 900_000,
  expenseCategories: [
    category('Moradia', { totalCents: 900_000, previousCents: 900_000, monthly: [300_000, 300_000, 300_000] }),
    category('Mercado', { totalCents: 600_000, previousCents: 400_000, variableCents: 600_000, previousVariableCents: 400_000, monthly: [200_000, 200_000, 200_000] }),
    category('Lazer', { totalCents: 300_000, previousCents: 200_000, variableCents: 300_000, previousVariableCents: 200_000, monthly: [100_000, 100_000, 100_000] }),
  ],
  incomeOrigins: [
    { key: 'r1', recurrenceId: 'r1', categoryId: null, name: 'Juscia', totalCents: 2_400_000, previousCents: 2_400_000, monthly: [800_000, 800_000, 800_000] },
    { key: 'c1', recurrenceId: null, categoryId: 'c1', name: 'Freelance', totalCents: 600_000, previousCents: 400_000, monthly: [0, 600_000, 0] },
  ],
  topExpenses: [{ transactionId: 't1', description: 'TV nova', amountCents: 250_000, date: '2026-10-12', categoryName: 'Casa', ledgerName: 'Pessoal' }],
  transferInCents: 0,
  transferOutCents: 0,
  transferInMonthly: [0, 0, 0],
  transferOutMonthly: [0, 0, 0],
};

describe('incomeStability', () => {
  it('estável quando entra todo mês com pouca variação', () => {
    expect(incomeStability([800_000, 820_000, 790_000]).status).toBe('STABLE');
  });

  it('variável quando entra na maioria dos meses ou varia muito', () => {
    expect(incomeStability([800_000, 0, 700_000]).status).toBe('VARIABLE');
    expect(incomeStability([100_000, 900_000, 500_000]).status).toBe('VARIABLE');
  });

  it('irregular quando entra em menos da metade dos meses', () => {
    expect(incomeStability([0, 600_000, 0]).status).toBe('IRREGULAR');
  });

  it('salário que ainda não caiu no mês atual não deixa de ser estável', () => {
    expect(incomeStability([800_000, 800_000, 0], { start: 0, end: 2 }).status).toBe('STABLE');
  });

  it('sem entradas não divide por zero', () => {
    expect(incomeStability([0, 0, 0])).toEqual({ status: 'IRREGULAR', monthsWithIncome: 0, variation: null });
  });
});

describe('concentration', () => {
  it('mostra quanto da renda vem da maior origem', () => {
    expect(concentration(analysis)).toEqual({ name: 'Juscia', share: 0.8 });
  });

  it('sem renda, nada', () => {
    expect(concentration({ ...analysis, incomeCents: 0, incomeOrigins: [] })).toBeNull();
  });
});

describe('rankCategories e savingsCandidates', () => {
  it('ordena maiores e menores gastos', () => {
    expect(rankCategories(analysis.expenseCategories, 'top').map(item => item.name)).toEqual(['Moradia', 'Mercado', 'Lazer']);
    expect(rankCategories(analysis.expenseCategories, 'bottom').map(item => item.name)).toEqual(['Lazer', 'Mercado', 'Moradia']);
  });

  it('nos menores, mostra também o que deixou de gastar', () => {
    const stopped = [...analysis.expenseCategories, category('Academia', { totalCents: 0, previousCents: 30_000 })];
    expect(rankCategories(stopped, 'bottom')[0].name).toBe('Academia');
    expect(rankCategories(stopped, 'top').map(item => item.name)).not.toContain('Academia');
  });

  it('não sugere economizar por aumentos irrisórios', () => {
    expect(savingsCandidates([category('Café', { variableCents: 10_030, previousVariableCents: 10_000 })])).toEqual([]);
  });

  it('aponta os gastos variáveis que mais cresceram', () => {
    expect(savingsCandidates(analysis.expenseCategories).map(item => item.name)).toEqual(['Mercado', 'Lazer']);
  });
});

describe('dataWindow', () => {
  it('deixa de fora o mês atual incompleto e os meses antes do primeiro dado', () => {
    const late = {
      ...analysis,
      months: ['2026-08-01', '2026-09-01', '2026-10-01', '2026-11-01'],
      expenseCategories: [category('Mercado', { totalCents: 300_000, monthly: [0, 100_000, 100_000, 100_000] })],
      incomeOrigins: [],
    };
    expect(dataWindow(late, '2026-11')).toEqual({ start: 1, end: 3, count: 2, partialCurrent: true });
  });

  it('só com o mês atual, usa ele mesmo marcado como parcial', () => {
    const only = { ...analysis, expenseCategories: [category('Mercado', { totalCents: 100_000, monthly: [0, 0, 100_000] })], incomeOrigins: [] };
    expect(dataWindow(only, '2026-11')).toEqual({ start: 2, end: 3, count: 1, partialCurrent: true });
  });

  it('período passado inteiro conta todos os meses com dados', () => {
    expect(dataWindow(analysis, '2027-02')).toEqual({ start: 0, end: 3, count: 3, partialCurrent: false });
  });
});

describe('insights', () => {
  it('gera as frases de decisão a partir dos números', () => {
    const texts = insights(analysis).map(item => item.text);
    expect(texts[0]).toMatch(/Mercado subiu 50%/);
    expect(texts).toContainEqual(expect.stringMatching(/80% da renda vem de Juscia/));
    expect(texts).toContainEqual(expect.stringMatching(/Custos fixos são 30% da renda/));
    expect(texts).toContainEqual(expect.stringMatching(/Folga média de R\$\s?4\.000,00\/mês/));
    expect(texts).toContainEqual(expect.stringMatching(/Maior gasto avulso: TV nova/));
  });

  it('a folga é a média dos meses completos com dados e leva ao topo', () => {
    const slack = insights(analysis, '2026-11').find(item => item.text.startsWith('Folga'));
    expect(slack?.text).toMatch(/Folga média de R\$\s?5\.000,00\/mês/);
    expect(slack?.target).toBe('fixo');
  });

  it('não acusa dependência de "Outras receitas"', () => {
    const bucket = { ...analysis, incomeOrigins: [{ key: 'none', recurrenceId: null, categoryId: null, name: 'Outras receitas', totalCents: 2_900_000, previousCents: 0, monthly: [1, 1, 1] }] };
    expect(insights(bucket).map(item => item.text)).not.toContainEqual(expect.stringMatching(/dependência/));
  });

  it('num livro só, conta o pró-labore vindo de outro livro na folga, nos fixos e na concentração', () => {
    const personal = { ...analysis, transferInCents: 600_000, transferInMonthly: [200_000, 200_000, 200_000] };
    const texts = insights(personal).map(item => item.text);
    expect(texts).toContainEqual(expect.stringMatching(/Folga média de R\$\s?6\.000,00\/mês/));
    expect(texts).toContainEqual(expect.stringMatching(/Custos fixos são 25% da renda/));
    expect(texts).toContainEqual(expect.stringMatching(/67% da renda vem de Juscia/));
  });

  it('sem dados, não inventa', () => {
    const empty = {
      ...analysis,
      incomeCents: 0,
      expenseCents: 0,
      fixedExpenseCents: 0,
      variableExpenseCents: 0,
      expenseCategories: [],
      incomeOrigins: [],
      topExpenses: [],
      transferInCents: 0,
      transferOutCents: 0,
    };
    expect(insights(empty)).toEqual([]);
  });
});

describe('analysisRange', () => {
  it('monta os atalhos terminando no mês atual', () => {
    expect(analysisRange('last3', '2026-11')).toEqual({ from: '2026-09', to: '2026-11' });
    expect(analysisRange('last6', '2026-11')).toEqual({ from: '2026-06', to: '2026-11' });
    expect(analysisRange('last12', '2026-11')).toEqual({ from: '2025-12', to: '2026-11' });
    expect(analysisRange('thisYear', '2026-11')).toEqual({ from: '2026-01', to: '2026-11' });
    expect(analysisRange('custom', '2026-11', { from: '2026-02', to: '2026-04' })).toEqual({ from: '2026-02', to: '2026-04' });
    expect(analysisRange('custom', '2026-11', { from: '2020-01', to: '2030-12' })).toEqual({ from: '2020-01', to: '2024-12' });
  });
});
