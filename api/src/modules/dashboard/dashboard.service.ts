/**
 * Serviço dos painéis: visão geral consolidada e resumo por livro.
 *
 * @module modules/dashboard/dashboard.service
 */
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { lastMonths, type Period, toIsoDate } from '~/common/utils';
import { LedgersService } from '~/modules/ledgers/ledgers.service';
import {
  type AccountBalance,
  type AllocationSlice,
  type CategorySlice,
  type IncomeSlice,
  type LedgerOverview,
  type MonthlyPoint,
  type Overview,
  type PeriodTotals,
  type Summary,
  type UpcomingItem,
} from './types/summary.types';

/** Meses na série histórica. */
const MONTHS_IN_SERIES = 12;

/** Dias à frente na lista de pendências. */
const UPCOMING_DAYS = 30;

/** Fatias mostradas nos rankings de categoria e origem. */
const TOP_SLICES = 8;

/**
 * Filtro de escopo comum às consultas: `$1` é o usuário e `$2` o livro
 * (ou `NULL` para todos). O alias da tabela é sempre `t`.
 */
const SCOPE_SQL = `t.user_id = $1 AND ($2::uuid IS NULL OR t.ledger_id = $2)`;

/**
 * Converte o resultado de agregação do Postgres (string) em número.
 *
 * @param value - Valor cru do driver
 * @returns Número, com `null` virando zero
 */
const num = (value: string | number | null | undefined): number => Number(value ?? 0);

/**
 * Agregações dos painéis em SQL direto — um painel é leitura pura, e o
 * QueryBuilder não ganharia clareza aqui.
 *
 * Regra central (`ADR-005`): receita e despesa só contam `INCOME`/`EXPENSE`.
 * Transferências nunca são receita nem despesa; no resumo de um livro,
 * aparecem como entrada/saída **de outro livro**; na visão consolidada,
 * somem, porque o dinheiro não saiu do conjunto.
 *
 * @example
 * const overview = await dashboardService.overview(userId, { from: '2026-11-01', to: '2026-11-30' });
 */
@Injectable()
export class DashboardService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly ledgersService: LedgersService
  ) {}

  /**
   * Monta a visão geral: tudo consolidado mais um bloco por livro.
   *
   * @param userId - Dono
   * @param period - Intervalo de datas
   * @returns Visão geral
   *
   * @example
   * await dashboardService.overview(userId, period);
   */
  async overview(userId: string, period: Period): Promise<Overview> {
    const [summary, ledgerRows] = await Promise.all([this.summary(userId, period, null), this.ledgerOverviews(userId, period)]);
    const cashByLedger = new Map<string, number>();
    for (const account of summary.accounts) cashByLedger.set(account.ledgerId, (cashByLedger.get(account.ledgerId) ?? 0) + account.balanceCents);
    const ledgers = ledgerRows.map(ledger => ({ ...ledger, cashCents: cashByLedger.get(ledger.ledgerId) ?? 0 }));
    return { ...summary, totals: { ...summary.totals, transfersInCents: 0, transfersOutCents: 0 }, ledgers };
  }

  /**
   * Monta o resumo de um livro.
   *
   * @param userId - Dono
   * @param ledgerId - Livro
   * @param period - Intervalo de datas
   * @returns Resumo do livro
   * @throws `NotFoundException` se o livro não for do usuário
   *
   * @example
   * await dashboardService.ledgerSummary(userId, ledgerId, period);
   */
  async ledgerSummary(userId: string, ledgerId: string, period: Period): Promise<Summary> {
    await this.ledgersService.findOne(userId, ledgerId);
    return this.summary(userId, period, ledgerId);
  }

  /**
   * Executa as consultas do resumo em paralelo.
   *
   * @param userId - Dono
   * @param period - Intervalo
   * @param ledgerId - Livro, ou `null` para todos
   * @returns Resumo
   */
  private async summary(userId: string, period: Period, ledgerId: string | null): Promise<Summary> {
    const [totals, monthly, expensesByCategory, incomeByOrigin, accounts, allocation, upcoming, assetsCents] = await Promise.all([
      this.totals(userId, period, ledgerId),
      this.monthly(userId, ledgerId),
      this.expensesByCategory(userId, period, ledgerId),
      this.incomeByOrigin(userId, period, ledgerId),
      this.accountBalances(userId, ledgerId),
      this.allocation(userId, ledgerId),
      this.upcoming(userId, ledgerId),
      this.assets(userId, ledgerId),
    ]);
    const cashCents = accounts.reduce((sum, account) => sum + account.balanceCents, 0);
    const investmentsCents = allocation.reduce((sum, slice) => sum + slice.totalCents, 0);
    return {
      period,
      totals,
      cashCents,
      investmentsCents,
      assetsCents,
      netWorthCents: cashCents + investmentsCents + assetsCents,
      monthly,
      expensesByCategory,
      incomeByOrigin,
      accounts,
      allocation,
      upcoming,
    };
  }

  /**
   * Totais do período. Transferência só conta quando a outra perna está
   * em outro livro: mover entre duas contas do mesmo livro não é entrada
   * nem saída dele.
   *
   * @param userId - Dono
   * @param period - Intervalo
   * @param ledgerId - Livro, ou `null`
   * @returns Totais
   */
  private async totals(userId: string, period: Period, ledgerId: string | null): Promise<PeriodTotals> {
    const [row] = await this.dataSource.query<Record<string, string>[]>(
      `SELECT
         COALESCE(SUM(t.amount_cents) FILTER (WHERE t.kind = 'INCOME' AND t.status = 'PAID'), 0) AS income,
         COALESCE(SUM(t.amount_cents) FILTER (WHERE t.kind = 'EXPENSE' AND t.status = 'PAID'), 0) AS expense,
         COALESCE(SUM(t.amount_cents) FILTER (WHERE t.kind = 'INCOME' AND t.status = 'PENDING'), 0) AS pending_income,
         COALESCE(SUM(t.amount_cents) FILTER (WHERE t.kind = 'EXPENSE' AND t.status = 'PENDING'), 0) AS pending_expense,
         COALESCE(SUM(t.amount_cents) FILTER (WHERE t.kind = 'TRANSFER_IN' AND other.ledger_id <> t.ledger_id), 0) AS transfers_in,
         COALESCE(SUM(t.amount_cents) FILTER (WHERE t.kind = 'TRANSFER_OUT' AND other.ledger_id <> t.ledger_id), 0) AS transfers_out
       FROM "transaction" t
       LEFT JOIN "transaction" other ON other.transfer_id = t.transfer_id AND other.transaction_id <> t.transaction_id
       WHERE ${SCOPE_SQL} AND t.date BETWEEN $3 AND $4`,
      [userId, ledgerId, period.from, period.to]
    );
    const incomeCents = num(row?.income);
    const expenseCents = num(row?.expense);
    return {
      incomeCents,
      expenseCents,
      resultCents: incomeCents - expenseCents,
      transfersInCents: num(row?.transfers_in),
      transfersOutCents: num(row?.transfers_out),
      pendingIncomeCents: num(row?.pending_income),
      pendingExpenseCents: num(row?.pending_expense),
    };
  }

  /**
   * Série dos últimos 12 meses de receita e despesa pagas, com zero nos
   * meses sem movimento.
   *
   * @param userId - Dono
   * @param ledgerId - Livro, ou `null`
   * @returns Pontos do mais antigo ao mais recente
   */
  private async monthly(userId: string, ledgerId: string | null): Promise<MonthlyPoint[]> {
    const months = lastMonths(MONTHS_IN_SERIES);
    const rows = await this.dataSource.query<{ month: string; income: string; expense: string }[]>(
      `SELECT to_char(t.date, 'YYYY-MM') AS month,
         COALESCE(SUM(t.amount_cents) FILTER (WHERE t.kind = 'INCOME'), 0) AS income,
         COALESCE(SUM(t.amount_cents) FILTER (WHERE t.kind = 'EXPENSE'), 0) AS expense
       FROM "transaction" t
       WHERE ${SCOPE_SQL} AND t.status = 'PAID' AND t.date >= $3::date
       GROUP BY 1`,
      [userId, ledgerId, `${months[0]}-01`]
    );
    const byMonth = new Map(rows.map(row => [row.month, row]));
    return months.map(month => {
      const incomeCents = num(byMonth.get(month)?.income);
      const expenseCents = num(byMonth.get(month)?.expense);
      return { month, incomeCents, expenseCents, resultCents: incomeCents - expenseCents };
    });
  }

  /**
   * Despesas pagas do período por categoria, maiores primeiro.
   *
   * @param userId - Dono
   * @param period - Intervalo
   * @param ledgerId - Livro, ou `null`
   * @returns Fatias, com "Sem categoria" quando falta categoria
   */
  private async expensesByCategory(userId: string, period: Period, ledgerId: string | null): Promise<CategorySlice[]> {
    const rows = await this.dataSource.query<{ category_id: string | null; name: string | null; color: string | null; icon: string | null; total: string }[]>(
      `SELECT c.category_id, c.name, c.color, c.icon, SUM(t.amount_cents) AS total
       FROM "transaction" t
       LEFT JOIN category c ON c.category_id = t.category_id
       WHERE ${SCOPE_SQL} AND t.kind = 'EXPENSE' AND t.status = 'PAID' AND t.date BETWEEN $3 AND $4
       GROUP BY c.category_id, c.name, c.color, c.icon
       ORDER BY total DESC
       LIMIT ${TOP_SLICES}`,
      [userId, ledgerId, period.from, period.to]
    );
    return rows.map(row => ({ categoryId: row.category_id, name: row.name ?? 'Sem categoria', color: row.color ?? 'gray', icon: row.icon ?? 'tag', totalCents: num(row.total) }));
  }

  /**
   * Receitas pagas do período por origem: o recorrente que gerou, ou a
   * categoria quando a receita não veio de um recorrente.
   *
   * @param userId - Dono
   * @param period - Intervalo
   * @param ledgerId - Livro, ou `null`
   * @returns Fatias, maiores primeiro
   */
  private async incomeByOrigin(userId: string, period: Period, ledgerId: string | null): Promise<IncomeSlice[]> {
    const rows = await this.dataSource.query<{ key: string; name: string; total: string }[]>(
      `SELECT COALESCE(r.recurrence_id::text, c.category_id::text, 'none') AS key,
         COALESCE(r.description, c.name, 'Outras receitas') AS name,
         SUM(t.amount_cents) AS total
       FROM "transaction" t
       LEFT JOIN recurrence r ON r.recurrence_id = t.recurrence_id
       LEFT JOIN category c ON c.category_id = t.category_id
       WHERE ${SCOPE_SQL} AND t.kind = 'INCOME' AND t.status = 'PAID' AND t.date BETWEEN $3 AND $4
       GROUP BY 1, 2
       ORDER BY total DESC
       LIMIT ${TOP_SLICES}`,
      [userId, ledgerId, period.from, period.to]
    );
    return rows.map(row => ({ key: row.key, name: row.name, totalCents: num(row.total) }));
  }

  /**
   * Saldo atual de cada conta ativa (saldo inicial + lançamentos pagos).
   *
   * @param userId - Dono
   * @param ledgerId - Livro, ou `null`
   * @returns Contas, maior saldo primeiro
   */
  private async accountBalances(userId: string, ledgerId: string | null): Promise<AccountBalance[]> {
    const rows = await this.dataSource.query<{ account_id: string; ledger_id: string; name: string; type: AccountBalance['type']; institution: string | null; color: string; balance: string }[]>(
      `SELECT a.account_id, a.ledger_id, a.name, a.type, a.institution, a.color,
         a.initial_balance_cents + COALESCE(SUM(CASE WHEN t.kind IN ('INCOME', 'TRANSFER_IN') THEN t.amount_cents ELSE -t.amount_cents END) FILTER (WHERE t.status = 'PAID'), 0) AS balance
       FROM account a
       LEFT JOIN "transaction" t ON t.account_id = a.account_id
       WHERE a.user_id = $1 AND ($2::uuid IS NULL OR a.ledger_id = $2) AND a.archived = false
       GROUP BY a.account_id
       ORDER BY balance DESC`,
      [userId, ledgerId]
    );
    return rows.map(row => ({
      accountId: row.account_id,
      ledgerId: row.ledger_id,
      name: row.name,
      type: row.type,
      institution: row.institution,
      color: row.color,
      balanceCents: num(row.balance),
    }));
  }

  /**
   * Valor atual da carteira por classe de ativo, sem os bens físicos.
   *
   * @param userId - Dono
   * @param ledgerId - Livro, ou `null`
   * @returns Fatias com valor positivo, maiores primeiro
   */
  private async allocation(userId: string, ledgerId: string | null): Promise<AllocationSlice[]> {
    const rows = await this.dataSource.query<{ type: AllocationSlice['type']; total: string }[]>(
      `SELECT i.type, SUM(i.current_value_cents) AS total
       FROM investment i
       WHERE i.user_id = $1 AND ($2::uuid IS NULL OR i.ledger_id = $2) AND i.archived = false AND i.type <> 'ASSET'
       GROUP BY i.type
       HAVING SUM(i.current_value_cents) > 0
       ORDER BY total DESC`,
      [userId, ledgerId]
    );
    return rows.map(row => ({ type: row.type, totalCents: num(row.total) }));
  }

  /**
   * Valor atual dos bens físicos (classe `ASSET`).
   *
   * @param userId - Dono
   * @param ledgerId - Livro, ou `null`
   * @returns Soma em centavos
   */
  private async assets(userId: string, ledgerId: string | null): Promise<number> {
    const [row] = await this.dataSource.query<{ total: string | null }[]>(
      `SELECT SUM(i.current_value_cents) AS total FROM investment i
       WHERE i.user_id = $1 AND ($2::uuid IS NULL OR i.ledger_id = $2) AND i.archived = false AND i.type = 'ASSET'`,
      [userId, ledgerId]
    );
    return num(row?.total);
  }

  /**
   * Lançamentos pendentes de hoje até 30 dias à frente, incluindo os atrasados.
   *
   * @param userId - Dono
   * @param ledgerId - Livro, ou `null`
   * @returns Até 8 itens, mais próximos primeiro
   */
  private async upcoming(userId: string, ledgerId: string | null): Promise<UpcomingItem[]> {
    const limit = new Date();
    limit.setDate(limit.getDate() + UPCOMING_DAYS);
    const rows = await this.dataSource.query<{ transaction_id: string; ledger_id: string; ledger_name: string; kind: UpcomingItem['kind']; amount_cents: string; date: string; description: string }[]>(
      `SELECT t.transaction_id, t.ledger_id, l.name AS ledger_name, t.kind, t.amount_cents, to_char(t.date, 'YYYY-MM-DD') AS date, t.description
       FROM "transaction" t
       JOIN ledger l ON l.ledger_id = t.ledger_id
       WHERE ${SCOPE_SQL} AND t.status = 'PENDING' AND t.date <= $3
       ORDER BY t.date ASC
       LIMIT ${TOP_SLICES}`,
      [userId, ledgerId, toIsoDate(limit)]
    );
    return rows.map(row => ({
      transactionId: row.transaction_id,
      ledgerId: row.ledger_id,
      ledgerName: row.ledger_name,
      kind: row.kind,
      amountCents: num(row.amount_cents),
      date: row.date,
      description: row.description,
    }));
  }

  /**
   * Um bloco por livro ativo: receita e despesa do período e investimentos.
   * O caixa entra depois, somado a partir dos saldos de conta já calculados.
   *
   * @param userId - Dono
   * @param period - Intervalo
   * @returns Pessoal primeiro, depois empresas por nome, com `cashCents` zerado
   */
  private async ledgerOverviews(userId: string, period: Period): Promise<LedgerOverview[]> {
    const rows = await this.dataSource.query<{ ledger_id: string; name: string; type: LedgerOverview['type']; color: string; income: string; expense: string; investments: string; assets: string }[]>(
      `SELECT l.ledger_id, l.name, l.type, l.color,
         COALESCE(flow.income, 0) AS income,
         COALESCE(flow.expense, 0) AS expense,
         COALESCE(inv.total, 0) AS investments,
         COALESCE(inv.assets, 0) AS assets
       FROM ledger l
       LEFT JOIN (
         SELECT t.ledger_id,
           SUM(t.amount_cents) FILTER (WHERE t.kind = 'INCOME') AS income,
           SUM(t.amount_cents) FILTER (WHERE t.kind = 'EXPENSE') AS expense
         FROM "transaction" t
         WHERE t.user_id = $1 AND t.status = 'PAID' AND t.date BETWEEN $2 AND $3
         GROUP BY t.ledger_id
       ) flow ON flow.ledger_id = l.ledger_id
       LEFT JOIN (
         SELECT i.ledger_id,
           SUM(i.current_value_cents) FILTER (WHERE i.type <> 'ASSET') AS total,
           SUM(i.current_value_cents) FILTER (WHERE i.type = 'ASSET') AS assets
         FROM investment i
         WHERE i.user_id = $1 AND i.archived = false
         GROUP BY i.ledger_id
       ) inv ON inv.ledger_id = l.ledger_id
       WHERE l.user_id = $1 AND l.archived = false
       ORDER BY l.type ASC, l.name ASC`,
      [userId, period.from, period.to]
    );
    return rows.map(row => ({
      ledgerId: row.ledger_id,
      name: row.name,
      type: row.type,
      color: row.color,
      incomeCents: num(row.income),
      expenseCents: num(row.expense),
      cashCents: 0,
      investmentsCents: num(row.investments),
      assetsCents: num(row.assets),
    }));
  }
}
