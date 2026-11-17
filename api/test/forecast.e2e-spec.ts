/**
 * Previsão ponta a ponta: realizado no passado, pendentes reais e projeção
 * dos recorrentes no futuro, sem contar duas vezes o mês já criado, com
 * rendimento das contas e escopo por livro.
 *
 * @module test/forecast.e2e-spec
 */
import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '~/app.module';
import { configureApp } from '~/bootstrap';
import { monthlyYieldCents } from '~/common/utils/yield.util';
import { addMonths, currentMonth, dueDate } from '~/modules/recurrences/recurrence-months';

interface Envelope<T> {
  data: T;
  error?: string;
}

interface ForecastMonth {
  month: string;
  investmentsEndCents: number;
  assetsEndCents: number;
  realized: boolean;
  incomeCents: number;
  expenseCents: number;
  resultCents: number;
  yieldCents: number;
  cashEndCents: number;
}

interface ForecastRow {
  recurrenceId: string | null;
  description: string;
  cells: Record<string, { amountCents: number; paid: boolean; projected: boolean }>;
}

interface ForecastBody {
  currentMonth: string;
  cashTodayCents: number;
  months: ForecastMonth[];
  rows: ForecastRow[];
  recurringIncomeCents: number;
  recurringExpenseCents: number;
}

describe('previsão (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let companyLedgerId: string;
  let accountId: string;
  let incomeId: string;

  const month0 = currentMonth();
  const ym = (month: string) => month.slice(0, 7);
  const api = () => request(app.getHttpServer());
  const auth = (req: request.Test, as = token) => req.set('Authorization', `Bearer ${as}`);
  const body = <T>(res: request.Response) => (res.body as Envelope<T>).data;
  const forecast = async (from: string, to: string, ledgerId = companyLedgerId, as = token) =>
    body<ForecastBody>(await auth(api().get(`/dashboard/forecast?from=${ym(from)}&to=${ym(to)}&ledgerId=${ledgerId}`), as));
  const linked = (recurrenceId: string) =>
    app.get(DataSource).query<{ transaction_id: string }[]>('SELECT transaction_id FROM "transaction" WHERE recurrence_id = $1 ORDER BY recurrence_month', [recurrenceId]);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = configureApp(moduleRef.createNestApplication());
    app.use(cookieParser());
    await app.init();
    await app.get(DataSource).query('TRUNCATE TABLE user_account CASCADE');

    token = body<{ accessToken: string }>(await api().post('/auth/register').send({ name: 'Paula Previsão', email: 'paula@previsao.test', password: 'senha-forte-1' })).accessToken;
    companyLedgerId = body<{ ledgerId: string }>(await auth(api().post('/ledgers')).send({ name: 'Paula Studio' })).ledgerId;
    accountId = body<{ accountId: string }>(
      await auth(api().post('/accounts')).send({ ledgerId: companyLedgerId, name: 'PJ', type: 'CHECKING', initialBalanceCents: 1_000_000, annualYieldRate: 12 })
    ).accountId;
    incomeId = body<{ recurrenceId: string }>(
      await auth(api().post('/recurrences')).send({ accountId, kind: 'INCOME', description: 'Contrato', amountCents: 380_000, dayOfMonth: 5, startMonth: month0, endMonth: addMonths(month0, 11) })
    ).recurrenceId;
    await auth(api().post('/recurrences')).send({ accountId, kind: 'EXPENSE', description: 'Ferramenta', amountCents: 50_000, dayOfMonth: 25, startMonth: month0 });
  });

  afterAll(async () => {
    await app.close();
  });

  it('soma criados e projetados sem contar duas vezes o mesmo mês', async () => {
    const result = await forecast(month0, addMonths(month0, 11));
    expect(result.months).toHaveLength(12);
    expect(result.months.every(month => month.incomeCents === 380_000 && month.expenseCents === 50_000)).toBe(true);
    const contract = result.rows.find(row => row.recurrenceId === incomeId);
    expect(contract?.cells[month0]).toMatchObject({ amountCents: 380_000, projected: false });
    expect(contract?.cells[addMonths(month0, 5)]).toMatchObject({ amountCents: 380_000, projected: true });
    expect(result.recurringIncomeCents).toBe(380_000);
    expect(result.recurringExpenseCents).toBe(50_000);
  });

  it('encadeia o saldo previsto com o rendimento da conta', async () => {
    const [first] = (await forecast(month0, month0)).months;
    const flows = 1_000_000 + 380_000 - 50_000;
    expect(first.yieldCents).toBe(monthlyYieldCents(flows, 12));
    expect(first.cashEndCents).toBe(flows + first.yieldCents);
  });

  it('confirmar um mês marca ✓ sem duplicar o valor', async () => {
    const [current] = await linked(incomeId);
    await auth(api().patch(`/transactions/${current.transaction_id}`)).send({ status: 'PAID', date: dueDate(month0, 3) });
    const result = await forecast(month0, month0);
    expect(result.months[0].incomeCents).toBe(380_000);
    expect(result.rows.find(row => row.recurrenceId === incomeId)?.cells[month0]).toMatchObject({ paid: true });
  });

  it('mês apagado pelo dono não volta como projeção', async () => {
    const [, second] = await linked(incomeId);
    await auth(api().delete(`/transactions/${second.transaction_id}`));
    const result = await forecast(addMonths(month0, 1), addMonths(month0, 1));
    expect(result.months[0].incomeCents).toBe(0);
  });

  it('recorrente em conta arquivada não projeta', async () => {
    const archived = body<{ accountId: string }>(await auth(api().post('/accounts')).send({ ledgerId: companyLedgerId, name: 'Velha', type: 'CHECKING' })).accountId;
    await auth(api().post('/recurrences')).send({ accountId: archived, kind: 'INCOME', description: 'Antigo', amountCents: 10_000, dayOfMonth: 1, startMonth: addMonths(month0, 4) });
    await auth(api().patch(`/accounts/${archived}`)).send({ archived: true });
    const result = await forecast(addMonths(month0, 4), addMonths(month0, 6));
    expect(result.rows.find(row => row.description === 'Antigo')).toBeUndefined();
    expect(result.months.every(month => month.incomeCents === 380_000)).toBe(true);
  });

  it('mostra o realizado nos meses passados', async () => {
    const lastMonth = addMonths(month0, -1);
    await auth(api().post('/transactions')).send({ accountId, kind: 'INCOME', amountCents: 100_000, date: dueDate(lastMonth, 10), description: 'Avulso', status: 'PAID' });
    const result = await forecast(lastMonth, month0);
    expect(result.months[0]).toMatchObject({ month: lastMonth, realized: true, incomeCents: 100_000, expenseCents: 0 });
    expect(result.rows.find(row => row.recurrenceId === null && row.cells[lastMonth])?.cells[lastMonth]).toMatchObject({ amountCents: 100_000, paid: true });
    expect(result.months[0].cashEndCents).toBe(result.cashTodayCents - 380_000);
  });

  it('filtra por livro e isola usuários', async () => {
    const personal = body<{ data: { ledgerId: string; type: string }[] }>(await auth(api().get('/ledgers'))).data.find(ledger => ledger.type === 'PERSONAL');
    const mine = await forecast(month0, addMonths(month0, 2), personal?.ledgerId);
    expect(mine.rows).toHaveLength(0);

    const other = body<{ accessToken: string }>(await api().post('/auth/register').send({ name: 'Outra', email: 'outra@previsao.test', password: 'senha-forte-1' })).accessToken;
    const res = await auth(api().get(`/dashboard/forecast?from=${ym(month0)}&to=${ym(month0)}`), other);
    expect(body<ForecastBody>(res).rows).toHaveLength(0);
  });

  it('investimento cadastrado com valor atual, sem aportes, já existia no passado', async () => {
    const ledgerId = body<{ ledgerId: string }>(await auth(api().post('/ledgers')).send({ name: 'Holding' })).ledgerId;
    await auth(api().post('/investments')).send({ ledgerId, name: 'CDB antigo', type: 'FIXED_INCOME', currentValueCents: 20_000_000 });
    const car = body<{ investmentId: string }>(await auth(api().post('/investments')).send({ ledgerId, name: 'Carro', type: 'ASSET' }));
    await auth(api().post(`/investments/${car.investmentId}/movements`)).send({ kind: 'CONTRIBUTION', amountCents: 8_000_000, date: dueDate(month0, 1) });
    const [past] = (await forecast(addMonths(month0, -3), addMonths(month0, -3), ledgerId)).months;
    expect(past).toMatchObject({ investmentsEndCents: 20_000_000, assetsEndCents: 0 });
  });

  it('conta arquivada depois de transferir o saldo não distorce o passado', async () => {
    const ledgerId = body<{ ledgerId: string }>(await auth(api().post('/ledgers')).send({ name: 'Troca de banco' })).ledgerId;
    const old = body<{ accountId: string }>(await auth(api().post('/accounts')).send({ ledgerId, name: 'Banco velho', type: 'CHECKING', initialBalanceCents: 1_000_000 })).accountId;
    const fresh = body<{ accountId: string }>(await auth(api().post('/accounts')).send({ ledgerId, name: 'Banco novo', type: 'CHECKING' })).accountId;
    await auth(api().post('/transfers')).send({ fromAccountId: old, toAccountId: fresh, amountCents: 1_000_000, date: dueDate(addMonths(month0, -1), 10), kind: 'INTERNAL' });
    await auth(api().patch(`/accounts/${old}`)).send({ archived: true });
    const result = await forecast(addMonths(month0, -2), month0, ledgerId);
    expect(result.months.map(month => month.cashEndCents)).toEqual([1_000_000, 1_000_000, 1_000_000]);
  });

  it('pendentes de conta arquivada não entram nas entradas', async () => {
    const ledgerId = body<{ ledgerId: string }>(await auth(api().post('/ledgers')).send({ name: 'Empresa fechada' })).ledgerId;
    const closing = body<{ accountId: string }>(await auth(api().post('/accounts')).send({ ledgerId, name: 'PJ fechada', type: 'CHECKING' })).accountId;
    await auth(api().post('/recurrences')).send({ accountId: closing, kind: 'INCOME', description: 'Contrato encerrado', amountCents: 900_000, dayOfMonth: 28, startMonth: month0 });
    await auth(api().patch(`/accounts/${closing}`)).send({ archived: true });
    const result = await forecast(month0, addMonths(month0, 2), ledgerId);
    expect(result.months.map(month => month.incomeCents)).toEqual([0, 0, 0]);
    expect(result.rows).toHaveLength(0);
  });

  it('recusa taxa de 1000% sem quebrar', async () => {
    const res = await auth(api().post('/accounts')).send({ ledgerId: companyLedgerId, name: 'Taxa limite', type: 'SAVINGS', annualYieldRate: 1000 });
    expect(res.status).toBe(400);
  });

  it('recusa período invertido', async () => {
    const res = await auth(api().get(`/dashboard/forecast?from=${ym(addMonths(month0, 2))}&to=${ym(month0)}`));
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toMatch(/O mês inicial não pode ser depois do final/);
  });
});
