/**
 * Formato das respostas dos painéis.
 *
 * @module modules/dashboard/types/summary.types
 */
import { type Period } from '~/common/utils';
import { type AccountType } from '~/modules/accounts/enums/account-type.enum';
import { type LedgerType } from '~/modules/ledgers/enums/ledger-type.enum';
import { type InvestmentType } from '~/modules/investments/enums/investment-type.enum';
import { type TransactionKind } from '~/modules/transactions/enums/transaction-kind.enum';

/** Totais do período, em centavos. */
export interface PeriodTotals {
  incomeCents: number;
  expenseCents: number;
  /** Receita menos despesa. */
  resultCents: number;
  /** Entradas vindas de outro livro (pró-labore recebido, aporte recebido...). Zero na visão consolidada. */
  transfersInCents: number;
  /** Saídas para outro livro. Zero na visão consolidada. */
  transfersOutCents: number;
  pendingIncomeCents: number;
  pendingExpenseCents: number;
}

/** Ponto da série mensal. */
export interface MonthlyPoint {
  month: string;
  incomeCents: number;
  expenseCents: number;
  resultCents: number;
}

/** Fatia de despesa por categoria. */
export interface CategorySlice {
  categoryId: string | null;
  name: string;
  color: string;
  icon: string;
  totalCents: number;
}

/** Fatia de receita por origem (recorrente, ou categoria quando não veio de um). */
export interface IncomeSlice {
  key: string;
  name: string;
  totalCents: number;
}

/** Saldo de uma conta. */
export interface AccountBalance {
  accountId: string;
  ledgerId: string;
  name: string;
  type: AccountType;
  institution: string | null;
  color: string;
  balanceCents: number;
}

/** Fatia da carteira por classe de ativo. */
export interface AllocationSlice {
  type: InvestmentType;
  totalCents: number;
}

/** Lançamento pendente nos próximos dias. */
export interface UpcomingItem {
  transactionId: string;
  ledgerId: string;
  ledgerName: string;
  kind: TransactionKind;
  amountCents: number;
  date: string;
  description: string;
}

/** Resumo de um livro dentro da visão geral. */
export interface LedgerOverview {
  ledgerId: string;
  name: string;
  type: LedgerType;
  color: string;
  incomeCents: number;
  expenseCents: number;
  cashCents: number;
  investmentsCents: number;
  /** Bens físicos (classe `ASSET`), separados dos investimentos que rendem. */
  assetsCents: number;
}

/** Resposta comum aos dois painéis. */
export interface Summary {
  period: Period;
  totals: PeriodTotals;
  cashCents: number;
  investmentsCents: number;
  /** Bens físicos (classe `ASSET`); a web decide se entram no patrimônio mostrado. */
  assetsCents: number;
  netWorthCents: number;
  monthly: MonthlyPoint[];
  expensesByCategory: CategorySlice[];
  incomeByOrigin: IncomeSlice[];
  accounts: AccountBalance[];
  allocation: AllocationSlice[];
  upcoming: UpcomingItem[];
}

/** Visão geral: o resumo consolidado mais um bloco por livro. */
export interface Overview extends Summary {
  ledgers: LedgerOverview[];
}

/** Um mês da previsão: realizado (passado) ou previsto (mês atual em diante). */
export interface ForecastMonth {
  month: string;
  realized: boolean;
  incomeCents: number;
  expenseCents: number;
  resultCents: number;
  /** Rendimento estimado das contas no mês (só no previsto). */
  yieldCents: number;
  cashEndCents: number;
  investmentsEndCents: number;
  assetsEndCents: number;
  netWorthEndCents: number;
}

/** Célula da tabela recorrentes × meses. */
export interface ForecastCell {
  amountCents: number;
  paid: boolean;
  projected: boolean;
}

/** Linha da tabela: um recorrente, ou os avulsos de receita/despesa. */
export interface ForecastRow {
  key: string;
  recurrenceId: string | null;
  description: string;
  kind: 'INCOME' | 'EXPENSE';
  ledgerName: string | null;
  cells: Record<string, ForecastCell>;
}

/** Previsão do período. */
export interface Forecast {
  from: string;
  to: string;
  currentMonth: string;
  cashTodayCents: number;
  investmentsCents: number;
  assetsCents: number;
  months: ForecastMonth[];
  rows: ForecastRow[];
  recurringIncomeCents: number;
  recurringExpenseCents: number;
}

/** Gasto de uma categoria no período e no anterior, com a série mensal. */
export interface AnalysisCategory {
  key: string;
  categoryId: string | null;
  name: string;
  totalCents: number;
  previousCents: number;
  /** Parte sem recorrente (gasto variável). */
  variableCents: number;
  previousVariableCents: number;
  monthly: number[];
}

/** Receita de uma origem (recorrente, senão categoria) no período e no anterior. */
export interface AnalysisOrigin {
  key: string;
  recurrenceId: string | null;
  categoryId: string | null;
  name: string;
  totalCents: number;
  previousCents: number;
  monthly: number[];
}

/** Gasto avulso (sem recorrente). */
export interface AnalysisExpense {
  transactionId: string;
  description: string;
  amountCents: number;
  date: string;
  categoryName: string | null;
  ledgerName: string;
}

/** Análise do realizado no período, comparada ao período anterior. */
export interface Analysis {
  from: string;
  to: string;
  previousFrom: string;
  previousTo: string;
  months: string[];
  incomeCents: number;
  expenseCents: number;
  previousIncomeCents: number;
  previousExpenseCents: number;
  fixedExpenseCents: number;
  variableExpenseCents: number;
  expenseCategories: AnalysisCategory[];
  incomeOrigins: AnalysisOrigin[];
  topExpenses: AnalysisExpense[];
  /**
   * Com um livro selecionado: dinheiro que entrou/saiu dele por transferência
   * de/para outros livros do dono (pró-labore, lucros, aportes). Não é
   * receita nem despesa (C10); serve para medir a folga real. Zero em "Todos".
   */
  transferInCents: number;
  transferOutCents: number;
  transferInMonthly: number[];
  transferOutMonthly: number[];
}
