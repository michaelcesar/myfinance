/**
 * Análises do realizado: gastos por categoria, fixo × variável, receitas por
 * origem e maiores gastos avulsos, comparados ao período anterior.
 *
 * @module modules/dashboard/analysis.service
 */
import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { LedgersService } from '~/modules/ledgers/ledgers.service';
import { addMonths, currentMonth } from '~/modules/recurrences/recurrence-months';
import { type ForecastQueryDto } from './dto/forecast-query.dto';
import { monthsBetween } from './forecast.projection';
import { type Analysis, type AnalysisCategory, type AnalysisOrigin } from './types/summary.types';

/** Meses para trás (além do atual) quando o período não vem. */
const DEFAULT_PAST_MONTHS = 5;

/** Maior período aceito, em meses. */
const MAX_MONTHS = 60;

/** Quantos gastos avulsos entram na lista. */
const TOP_EXPENSES = 10;

/** Lançamento pago lido para a análise. */
interface PaidRow {
  transaction_id: string;
  kind: 'INCOME' | 'EXPENSE';
  amount_cents: string;
  month: string;
  date: string;
  description: string;
  recurrence_id: string | null;
  recurrence_description: string | null;
  category_id: string | null;
  category_name: string | null;
  ledger_name: string;
}

/**
 * Monta a análise do período escolhido e do anterior de mesmo tamanho.
 *
 * @example
 * const analysis = await analysisService.analysis(userId, { from: '2026-06', to: '2026-11' });
 */
@Injectable()
export class AnalysisService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly ledgersService: LedgersService
  ) {}

  /**
   * Análise do realizado.
   *
   * @param userId - Dono
   * @param query - Meses (`YYYY-MM`) e livro opcionais
   * @returns Totais, categorias, origens e avulsos
   * @throws `BadRequestException` com período invertido ou longo demais
   *
   * @example
   * GET /dashboard/analysis?from=2026-06&to=2026-11
   */
  async analysis(userId: string, query: ForecastQueryDto): Promise<Analysis> {
    const current = currentMonth();
    const from = query.from ? `${query.from}-01` : addMonths(current, -DEFAULT_PAST_MONTHS);
    const to = query.to ? `${query.to}-01` : current;
    if (from > to) throw new BadRequestException('O mês inicial não pode ser depois do final.');
    const months = monthsBetween(from, to);
    if (months.length > MAX_MONTHS) throw new BadRequestException(`O período pode ter no máximo ${MAX_MONTHS} meses.`);
    const ledgerId = query.ledgerId ?? null;
    if (ledgerId) await this.ledgersService.findOne(userId, ledgerId);
    const previousFrom = addMonths(from, -months.length);
    const previousTo = addMonths(from, -1);

    const rows = await this.dataSource.query<PaidRow[]>(
      `SELECT t.transaction_id, t.kind, t.amount_cents, to_char(date_trunc('month', t.date), 'YYYY-MM-DD') AS month,
         to_char(t.date, 'YYYY-MM-DD') AS date, t.description, t.recurrence_id, r.description AS recurrence_description,
         t.category_id, c.name AS category_name, l.name AS ledger_name
       FROM "transaction" t
       JOIN ledger l ON l.ledger_id = t.ledger_id
       LEFT JOIN recurrence r ON r.recurrence_id = t.recurrence_id
       LEFT JOIN category c ON c.category_id = t.category_id
       WHERE t.user_id = $1 AND ($2::uuid IS NULL OR t.ledger_id = $2) AND t.status = 'PAID'
         AND t.kind IN ('INCOME', 'EXPENSE') AND t.date >= $3 AND t.date < $4`,
      [userId, ledgerId, previousFrom, addMonths(to, 1)]
    );

    const transfers = ledgerId
      ? await this.dataSource.query<{ kind: 'TRANSFER_IN' | 'TRANSFER_OUT'; amount_cents: string; month: string }[]>(
          `SELECT t.kind, t.amount_cents, to_char(date_trunc('month', t.date), 'YYYY-MM-DD') AS month
           FROM "transaction" t
           JOIN "transaction" o ON o.transfer_id = t.transfer_id AND o.transaction_id <> t.transaction_id
           WHERE t.user_id = $1 AND t.ledger_id = $2 AND t.status = 'PAID' AND t.kind IN ('TRANSFER_IN', 'TRANSFER_OUT')
             AND o.ledger_id <> t.ledger_id AND t.date >= $3 AND t.date < $4`,
          [userId, ledgerId, from, addMonths(to, 1)]
        )
      : [];

    const index = new Map(months.map((month, position) => [month, position]));
    const transferMonthly = (kind: 'TRANSFER_IN' | 'TRANSFER_OUT') => {
      const series = months.map(() => 0);
      for (const row of transfers) {
        const position = index.get(row.month);
        if (row.kind === kind && position !== undefined) series[position] += Number(row.amount_cents);
      }
      return series;
    };
    const transferInMonthly = transferMonthly('TRANSFER_IN');
    const transferOutMonthly = transferMonthly('TRANSFER_OUT');
    const inPeriod = rows.filter(row => index.has(row.month));
    const inPrevious = rows.filter(row => !index.has(row.month));
    const sum = (items: PaidRow[]) => items.reduce((total, row) => total + Number(row.amount_cents), 0);
    const expenses = inPeriod.filter(row => row.kind === 'EXPENSE');

    const categories = new Map<string, AnalysisCategory>();
    const categoryOf = (row: PaidRow) => {
      const key = row.category_id ?? 'none';
      const existing = categories.get(key);
      if (existing) return existing;
      const created: AnalysisCategory = {
        key,
        categoryId: row.category_id,
        name: row.category_name ?? 'Sem categoria',
        totalCents: 0,
        previousCents: 0,
        variableCents: 0,
        previousVariableCents: 0,
        monthly: months.map(() => 0),
      };
      categories.set(key, created);
      return created;
    };
    const origins = new Map<string, AnalysisOrigin>();
    const originOf = (row: PaidRow) => {
      const key = row.recurrence_id ?? row.category_id ?? 'none';
      const existing = origins.get(key);
      if (existing) return existing;
      const created: AnalysisOrigin = {
        key,
        recurrenceId: row.recurrence_id,
        categoryId: row.recurrence_id ? null : row.category_id,
        name: row.recurrence_description ?? row.category_name ?? 'Outras receitas',
        totalCents: 0,
        previousCents: 0,
        monthly: months.map(() => 0),
      };
      origins.set(key, created);
      return created;
    };

    for (const row of rows) {
      const amount = Number(row.amount_cents);
      const position = index.get(row.month);
      if (row.kind === 'EXPENSE') {
        const category = categoryOf(row);
        if (position === undefined) {
          category.previousCents += amount;
          if (!row.recurrence_id) category.previousVariableCents += amount;
        } else {
          category.totalCents += amount;
          category.monthly[position] += amount;
          if (!row.recurrence_id) category.variableCents += amount;
        }
      } else {
        const origin = originOf(row);
        if (position === undefined) origin.previousCents += amount;
        else {
          origin.totalCents += amount;
          origin.monthly[position] += amount;
        }
      }
    }

    const byTotal = <T extends { totalCents: number; previousCents: number }>(items: T[]) =>
      items.filter(item => item.totalCents > 0 || item.previousCents > 0).sort((a, b) => b.totalCents - a.totalCents || b.previousCents - a.previousCents);

    return {
      from,
      to,
      previousFrom,
      previousTo,
      months,
      incomeCents: sum(inPeriod.filter(row => row.kind === 'INCOME')),
      expenseCents: sum(expenses),
      previousIncomeCents: sum(inPrevious.filter(row => row.kind === 'INCOME')),
      previousExpenseCents: sum(inPrevious.filter(row => row.kind === 'EXPENSE')),
      fixedExpenseCents: sum(expenses.filter(row => row.recurrence_id)),
      variableExpenseCents: sum(expenses.filter(row => !row.recurrence_id)),
      expenseCategories: byTotal([...categories.values()]),
      incomeOrigins: byTotal([...origins.values()]),
      topExpenses: expenses
        .filter(row => !row.recurrence_id)
        .sort((a, b) => Number(b.amount_cents) - Number(a.amount_cents))
        .slice(0, TOP_EXPENSES)
        .map(row => ({
          transactionId: row.transaction_id,
          description: row.description,
          amountCents: Number(row.amount_cents),
          date: row.date,
          categoryName: row.category_name,
          ledgerName: row.ledger_name,
        })),
      transferInCents: transferInMonthly.reduce((total, value) => total + value, 0),
      transferOutCents: transferOutMonthly.reduce((total, value) => total + value, 0),
      transferInMonthly,
      transferOutMonthly,
    };
  }
}
