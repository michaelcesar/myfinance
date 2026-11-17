/**
 * Regras da tela de análises — funções puras: estabilidade das receitas,
 * concentração, rankings, onde economizar e as frases de decisão.
 *
 * @module components/finance/analysis/analysisMath
 */
import { formatMoney } from '@/lib/format';
import type { Analysis, AnalysisCategory, AnalysisOrigin } from '@/types/entities';

/** Variação máxima (desvio ÷ média) para uma receita ser "estável". */
export const STABLE_VARIATION = 0.1;

/** Fração da renda a partir da qual depender de uma origem é alerta. */
export const CONCENTRATION_ALERT = 0.5;

/** Fração da renda até a qual os custos fixos são saudáveis. */
export const HEALTHY_FIXED_SHARE = 0.5;

/** Maior período aceito pela API, em meses. */
export const MAX_PERIOD_MONTHS = 60;

/** Aumento mínimo (fração e centavos) para virar alerta de gasto. */
const MIN_INCREASE_RATIO = 0.1;
const MIN_INCREASE_CENTS = 5_000;

/** Estabilidade de uma receita. */
export type StabilityStatus = 'STABLE' | 'VARIABLE' | 'IRREGULAR';

/** Atalhos de período da tela. */
export type AnalysisPreset = 'last3' | 'last6' | 'last12' | 'thisYear' | 'custom';

/** Intervalo de meses (`YYYY-MM`). */
export interface AnalysisRange {
  from: string;
  to: string;
}

/** Frase de decisão, com o tom e a seção de onde veio. */
export interface Insight {
  tone: 'good' | 'warning' | 'info';
  text: string;
  target: 'gastos' | 'receitas' | 'fixo' | 'economizar';
}

/**
 * Soma meses a um mês `YYYY-MM`.
 *
 * @param month - Mês `YYYY-MM`
 * @param count - Meses a somar (negativo volta)
 * @returns Mês `YYYY-MM`
 */
function shiftMonth(month: string, count: number): string {
  const [year, index] = month.split('-').map(Number);
  return new Date(Date.UTC(year, index - 1 + count, 1)).toISOString().slice(0, 7);
}

/**
 * Fração como porcentagem inteira ("50%").
 *
 * @param ratio - Fração
 * @returns Texto
 */
function percent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

/**
 * Intervalo de meses de um atalho, terminando no mês atual.
 *
 * @param preset - Atalho
 * @param current - Mês atual (`YYYY-MM`)
 * @param custom - Intervalo do "Personalizado"
 * @returns Mês inicial e final
 *
 * @example
 * analysisRange('last6', '2026-11'); // { from: '2026-06', to: '2026-11' }
 */
export function analysisRange(preset: AnalysisPreset, current: string, custom?: AnalysisRange): AnalysisRange {
  switch (preset) {
    case 'last3':
      return { from: shiftMonth(current, -2), to: current };
    case 'last12':
      return { from: shiftMonth(current, -11), to: current };
    case 'thisYear':
      return { from: `${current.slice(0, 4)}-01`, to: current };
    case 'custom': {
      if (!custom) return { from: shiftMonth(current, -5), to: current };
      const from = custom.from <= custom.to ? custom.from : custom.to;
      const to = custom.from <= custom.to ? custom.to : custom.from;
      const limit = shiftMonth(from, MAX_PERIOD_MONTHS - 1);
      return { from, to: to > limit ? limit : to };
    }
    default:
      return { from: shiftMonth(current, -5), to: current };
  }
}

/** Meses que entram nas médias: índices `[start, end)` da série. */
export interface DataWindow {
  start: number;
  end: number;
  count: number;
  /** O mês atual está no período e ficou de fora por estar incompleto (ou é o único com dados). */
  partialCurrent: boolean;
}

/**
 * Meses que contam nas médias e na estabilidade: do primeiro mês com algum
 * lançamento pago até o último mês completo. O mês atual, ainda em curso, fica
 * de fora — a não ser que seja o único com dados.
 *
 * @param analysis - Análise do período
 * @param current - Mês atual (`YYYY-MM`)
 * @returns Janela de meses
 *
 * @example
 * dataWindow(analysis, '2026-11'); // { start: 1, end: 3, count: 2, partialCurrent: true }
 */
export function dataWindow(analysis: Pick<Analysis, 'months' | 'expenseCategories' | 'incomeOrigins'>, current: string): DataWindow {
  const { months } = analysis;
  const series = [...analysis.expenseCategories.map(item => item.monthly), ...analysis.incomeOrigins.map(item => item.monthly)];
  const first = months.findIndex((_, index) => series.some(values => (values[index] ?? 0) > 0));
  const currentIndex = months.indexOf(`${current}-01`);
  const end = currentIndex >= 0 ? currentIndex : months.length && months[0] > `${current}-01` ? 0 : months.length;
  if (first === -1) return { start: 0, end: 0, count: 0, partialCurrent: currentIndex >= 0 };
  if (end <= first) return currentIndex >= first ? { start: currentIndex, end: currentIndex + 1, count: 1, partialCurrent: true } : { start: 0, end: 0, count: 0, partialCurrent: false };
  return { start: first, end, count: end - first, partialCurrent: currentIndex >= 0 };
}

/**
 * Estabilidade de uma receita pela série mensal: estável se entrou em todos
 * os meses com variação de até 10%; variável se entrou em pelo menos metade;
 * irregular se menos.
 *
 * @param monthly - Valor recebido em cada mês do período
 * @param window - Só os meses `[start, end)` (padrão: todos)
 * @returns Situação, meses com entrada e variação (desvio ÷ média), se houver
 *
 * @example
 * incomeStability([800000, 820000, 790000]).status; // 'STABLE'
 */
export function incomeStability(series: number[], window?: Pick<DataWindow, 'start' | 'end'>): { status: StabilityStatus; monthsWithIncome: number; variation: number | null } {
  const monthly = window ? series.slice(window.start, window.end) : series;
  const values = monthly.filter(value => value > 0);
  if (!values.length) return { status: 'IRREGULAR', monthsWithIncome: 0, variation: null };
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const deviation = Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length);
  const variation = deviation / mean;
  const coverage = values.length / monthly.length;
  const status: StabilityStatus = values.length === monthly.length && variation <= STABLE_VARIATION ? 'STABLE' : coverage >= 0.5 ? 'VARIABLE' : 'IRREGULAR';
  return { status, monthsWithIncome: values.length, variation };
}

/** Nome da origem que junta o que veio de outros livros do dono. */
export const OTHER_LEDGERS_LABEL = 'Outros livros (pró-labore, lucros)';

/**
 * Renda disponível: receitas e, com um livro selecionado, o que veio de outros
 * livros do dono (pró-labore, lucros) — que não é receita no sistema (C10),
 * mas é dinheiro que o livro tem para gastar.
 *
 * @param analysis - Análise do período
 * @returns Renda disponível em centavos
 */
export function availableIncome(analysis: Pick<Analysis, 'incomeCents' | 'transferInCents'>): number {
  return analysis.incomeCents + analysis.transferInCents;
}

/**
 * Quanto da renda vem da maior origem identificada ("Outras receitas", que
 * junta tudo sem recorrente nem categoria, não conta como uma fonte).
 *
 * @param analysis - Análise do período
 * @returns Nome e fração, ou `null` sem renda
 *
 * @example
 * concentration(analysis); // { name: 'Juscia', share: 0.8 }
 */
export function concentration(analysis: Pick<Analysis, 'incomeCents' | 'incomeOrigins' | 'transferInCents'>): { name: string; share: number } | null {
  const origins: Pick<AnalysisOrigin, 'key' | 'name' | 'totalCents'>[] = [...analysis.incomeOrigins];
  if (analysis.transferInCents > 0) origins.push({ key: 'other-ledgers', name: OTHER_LEDGERS_LABEL, totalCents: analysis.transferInCents });
  const top = origins
    .filter(origin => origin.key !== 'none')
    .reduce<Pick<AnalysisOrigin, 'key' | 'name' | 'totalCents'> | null>((best, origin) => (best === null || origin.totalCents > best.totalCents ? origin : best), null);
  const base = availableIncome(analysis);
  if (!top || base <= 0) return null;
  return { name: top.name, share: top.totalCents / base };
}

/**
 * Categorias com gasto no período, das maiores para as menores ou o contrário.
 *
 * @param categories - Categorias da análise
 * @param order - `top` (maiores) ou `bottom` (menores, incluindo o que deixou de gastar)
 * @returns Categorias ordenadas
 */
export function rankCategories(categories: AnalysisCategory[], order: 'top' | 'bottom'): AnalysisCategory[] {
  if (order === 'top') return categories.filter(item => item.totalCents > 0).sort((a, b) => b.totalCents - a.totalCents);
  return categories.filter(item => item.totalCents > 0 || item.previousCents > 0).sort((a, b) => a.totalCents - b.totalCents || b.previousCents - a.previousCents);
}

/**
 * Onde economizar: categorias cujo gasto variável (sem recorrente) cresceu
 * pelo menos 10% e R$ 50, do maior aumento para o menor.
 *
 * @param categories - Categorias da análise
 * @returns Categorias com aumento no gasto variável
 */
export function savingsCandidates(categories: AnalysisCategory[]): AnalysisCategory[] {
  return categories
    .filter(item => {
      const increase = item.variableCents - item.previousVariableCents;
      return increase >= MIN_INCREASE_CENTS && (item.previousVariableCents === 0 || increase / item.previousVariableCents >= MIN_INCREASE_RATIO);
    })
    .sort((a, b) => b.variableCents - b.previousVariableCents - (a.variableCents - a.previousVariableCents));
}

/**
 * Frases de decisão a partir de regras simples: maior aumento de gasto,
 * dependência de uma origem, peso dos fixos, folga mensal e maior avulso.
 * Sem dados para uma regra, ela não gera frase.
 *
 * @param analysis - Análise do período
 * @param current - Mês atual (`YYYY-MM`); com ele, a folga usa só os meses completos com dados
 * @returns Frases, na ordem de importância
 *
 * @example
 * insights(analysis)[0].text; // 'Mercado subiu 50% vs. período anterior — maior aumento entre os gastos'
 */
export function insights(analysis: Analysis, current?: string): Insight[] {
  const list: Insight[] = [];
  const increase = analysis.expenseCategories
    .filter(item => item.previousCents > 0 && item.totalCents - item.previousCents >= MIN_INCREASE_CENTS && (item.totalCents - item.previousCents) / item.previousCents >= MIN_INCREASE_RATIO)
    .sort((a, b) => b.totalCents - b.previousCents - (a.totalCents - a.previousCents))[0];
  if (increase) {
    list.push({
      tone: 'warning',
      target: 'gastos',
      text: `${increase.name} subiu ${percent((increase.totalCents - increase.previousCents) / increase.previousCents)} vs. período anterior, o maior aumento entre os gastos`,
    });
  }
  const top = concentration(analysis);
  if (top && top.share >= CONCENTRATION_ALERT) {
    list.push({ tone: 'warning', target: 'receitas', text: `${percent(top.share)} da renda vem de ${top.name}: dependência alta de uma fonte` });
  }
  const income = availableIncome(analysis);
  if (income > 0 && analysis.fixedExpenseCents > 0) {
    const share = analysis.fixedExpenseCents / income;
    list.push(
      share <= HEALTHY_FIXED_SHARE
        ? { tone: 'good', target: 'fixo', text: `Custos fixos são ${percent(share)} da renda, um nível saudável` }
        : { tone: 'warning', target: 'fixo', text: `Custos fixos são ${percent(share)} da renda, um peso alto. Revise contratos e assinaturas` }
    );
  }
  const window = current ? dataWindow(analysis, current) : { start: 0, end: analysis.months.length, count: analysis.months.length, partialCurrent: false };
  if ((income > 0 || analysis.expenseCents > 0) && window.count) {
    const inWindow = (series: number[]) => series.slice(window.start, window.end).reduce((sum, value) => sum + value, 0);
    const received = analysis.incomeOrigins.reduce((sum, item) => sum + inWindow(item.monthly), 0) + inWindow(analysis.transferInMonthly);
    const spent = analysis.expenseCategories.reduce((sum, item) => sum + inWindow(item.monthly), 0) + inWindow(analysis.transferOutMonthly);
    const average = Math.round((received - spent) / window.count);
    list.push(
      average >= 0
        ? { tone: 'good', target: 'fixo', text: `Folga média de ${formatMoney(average)}/mês. Dá para investir ou gastar mais nisso` }
        : { tone: 'warning', target: 'economizar', text: `Faltam ${formatMoney(-average)}/mês em média: os gastos passaram da renda` }
    );
  }
  const biggest = analysis.topExpenses[0];
  if (biggest) list.push({ tone: 'info', target: 'economizar', text: `Maior gasto avulso: ${biggest.description} (${formatMoney(biggest.amountCents)})` });
  return list;
}
