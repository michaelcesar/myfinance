/**
 * Análises ponta a ponta: gastos por categoria contra o período anterior,
 * fixo × variável, receitas por origem com a série mensal, maiores gastos
 * avulsos, escopo por livro e transferências fora.
 *
 * @module test/analysis.e2e-spec
 */
import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '~/app.module';
import { configureApp } from '~/bootstrap';
import { addMonths, currentMonth, dueDate } from '~/modules/recurrences/recurrence-months';

interface Envelope<T> {
  data: T;
}

interface AnalysisBody {
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
  expenseCategories: { key: string; name: string; totalCents: number; previousCents: number; variableCents: number; monthly: number[] }[];
  incomeOrigins: { key: string; recurrenceId: string | null; name: string; totalCents: number; monthly: number[] }[];
  topExpenses: { description: string; amountCents: number }[];
  transferInCents: number;
  transferOutCents: number;
  transferInMonthly: number[];
  transferOutMonthly: number[];
}

describe('análises (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let ledgerId: string;
  let accountId: string;
  let otherAccountId: string;
  let market: string;
  let rent: string;
  let salary: string;

  const month0 = currentMonth();
  const ym = (month: string) => month.slice(0, 7);
  const api = () => request(app.getHttpServer());
  const auth = (req: request.Test, as = token) => req.set('Authorization', `Bearer ${as}`);
  const body = <T>(res: request.Response) => (res.body as Envelope<T>).data;
  const paid = (account: string, kind: 'INCOME' | 'EXPENSE', amountCents: number, month: string, description: string, categoryId?: string) =>
    auth(api().post('/transactions')).send({ accountId: account, kind, amountCents, date: dueDate(month, 10), description, status: 'PAID', ...(categoryId ? { categoryId } : {}) });
  const analysis = async (from: string, to: string, ledger = ledgerId) => body<AnalysisBody>(await auth(api().get(`/dashboard/analysis?from=${ym(from)}&to=${ym(to)}&ledgerId=${ledger}`)));

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = configureApp(moduleRef.createNestApplication());
    app.use(cookieParser());
    await app.init();
    await app.get(DataSource).query('TRUNCATE TABLE user_account CASCADE');

    token = body<{ accessToken: string }>(await api().post('/auth/register').send({ name: 'Ana Análise', email: 'ana@analise.test', password: 'senha-forte-1' })).accessToken;
    ledgerId = body<{ data: { ledgerId: string; type: string }[] }>(await auth(api().get('/ledgers'))).data.find(ledger => ledger.type === 'PERSONAL')!.ledgerId;
    accountId = body<{ accountId: string }>(await auth(api().post('/accounts')).send({ ledgerId, name: 'Nubank', type: 'CHECKING' })).accountId;
    const company = body<{ ledgerId: string }>(await auth(api().post('/ledgers')).send({ name: 'Firma' })).ledgerId;
    otherAccountId = body<{ accountId: string }>(await auth(api().post('/accounts')).send({ ledgerId: company, name: 'PJ', type: 'CHECKING' })).accountId;

    const categories = body<{ data: { categoryId: string; name: string; kind: string }[] }>(await auth(api().get('/categories?limit=100'))).data;
    market = categories.find(category => category.name === 'Mercado')!.categoryId;
    rent = categories.find(category => category.name === 'Moradia')!.categoryId;
    salary = categories.find(category => category.name === 'Salário')!.categoryId;

    const previous = addMonths(month0, -2);
    await paid(accountId, 'EXPENSE', 50_000, previous, 'Mercado antigo', market);
    await paid(accountId, 'EXPENSE', 30_000, month0, 'Mercado A', market);
    await paid(accountId, 'EXPENSE', 50_000, month0, 'Mercado B', market);
    await paid(accountId, 'INCOME', 500_000, month0, 'Salário', salary);
    await paid(otherAccountId, 'EXPENSE', 999_000, month0, 'Outra firma', market);
    await auth(api().post('/transfers')).send({ fromAccountId: accountId, toAccountId: otherAccountId, amountCents: 77_000, date: dueDate(month0, 11), kind: 'INTERNAL' });

    const recurrence = body<{ recurrenceId: string }>(
      await auth(api().post('/recurrences')).send({ accountId, kind: 'EXPENSE', description: 'Aluguel', amountCents: 200_000, dayOfMonth: 5, startMonth: month0, categoryId: rent })
    );
    const [current] = await app
      .get(DataSource)
      .query<{ transaction_id: string }[]>('SELECT transaction_id FROM "transaction" WHERE recurrence_id = $1 ORDER BY recurrence_month', [recurrence.recurrenceId]);
    await auth(api().patch(`/transactions/${current.transaction_id}`)).send({ status: 'PAID' });
    const income = body<{ recurrenceId: string }>(
      await auth(api().post('/recurrences')).send({ accountId, kind: 'INCOME', description: 'Contrato X', amountCents: 300_000, dayOfMonth: 1, startMonth: month0 })
    );
    const [incomeRow] = await app
      .get(DataSource)
      .query<{ transaction_id: string }[]>('SELECT transaction_id FROM "transaction" WHERE recurrence_id = $1 ORDER BY recurrence_month', [income.recurrenceId]);
    await auth(api().patch(`/transactions/${incomeRow.transaction_id}`)).send({ status: 'PAID' });
  });

  afterAll(async () => {
    await app.close();
  });

  it('soma gastos por categoria e compara com o período anterior do mesmo tamanho', async () => {
    const result = await analysis(addMonths(month0, -1), month0);
    expect(result.months).toEqual([addMonths(month0, -1), month0]);
    expect(result.previousFrom).toBe(addMonths(month0, -3));
    expect(result.previousTo).toBe(addMonths(month0, -2));
    const mercado = result.expenseCategories.find(category => category.name === 'Mercado');
    expect(mercado).toMatchObject({ totalCents: 80_000, previousCents: 50_000, variableCents: 80_000, monthly: [0, 80_000] });
  });

  it('separa fixo (recorrente) de variável e deixa transferências fora', async () => {
    const result = await analysis(month0, month0);
    expect(result.fixedExpenseCents).toBe(200_000);
    expect(result.variableExpenseCents).toBe(80_000);
    expect(result.expenseCents).toBe(280_000);
    expect(result.incomeCents).toBe(800_000);
  });

  it('agrupa receitas pelo recorrente ou pela categoria, com a série mensal', async () => {
    const result = await analysis(addMonths(month0, -1), month0);
    expect(result.incomeOrigins.find(origin => origin.name === 'Contrato X')).toMatchObject({ totalCents: 300_000, monthly: [0, 300_000] });
    expect(result.incomeOrigins.find(origin => origin.name === 'Salário')).toMatchObject({ recurrenceId: null, totalCents: 500_000 });
    expect(result.incomeOrigins[0].totalCents).toBeGreaterThanOrEqual(result.incomeOrigins[1].totalCents);
  });

  it('lista os maiores gastos avulsos, sem recorrentes, do maior para o menor', async () => {
    const result = await analysis(month0, month0);
    expect(result.topExpenses.map(item => item.description)).toEqual(['Mercado B', 'Mercado A']);
  });

  it('respeita o livro', async () => {
    const all = body<AnalysisBody>(await auth(api().get(`/dashboard/analysis?from=${ym(month0)}&to=${ym(month0)}`)));
    expect(all.expenseCents).toBe(280_000 + 999_000);
  });

  it('com um livro só, mostra o que entrou e saiu de outros livros (pró-labore), sem virar receita', async () => {
    await auth(api().post('/transfers')).send({ fromAccountId: otherAccountId, toAccountId: accountId, amountCents: 600_000, date: dueDate(month0, 15), kind: 'PRO_LABORE' });
    const personal = await analysis(addMonths(month0, -1), month0);
    expect(personal).toMatchObject({ transferInCents: 600_000, transferInMonthly: [0, 600_000], incomeCents: 800_000 });
    expect(personal.transferOutCents).toBe(77_000);
    const all = body<AnalysisBody>(await auth(api().get(`/dashboard/analysis?from=${ym(month0)}&to=${ym(month0)}`)));
    expect(all).toMatchObject({ transferInCents: 0, transferOutCents: 0 });
  });

  it('recusa período invertido', async () => {
    const res = await auth(api().get(`/dashboard/analysis?from=${ym(month0)}&to=${ym(addMonths(month0, -1))}`));
    expect(res.status).toBe(400);
  });
});
