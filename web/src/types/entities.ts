/**
 * Tipos das entidades da API, espelhando `financial-api`.
 *
 * Valores monetários vêm sempre em centavos inteiros (`*Cents`); datas de
 * lançamento são `YYYY-MM-DD` sem fuso.
 *
 * @module types/entities
 */

/** Nome de cor da paleta compartilhada com a API. */
export type PaletteColor = 'blue' | 'green' | 'indigo' | 'orange' | 'pink' | 'purple' | 'red' | 'teal' | 'yellow' | 'mint' | 'cyan' | 'brown' | 'gray';

export type LedgerType = 'PERSONAL' | 'COMPANY';
export type AccountType = 'CHECKING' | 'SAVINGS' | 'DIGITAL_WALLET' | 'CASH' | 'CREDIT_CARD' | 'BROKERAGE';
export type CategoryKind = 'INCOME' | 'EXPENSE';
export type TransactionKind = 'INCOME' | 'EXPENSE' | 'TRANSFER_IN' | 'TRANSFER_OUT';
export type TransactionStatus = 'PAID' | 'PENDING';
export type TransferKind = 'INTERNAL' | 'PRO_LABORE' | 'PROFIT_DISTRIBUTION' | 'CAPITAL_CONTRIBUTION' | 'LOAN' | 'REIMBURSEMENT';
export type InvestmentType = 'FIXED_INCOME' | 'STOCKS' | 'REITS' | 'FUNDS' | 'CRYPTO' | 'PENSION' | 'INTERNATIONAL' | 'OTHER' | 'ASSET';
export type MovementKind = 'CONTRIBUTION' | 'WITHDRAWAL' | 'YIELD';

/** Usuário logado. */
export interface User {
  userId: string;
  name: string;
  email: string;
  createdAt: string;
}

/** Livro: o pessoal ou uma empresa do usuário. */
export interface Ledger {
  ledgerId: string;
  type: LedgerType;
  name: string;
  legalName: string | null;
  document: string | null;
  color: PaletteColor;
  archived: boolean;
  createdAt: string;
}

/** Conta com saldo calculado pela API. */
export interface Account {
  accountId: string;
  ledgerId: string;
  ledger?: Ledger;
  name: string;
  type: AccountType;
  institution: string | null;
  initialBalanceCents: number;
  balanceCents: number;
  annualYieldRate: number | null;
  estimatedMonthlyYieldCents: number;
  color: PaletteColor;
  archived: boolean;
}

/** Categoria de receita ou despesa. */
export interface Category {
  categoryId: string;
  kind: CategoryKind;
  name: string;
  color: PaletteColor;
  icon: string;
  ledgerType: LedgerType | null;
  archived: boolean;
}

/** Transferência (cabeçalho). */
export interface Transfer {
  transferId: string;
  fromAccountId: string;
  toAccountId: string;
  amountCents: number;
  date: string;
  kind: TransferKind;
  description: string;
  notes: string | null;
}

/** Lançamento com relações. */
export interface Transaction {
  transactionId: string;
  ledgerId: string;
  ledger: Ledger;
  accountId: string;
  account: Account;
  kind: TransactionKind;
  status: TransactionStatus;
  amountCents: number;
  date: string;
  description: string;
  categoryId: string | null;
  category: Category | null;
  transferId: string | null;
  transfer: Transfer | null;
  investmentMovementId: string | null;
  recurrenceId: string | null;
  recurrenceMonth: string | null;
  recurrence: Pick<Recurrence, 'recurrenceId' | 'description'> | null;
  notes: string | null;
}

/** Contrato ou conta fixa mensal, com o próximo vencimento e os pendentes vinculados. */
export interface Recurrence {
  recurrenceId: string;
  ledgerId: string;
  ledger: Ledger;
  accountId: string;
  account: Account;
  kind: 'INCOME' | 'EXPENSE';
  description: string;
  amountCents: number;
  dayOfMonth: number;
  dayOfMonthStart: number | null;
  startMonth: string;
  endMonth: string | null;
  categoryId: string | null;
  category: Category | null;
  notes: string | null;
  nextDate: string | null;
  pendingCount: number;
}

/** Investimento com números derivados. */
export interface Investment {
  investmentId: string;
  ledgerId: string;
  ledger: Ledger;
  name: string;
  type: InvestmentType;
  institution: string | null;
  currentValueCents: number;
  valuedAt: string | null;
  notes: string | null;
  archived: boolean;
  investedCents: number;
  yieldCents: number;
  returnCents: number;
}

/** Movimentação de investimento. */
export interface InvestmentMovement {
  investmentMovementId: string;
  investmentId: string;
  kind: MovementKind;
  amountCents: number;
  date: string;
  accountId: string | null;
  account: Account | null;
  notes: string | null;
}

/** Totais de um período. */
export interface PeriodTotals {
  incomeCents: number;
  expenseCents: number;
  resultCents: number;
  transfersInCents: number;
  transfersOutCents: number;
  pendingIncomeCents: number;
  pendingExpenseCents: number;
}

/** Resumo de painel (livro ou consolidado). */
export interface Summary {
  period: { from: string; to: string };
  totals: PeriodTotals;
  cashCents: number;
  investmentsCents: number;
  /** Bens físicos; só entram no patrimônio mostrado com o selo "Incluir bens". */
  assetsCents: number;
  netWorthCents: number;
  monthly: { month: string; incomeCents: number; expenseCents: number; resultCents: number }[];
  expensesByCategory: { categoryId: string | null; name: string; color: PaletteColor; icon: string; totalCents: number }[];
  incomeByOrigin: { key: string; name: string; totalCents: number }[];
  accounts: { accountId: string; ledgerId: string; name: string; type: AccountType; institution: string | null; color: PaletteColor; balanceCents: number }[];
  allocation: { type: InvestmentType; totalCents: number }[];
  upcoming: { transactionId: string; ledgerId: string; ledgerName: string; kind: TransactionKind; amountCents: number; date: string; description: string }[];
}

/** Visão geral: consolidado mais um bloco por livro. */
export interface Overview extends Summary {
  ledgers: {
    ledgerId: string;
    name: string;
    type: LedgerType;
    color: PaletteColor;
    incomeCents: number;
    expenseCents: number;
    cashCents: number;
    investmentsCents: number;
    assetsCents: number;
  }[];
}

/** Um mês da previsão: realizado (passado) ou previsto (mês atual em diante). */
export interface ForecastMonth {
  month: string;
  realized: boolean;
  incomeCents: number;
  expenseCents: number;
  resultCents: number;
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

/** Previsão do período (`GET /dashboard/forecast`). */
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
  variableCents: number;
  previousVariableCents: number;
  monthly: number[];
}

/** Receita de uma origem (recorrente, senão categoria). */
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

/** Análise do realizado (`GET /dashboard/analysis`). */
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
  /** Com um livro selecionado: entrou/saiu por transferência de/para outros livros (não é receita nem despesa). */
  transferInCents: number;
  transferOutCents: number;
  transferInMonthly: number[];
  transferOutMonthly: number[];
}
