/**
 * Previsão: realizado no passado e, do mês atual em diante, pendentes reais
 * mais a projeção dos recorrentes, com o saldo encadeado e o rendimento das
 * contas.
 *
 * @module modules/dashboard/forecast.service
 */
import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { monthlyYieldCents } from '~/common/utils';
import { LedgersService } from '~/modules/ledgers/ledgers.service';
import { addMonths, currentMonth } from '~/modules/recurrences/recurrence-months';
import { type ForecastQueryDto } from './dto/forecast-query.dto';
import { monthsBetween, projectRecurrence } from './forecast.projection';
import { type Forecast, type ForecastMonth, type ForecastRow } from './types/summary.types';

/** Meses para trás e para a frente quando o período não vem. */
const DEFAULT_PAST_MONTHS = 11;
const DEFAULT_FUTURE_MONTHS = 12;

/** Maior período aceito, em meses. */
const MAX_MONTHS = 60;

/** Sinal do lançamento no saldo da conta. */
const SIGNED_AMOUNT = `CASE WHEN t.kind IN ('INCOME', 'TRANSFER_IN') THEN t.amount_cents ELSE -t.amount_cents END`;

/** Rótulo das linhas de lançamentos sem recorrente. */
const OTHER_LABEL: Record<'INCOME' | 'EXPENSE', string> = { INCOME: 'Outras receitas', EXPENSE: 'Outras despesas' };

type Kind = 'INCOME' | 'EXPENSE';

/** Lançamento de receita/despesa lido para a previsão. */
interface FlowRow {
  kind: Kind;
  amount_cents: string;
  month: string;
  account_id: string;
  recurrence_id: string | null;
  recurrence_description: string | null;
  ledger_name: string;
}

/** Recorrente ativo (conta e livro não arquivados). */
interface RecurrenceRow {
  recurrence_id: string;
  kind: Kind;
  description: string;
  amount_cents: string;
  start_month: string;
  end_month: string | null;
  account_id: string;
  ledger_name: string;
}

const num = (value: string | number | null | undefined): number => Number(value ?? 0);

/**
 * Monta a série mensal da previsão para um usuário, opcionalmente num livro.
 *
 * @example
 * const forecast = await forecastService.forecast(userId, { from: '2026-11', to: '2027-10' });
 */
@Injectable()
export class ForecastService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly ledgersService: LedgersService
  ) {}

  /**
   * Previsão do período.
   *
   * @param userId - Dono
   * @param query - Meses (`YYYY-MM`) e livro opcionais
   * @returns Meses, linhas da tabela e números de apoio
   * @throws `BadRequestException` com período invertido ou longo demais
   *
   * @example
   * GET /dashboard/forecast?from=2026-11&to=2027-10&ledgerId=6f1c...
   */
  async forecast(userId: string, query: ForecastQueryDto): Promise<Forecast> {
    const current = currentMonth();
    const from = query.from ? `${query.from}-01` : addMonths(current, -DEFAULT_PAST_MONTHS);
    const to = query.to ? `${query.to}-01` : addMonths(current, DEFAULT_FUTURE_MONTHS);
    if (from > to) throw new BadRequestException('O mês inicial não pode ser depois do final.');
    const months = monthsBetween(from, to);
    if (months.length > MAX_MONTHS) throw new BadRequestException(`O período pode ter no máximo ${MAX_MONTHS} meses.`);
    const ledgerId = query.ledgerId ?? null;
    if (ledgerId) await this.ledgersService.findOne(userId, ledgerId);

    const scope = [userId, ledgerId];
    const [accounts, paidDeltas, paid, pending, recurrences, taken, investments, investmentDeltas] = await Promise.all([
      this.dataSource.query<{ account_id: string; annual_yield_rate: string | null; archived: boolean; balance: string }[]>(
        `SELECT a.account_id, a.annual_yield_rate, a.archived,
           a.initial_balance_cents + COALESCE(SUM(${SIGNED_AMOUNT}) FILTER (WHERE t.status = 'PAID'), 0) AS balance
         FROM account a LEFT JOIN "transaction" t ON t.account_id = a.account_id
         WHERE a.user_id = $1 AND ($2::uuid IS NULL OR a.ledger_id = $2)
         GROUP BY a.account_id`,
        scope
      ),
      this.dataSource.query<{ month: string; delta: string }[]>(
        `SELECT to_char(date_trunc('month', t.date), 'YYYY-MM-DD') AS month, SUM(${SIGNED_AMOUNT}) AS delta
         FROM "transaction" t JOIN account a ON a.account_id = t.account_id
         WHERE t.user_id = $1 AND ($2::uuid IS NULL OR a.ledger_id = $2) AND t.status = 'PAID'
         GROUP BY 1`,
        scope
      ),
      this.flows(userId, ledgerId, `t.status = 'PAID' AND t.date >= $3 AND t.date < $4`, [from, addMonths(to, 1)]),
      this.flows(userId, ledgerId, `t.status = 'PENDING' AND a.archived = false AND l.archived = false`, []),
      this.dataSource.query<RecurrenceRow[]>(
        `SELECT r.recurrence_id, r.kind, r.description, r.amount_cents, to_char(r.start_month, 'YYYY-MM-DD') AS start_month,
           to_char(r.end_month, 'YYYY-MM-DD') AS end_month, r.account_id, l.name AS ledger_name
         FROM recurrence r JOIN account a ON a.account_id = r.account_id JOIN ledger l ON l.ledger_id = a.ledger_id
         WHERE r.user_id = $1 AND ($2::uuid IS NULL OR r.ledger_id = $2) AND a.archived = false AND l.archived = false`,
        scope
      ),
      this.dataSource.query<{ recurrence_id: string; month: string }[]>(
        `SELECT recurrence_id, to_char(recurrence_month, 'YYYY-MM-DD') AS month FROM "transaction" WHERE user_id = $1 AND recurrence_id IS NOT NULL
         UNION SELECT recurrence_id, to_char(month, 'YYYY-MM-DD') FROM recurrence_skip WHERE user_id = $1`,
        [userId]
      ),
      this.dataSource.query<{ investment_id: string; is_asset: boolean; archived: boolean; current_value_cents: string }[]>(
        `SELECT i.investment_id, i.type = 'ASSET' AS is_asset, i.archived, i.current_value_cents FROM investment i
         WHERE i.user_id = $1 AND ($2::uuid IS NULL OR i.ledger_id = $2)`,
        scope
      ),
      this.dataSource.query<{ investment_id: string; month: string; delta: string }[]>(
        `SELECT m.investment_id, to_char(date_trunc('month', m.date), 'YYYY-MM-DD') AS month,
           SUM(CASE WHEN m.kind = 'WITHDRAWAL' THEN -m.amount_cents ELSE m.amount_cents END) AS delta
         FROM investment_movement m JOIN investment i ON i.investment_id = m.investment_id
         WHERE i.user_id = $1 AND ($2::uuid IS NULL OR i.ledger_id = $2)
         GROUP BY 1, 2`,
        scope
      ),
    ]);

    const activeAccounts = accounts.filter(account => !account.archived);
    const cashTodayCents = activeAccounts.reduce((sum, account) => sum + num(account.balance), 0);
    const cashTodayAllCents = accounts.reduce((sum, account) => sum + num(account.balance), 0);
    const currentValue = (asset: boolean) => investments.filter(row => !row.archived && row.is_asset === asset).reduce((sum, row) => sum + num(row.current_value_cents), 0);
    const investmentsCents = currentValue(false);
    const assetsCents = currentValue(true);
    const takenByRecurrence = new Map<string, Set<string>>();
    for (const row of taken) takenByRecurrence.set(row.recurrence_id, (takenByRecurrence.get(row.recurrence_id) ?? new Set()).add(row.month));

    const lastMonth = to > current ? to : current;
    const futureMonths = monthsBetween(current, lastMonth);
    const projections = recurrences.map(recurrence => ({
      recurrence,
      byMonth: projectRecurrence(
        { startMonth: recurrence.start_month, endMonth: recurrence.end_month, amountCents: num(recurrence.amount_cents) },
        futureMonths,
        takenByRecurrence.get(recurrence.recurrence_id) ?? new Set(),
        current
      ),
    }));
    const pendingMonth = (row: FlowRow) => (row.month < current ? current : row.month);

    const flowsIn = new Map<string, { income: number; expense: number }>();
    const addFlow = (month: string, kind: Kind, amount: number) => {
      const entry = flowsIn.get(month) ?? { income: 0, expense: 0 };
      if (kind === 'INCOME') entry.income += amount;
      else entry.expense += amount;
      flowsIn.set(month, entry);
    };
    for (const row of paid) addFlow(row.month, row.kind, num(row.amount_cents));
    for (const row of pending) addFlow(pendingMonth(row), row.kind, num(row.amount_cents));
    for (const { recurrence, byMonth } of projections) for (const [month, amount] of byMonth) addFlow(month, recurrence.kind, amount);

    const cashByMonth = new Map<string, { cash: number; yield: number }>();
    const balances = new Map(activeAccounts.map(account => [account.account_id, num(account.balance)]));
    const rates = new Map(activeAccounts.map(account => [account.account_id, account.annual_yield_rate === null ? null : Number(account.annual_yield_rate)]));
    for (const month of futureMonths) {
      const move = (accountId: string, kind: Kind, amount: number) => {
        if (balances.has(accountId)) balances.set(accountId, (balances.get(accountId) ?? 0) + (kind === 'INCOME' ? amount : -amount));
      };
      for (const row of pending) if (pendingMonth(row) === month) move(row.account_id, row.kind, num(row.amount_cents));
      for (const { recurrence, byMonth } of projections) {
        const amount = byMonth.get(month);
        if (amount !== undefined) move(recurrence.account_id, recurrence.kind, amount);
      }
      let monthYield = 0;
      for (const [accountId, balance] of balances) {
        const earned = monthlyYieldCents(balance, rates.get(accountId) ?? null);
        balances.set(accountId, balance + earned);
        monthYield += earned;
      }
      cashByMonth.set(month, { cash: [...balances.values()].reduce((sum, value) => sum + value, 0), yield: monthYield });
    }

    const deltaAfter = (month: string) => paidDeltas.filter(row => row.month > month).reduce((sum, row) => sum + num(row.delta), 0);
    const valuedAt = (month: string, asset: boolean) =>
      investments
        .filter(row => row.is_asset === asset)
        .reduce((sum, row) => {
          const later = investmentDeltas.filter(delta => delta.investment_id === row.investment_id && delta.month > month).reduce((total, delta) => total + num(delta.delta), 0);
          return sum + Math.max(0, num(row.current_value_cents) - later);
        }, 0);

    const forecastMonths: ForecastMonth[] = months.map(month => {
      const flows = flowsIn.get(month) ?? { income: 0, expense: 0 };
      const realized = month < current;
      const cashEndCents = realized ? cashTodayAllCents - deltaAfter(month) : (cashByMonth.get(month)?.cash ?? cashTodayCents);
      const investmentsEndCents = realized ? valuedAt(month, false) : investmentsCents;
      const assetsEndCents = realized ? valuedAt(month, true) : assetsCents;
      return {
        month,
        realized,
        incomeCents: flows.income,
        expenseCents: flows.expense,
        resultCents: flows.income - flows.expense,
        yieldCents: realized ? 0 : (cashByMonth.get(month)?.yield ?? 0),
        cashEndCents,
        investmentsEndCents,
        assetsEndCents,
        netWorthEndCents: cashEndCents + investmentsEndCents + assetsEndCents,
      };
    });

    const active = recurrences.filter(recurrence => recurrence.start_month <= current && (recurrence.end_month === null || recurrence.end_month >= current));
    const recurringTotal = (kind: Kind) => active.filter(recurrence => recurrence.kind === kind).reduce((sum, recurrence) => sum + num(recurrence.amount_cents), 0);

    return {
      from,
      to,
      currentMonth: current,
      cashTodayCents,
      investmentsCents,
      assetsCents,
      months: forecastMonths,
      rows: this.rows(
        months,
        paid,
        pending.map(row => ({ ...row, month: pendingMonth(row) })),
        projections
      ),
      recurringIncomeCents: recurringTotal('INCOME'),
      recurringExpenseCents: recurringTotal('EXPENSE'),
    };
  }

  /**
   * Receitas e despesas (sem transferências) do escopo, com o recorrente e o livro.
   *
   * @param userId - Dono
   * @param ledgerId - Livro, ou `null`
   * @param condition - Filtro extra sobre `t` (parâmetros a partir de `$3`)
   * @param params - Parâmetros do filtro extra
   * @returns Lançamentos com o mês (`YYYY-MM-01`)
   */
  private flows(userId: string, ledgerId: string | null, condition: string, params: unknown[]): Promise<FlowRow[]> {
    return this.dataSource.query<FlowRow[]>(
      `SELECT t.kind, t.amount_cents, t.account_id, to_char(date_trunc('month', t.date), 'YYYY-MM-DD') AS month,
         t.recurrence_id, r.description AS recurrence_description, l.name AS ledger_name
       FROM "transaction" t JOIN ledger l ON l.ledger_id = t.ledger_id JOIN account a ON a.account_id = t.account_id
       LEFT JOIN recurrence r ON r.recurrence_id = t.recurrence_id
       WHERE t.user_id = $1 AND ($2::uuid IS NULL OR t.ledger_id = $2) AND t.kind IN ('INCOME', 'EXPENSE') AND ${condition}`,
      [userId, ledgerId, ...params]
    );
  }

  /**
   * Tabela recorrentes × meses: valores pagos, pendentes e projetados por
   * linha, só nos meses do período. Lançamentos sem recorrente viram
   * "Outras receitas"/"Outras despesas".
   *
   * @param months - Meses do período
   * @param paid - Pagos do período
   * @param pending - Pendentes, já no mês em que contam
   * @param projections - Projeção por recorrente
   * @returns Linhas: receitas antes de despesas, recorrentes por nome, avulsos por último
   */
  private rows(months: string[], paid: FlowRow[], pending: FlowRow[], projections: { recurrence: RecurrenceRow; byMonth: Map<string, number> }[]): ForecastRow[] {
    const inPeriod = new Set(months);
    const rows = new Map<string, ForecastRow>();
    const rowFor = (kind: Kind, recurrenceId: string | null, description: string | null, ledgerName: string | null): ForecastRow => {
      const key = recurrenceId ?? `other-${kind.toLowerCase()}`;
      const existing = rows.get(key);
      if (existing) return existing;
      const row: ForecastRow = { key, recurrenceId, description: recurrenceId ? (description ?? '') : OTHER_LABEL[kind], kind, ledgerName: recurrenceId ? ledgerName : null, cells: {} };
      rows.set(key, row);
      return row;
    };
    const put = (row: ForecastRow, month: string, amount: number, paidCell: boolean, projected: boolean) => {
      if (!inPeriod.has(month)) return;
      const cell = row.cells[month] ?? { amountCents: 0, paid: false, projected };
      row.cells[month] = { amountCents: cell.amountCents + amount, paid: cell.paid || paidCell, projected: cell.projected && projected };
    };
    for (const flow of paid) put(rowFor(flow.kind, flow.recurrence_id, flow.recurrence_description, flow.ledger_name), flow.month, num(flow.amount_cents), true, false);
    for (const flow of pending) put(rowFor(flow.kind, flow.recurrence_id, flow.recurrence_description, flow.ledger_name), flow.month, num(flow.amount_cents), false, false);
    for (const { recurrence, byMonth } of projections) {
      for (const [month, amount] of byMonth) put(rowFor(recurrence.kind, recurrence.recurrence_id, recurrence.description, recurrence.ledger_name), month, amount, false, true);
    }
    return [...rows.values()]
      .filter(row => Object.keys(row.cells).length > 0)
      .sort((a, b) => a.kind.localeCompare(b.kind) * -1 || Number(a.recurrenceId === null) - Number(b.recurrenceId === null) || a.description.localeCompare(b.description));
  }
}
