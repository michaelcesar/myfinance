/**
 * Chamadas dos domínios financeiros: livros, contas, categorias,
 * lançamentos, transferências,
 * investimentos e painéis.
 *
 * Um objeto por domínio, cada método uma rota. Listas usam a sintaxe de
 * filtro do `nestjs-paginate` (`filter.campo=$eq:valor`).
 *
 * @module services/finance.service
 */
import { request } from '@/lib/api-client';
import type { Paginated } from '@/types/api';
import type {
  Account,
  AccountType,
  Category,
  Analysis,
  CategoryKind,
  Forecast,
  Investment,
  InvestmentMovement,
  InvestmentType,
  Ledger,
  LedgerType,
  MovementKind,
  Overview,
  PaletteColor,
  Recurrence,
  Summary,
  Transaction,
  TransactionStatus,
  Transfer,
  TransferKind,
} from '@/types/entities';

type Query = Record<string, string | number | boolean | undefined | null>;

/** Lista grande o bastante para cadastros pequenos (livros, contas, categorias). */
const ALL = { limit: 100 };

/** Dados de empresa. */
export interface LedgerInput {
  name: string;
  legalName?: string | null;
  document?: string | null;
  color?: PaletteColor;
  archived?: boolean;
}

/** Dados de conta. */
export interface AccountInput {
  ledgerId: string;
  name: string;
  type: AccountType;
  institution?: string | null;
  initialBalanceCents?: number;
  color?: PaletteColor;
  annualYieldRate?: number | null;
  archived?: boolean;
}

/** Dados de categoria. */
export interface CategoryInput {
  kind: CategoryKind;
  name: string;
  color?: PaletteColor;
  icon?: string;
  ledgerType?: LedgerType | null;
  archived?: boolean;
}

/** Dados de recorrente. Meses vão como `AAAA-MM-01`. */
export interface RecurrenceInput {
  accountId: string;
  kind: 'INCOME' | 'EXPENSE';
  description: string;
  amountCents: number;
  dayOfMonth: number;
  dayOfMonthStart?: number | null;
  startMonth: string;
  endMonth?: string | null;
  categoryId?: string | null;
  notes?: string | null;
}

/** Dados de receita ou despesa. */
export interface TransactionInput {
  accountId: string;
  kind: 'INCOME' | 'EXPENSE';
  amountCents: number;
  date: string;
  description: string;
  status?: TransactionStatus;
  categoryId?: string | null;
  notes?: string | null;
}

/** Dados de transferência. */
export interface TransferInput {
  fromAccountId: string;
  toAccountId: string;
  amountCents: number;
  date: string;
  kind?: TransferKind;
  description?: string;
  notes?: string | null;
}

/** Dados de investimento. */
export interface InvestmentInput {
  ledgerId: string;
  name: string;
  type: InvestmentType;
  institution?: string | null;
  currentValueCents?: number;
  valuedAt?: string | null;
  notes?: string | null;
  archived?: boolean;
}

/** Dados de movimentação de investimento. */
export interface MovementInput {
  kind: MovementKind;
  amountCents: number;
  date: string;
  accountId?: string | null;
  notes?: string | null;
}

/** Período dos painéis. */
export interface PeriodInput {
  from: string;
  to: string;
}

export const ledgersService = {
  list: (query: Query = {}) => request<Paginated<Ledger>>('/ledgers', { query: { ...ALL, ...query } }),
  get: (ledgerId: string) => request<Ledger>(`/ledgers/${ledgerId}`),
  create: (input: LedgerInput) => request<Ledger>('/ledgers', { method: 'POST', body: input }),
  update: (ledgerId: string, input: Partial<LedgerInput>) => request<Ledger>(`/ledgers/${ledgerId}`, { method: 'PATCH', body: input }),
  remove: (ledgerId: string) => request<null>(`/ledgers/${ledgerId}`, { method: 'DELETE' }),
};

export const accountsService = {
  list: (query: Query = {}) => request<Paginated<Account>>('/accounts', { query: { ...ALL, ...query } }),
  create: (input: AccountInput) => request<Account>('/accounts', { method: 'POST', body: input }),
  update: (accountId: string, input: Partial<Omit<AccountInput, 'ledgerId'>>) => request<Account>(`/accounts/${accountId}`, { method: 'PATCH', body: input }),
  remove: (accountId: string) => request<null>(`/accounts/${accountId}`, { method: 'DELETE' }),
};

export const categoriesService = {
  list: (query: Query = {}) => request<Paginated<Category>>('/categories', { query: { ...ALL, ...query } }),
  create: (input: CategoryInput) => request<Category>('/categories', { method: 'POST', body: input }),
  update: (categoryId: string, input: Partial<Omit<CategoryInput, 'kind'>>) => request<Category>(`/categories/${categoryId}`, { method: 'PATCH', body: input }),
  remove: (categoryId: string) => request<null>(`/categories/${categoryId}`, { method: 'DELETE' }),
};

export const recurrencesService = {
  list: (query: Query = {}) => request<Paginated<Recurrence>>('/recurrences', { query: { ...ALL, ...query } }),
  create: (input: RecurrenceInput) => request<Recurrence>('/recurrences', { method: 'POST', body: input }),
  update: (recurrenceId: string, input: Partial<Omit<RecurrenceInput, 'kind'>>) => request<Recurrence>(`/recurrences/${recurrenceId}`, { method: 'PATCH', body: input }),
  remove: (recurrenceId: string) => request<null>(`/recurrences/${recurrenceId}`, { method: 'DELETE' }),
};

export const transactionsService = {
  get: (transactionId: string) => request<Transaction>(`/transactions/${transactionId}`),
  list: (query: Query = {}) => request<Paginated<Transaction>>('/transactions', { query }),
  create: (input: TransactionInput) => request<Transaction>('/transactions', { method: 'POST', body: input }),
  update: (transactionId: string, input: Partial<TransactionInput>) => request<Transaction>(`/transactions/${transactionId}`, { method: 'PATCH', body: input }),
  remove: (transactionId: string) => request<null>(`/transactions/${transactionId}`, { method: 'DELETE' }),
};

export const transfersService = {
  get: (transferId: string) => request<Transfer & { legs: Transaction[] }>(`/transfers/${transferId}`),
  create: (input: TransferInput) => request<Transfer>('/transfers', { method: 'POST', body: input }),
  update: (transferId: string, input: Partial<Omit<TransferInput, 'fromAccountId' | 'toAccountId'>>) => request<Transfer>(`/transfers/${transferId}`, { method: 'PATCH', body: input }),
  remove: (transferId: string) => request<null>(`/transfers/${transferId}`, { method: 'DELETE' }),
};

export const investmentsService = {
  list: (query: Query = {}) => request<Paginated<Investment>>('/investments', { query: { ...ALL, ...query } }),
  get: (investmentId: string) => request<Investment>(`/investments/${investmentId}`),
  create: (input: InvestmentInput) => request<Investment>('/investments', { method: 'POST', body: input }),
  update: (investmentId: string, input: Partial<Omit<InvestmentInput, 'ledgerId'>>) => request<Investment>(`/investments/${investmentId}`, { method: 'PATCH', body: input }),
  remove: (investmentId: string) => request<null>(`/investments/${investmentId}`, { method: 'DELETE' }),
  movements: (investmentId: string) => request<Paginated<InvestmentMovement>>(`/investments/${investmentId}/movements`, { query: { limit: 200 } }),
  addMovement: (investmentId: string, input: MovementInput) => request<Investment>(`/investments/${investmentId}/movements`, { method: 'POST', body: input }),
  removeMovement: (investmentId: string, movementId: string) => request<Investment>(`/investments/${investmentId}/movements/${movementId}`, { method: 'DELETE' }),
};

export const dashboardService = {
  overview: (period: PeriodInput) => request<Overview>('/dashboard/overview', { query: { ...period } }),
  ledger: (ledgerId: string, period: PeriodInput) => request<Summary>(`/dashboard/ledgers/${ledgerId}`, { query: { ...period } }),
  forecast: (query: ForecastQuery) => request<Forecast>('/dashboard/forecast', { query: { ...query } }),
  analysis: (query: ForecastQuery) => request<Analysis>('/dashboard/analysis', { query: { ...query } }),
};

/** Filtros da previsão: meses `YYYY-MM` e livro opcional. */
export interface ForecastQuery {
  from: string;
  to: string;
  ledgerId?: string;
}

/** Tabelas do backup, na mesma ordem e com os mesmos nomes da API. */
export type BackupTableKey = 'ledgers' | 'categories' | 'accounts' | 'recurrences' | 'recurrenceSkips' | 'investments' | 'investmentMovements' | 'transfers' | 'transactions';

/** Arquivo de backup exportado pela API (`GET /backup/export`). */
export interface BackupFile {
  format: 'finance-manager-backup';
  version: number;
  exportedAt: string;
  owner: { name: string; email: string };
  counts: Record<BackupTableKey, number>;
  data: Record<BackupTableKey, Record<string, unknown>[]>;
}

export const backupService = {
  export: () => request<BackupFile>('/backup/export'),
  import: (file: BackupFile) => request<{ counts: Record<BackupTableKey, number> }>('/backup/import', { method: 'POST', body: file }),
};
