/**
 * Recorrentes ponta a ponta: o cadastro gera o mês atual e os dois seguintes
 * como pendentes, reajusta só o que é futuro e pendente, encerra e reabre,
 * nunca duplica nem toca em pago. As datas esperadas saem da mesma
 * matemática de meses do serviço, para o teste valer em qualquer dia.
 *
 * @module test/recurrences.e2e-spec
 */
import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '~/app.module';
import { configureApp } from '~/bootstrap';
import { addMonths, currentMonth, dueDate, todayIso } from '~/modules/recurrences/recurrence-months';
import { RecurrencesService } from '~/modules/recurrences/recurrences.service';

interface Envelope<T> {
  success: boolean;
  data: T;
  error?: string | string[];
}

interface RecurrenceBody {
  recurrenceId: string;
  nextDate: string | null;
  pendingCount: number;
}

interface LinkedRow {
  transaction_id: string;
  status: string;
  kind: string;
  amount_cents: string;
  date: string;
  month: string;
}

describe('recorrentes (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let token: string;
  let otherToken: string;
  let companyLedgerId: string;
  let companyAccountId: string;
  let personalAccountId: string;
  let incomeCategoryId: string;
  let expenseCategoryId: string;

  const month0 = currentMonth();
  const months = [month0, addMonths(month0, 1), addMonths(month0, 2)];

  const api = () => request(app.getHttpServer());
  const auth = (req: request.Test, as = token) => req.set('Authorization', `Bearer ${as}`);
  const body = <T>(res: request.Response) => (res.body as Envelope<T>).data;
  const linked = (recurrenceId: string) =>
    dataSource.query<LinkedRow[]>(
      `SELECT transaction_id, status, kind, amount_cents, to_char(date, 'YYYY-MM-DD') AS date, to_char(recurrence_month, 'YYYY-MM-DD') AS month
       FROM "transaction" WHERE recurrence_id = $1 ORDER BY recurrence_month`,
      [recurrenceId]
    );
  const contract = (overrides: Record<string, unknown> = {}) => ({
    accountId: companyAccountId,
    kind: 'INCOME',
    description: 'Contrato Acme',
    amountCents: 900000,
    dayOfMonth: 10,
    startMonth: month0,
    ...overrides,
  });
  const create = async (overrides: Record<string, unknown> = {}) => {
    const res = await auth(api().post('/recurrences')).send(contract(overrides));
    expect(res.status).toBe(201);
    return body<RecurrenceBody>(res);
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = configureApp(moduleRef.createNestApplication());
    app.use(cookieParser());
    await app.init();
    dataSource = app.get(DataSource);
    await dataSource.query('TRUNCATE TABLE user_account CASCADE');

    token = body<{ accessToken: string }>(await api().post('/auth/register').send({ name: 'Rita Recorrente', email: 'rita@recorrente.test', password: 'senha-forte-1' })).accessToken;
    otherToken = body<{ accessToken: string }>(await api().post('/auth/register').send({ name: 'Outro', email: 'outro@recorrente.test', password: 'senha-forte-1' })).accessToken;

    const personal = body<{ data: { ledgerId: string }[] }>(await auth(api().get('/ledgers'))).data[0];
    companyLedgerId = body<{ ledgerId: string }>(await auth(api().post('/ledgers')).send({ name: 'Rita Studio' })).ledgerId;
    companyAccountId = body<{ accountId: string }>(await auth(api().post('/accounts')).send({ ledgerId: companyLedgerId, name: 'Itaú PJ', type: 'CHECKING' })).accountId;
    personalAccountId = body<{ accountId: string }>(await auth(api().post('/accounts')).send({ ledgerId: personal.ledgerId, name: 'Nubank', type: 'CHECKING' })).accountId;
    incomeCategoryId = body<{ data: { categoryId: string }[] }>(await auth(api().get('/categories?filter.kind=$eq:INCOME&limit=100'))).data[0].categoryId;
    expenseCategoryId = body<{ data: { categoryId: string }[] }>(await auth(api().get('/categories?filter.kind=$eq:EXPENSE&limit=100'))).data[0].categoryId;
  });

  afterAll(async () => {
    await app.close();
  });

  it('cria e gera o mês atual e os 2 seguintes como pendentes', async () => {
    const recurrence = await create({ categoryId: incomeCategoryId });
    const rows = await linked(recurrence.recurrenceId);
    expect(rows.map(row => row.month)).toEqual(months);
    expect(rows.map(row => row.date)).toEqual(months.map(month => dueDate(month, 10)));
    expect(rows.every(row => row.status === 'PENDING' && row.kind === 'INCOME' && row.amount_cents === '900000')).toBe(true);
    expect(recurrence.pendingCount).toBe(3);
  });

  it('não cria meses passados quando o início é antigo', async () => {
    const recurrence = await create({ startMonth: addMonths(month0, -5) });
    expect((await linked(recurrence.recurrenceId)).map(row => row.month)).toEqual(months);
  });

  it('não duplica ao gerar de novo, nem em paralelo', async () => {
    const recurrence = await create();
    const service = app.get(RecurrencesService);
    await Promise.all([service.materialize(), service.materialize(), service.materialize({ recurrenceId: recurrence.recurrenceId })]);
    expect(await linked(recurrence.recurrenceId)).toHaveLength(3);
  });

  it('reajusta só pendentes de hoje em diante e nunca pagos', async () => {
    const recurrence = await create({ dayOfMonth: 28 });
    const [first] = await linked(recurrence.recurrenceId);
    await dataSource.query(`UPDATE "transaction" SET status = 'PAID' WHERE transaction_id = $1`, [first.transaction_id]);

    const res = await auth(api().patch(`/recurrences/${recurrence.recurrenceId}`)).send({ amountCents: 950000 });
    expect(res.status).toBe(200);

    const rows = await linked(recurrence.recurrenceId);
    expect(rows[0]).toMatchObject({ status: 'PAID', amount_cents: '900000' });
    expect(rows.slice(1).map(row => row.amount_cents)).toEqual(['950000', '950000']);
  });

  it('encerrar remove os pendentes depois do fim e reabrir traz de volta', async () => {
    const recurrence = await create();
    await auth(api().patch(`/recurrences/${recurrence.recurrenceId}`)).send({ endMonth: month0 });
    expect((await linked(recurrence.recurrenceId)).map(row => row.month)).toEqual([month0]);

    await auth(api().patch(`/recurrences/${recurrence.recurrenceId}`)).send({ endMonth: null });
    expect((await linked(recurrence.recurrenceId)).map(row => row.month)).toEqual(months);
  });

  it('mover o início para depois remove os pendentes anteriores', async () => {
    const recurrence = await create();
    await auth(api().patch(`/recurrences/${recurrence.recurrenceId}`)).send({ startMonth: months[1] });
    expect((await linked(recurrence.recurrenceId)).map(row => row.month)).toEqual(months.slice(1));
  });

  it('não gera nada com o fim no passado, nem depois de editar', async () => {
    const recurrence = await create({ startMonth: addMonths(month0, -6), endMonth: addMonths(month0, -1) });
    expect(recurrence).toMatchObject({ pendingCount: 0, nextDate: null });
    await auth(api().patch(`/recurrences/${recurrence.recurrenceId}`)).send({ description: 'Contrato antigo' });
    expect(await linked(recurrence.recurrenceId)).toHaveLength(0);
  });

  it('excluir apaga os pendentes futuros e mantém os pagos sem vínculo', async () => {
    const recurrence = await create();
    const [first] = await linked(recurrence.recurrenceId);
    await dataSource.query(`UPDATE "transaction" SET status = 'PAID' WHERE transaction_id = $1`, [first.transaction_id]);

    expect((await auth(api().delete(`/recurrences/${recurrence.recurrenceId}`))).status).toBe(200);

    const [paid] = await dataSource.query<{ recurrence_id: string | null; status: string }[]>('SELECT recurrence_id, status FROM "transaction" WHERE transaction_id = $1', [first.transaction_id]);
    expect(paid).toEqual({ recurrence_id: null, status: 'PAID' });
    expect(await linked(recurrence.recurrenceId)).toHaveLength(0);
  });

  it('recusa vínculos que não combinam', async () => {
    const wrongCategory = await auth(api().post('/recurrences')).send(contract({ categoryId: expenseCategoryId }));
    expect(wrongCategory.status).toBe(400);
    expect((wrongCategory.body as Envelope<unknown>).error).toMatch(/categoria não combina/);

    const inverted = await auth(api().post('/recurrences')).send(contract({ startMonth: months[2], endMonth: month0 }));
    expect(inverted.status).toBe(400);
    expect((inverted.body as Envelope<unknown>).error).toMatch(/O fim não pode ser antes do início/);

    expect((await auth(api().post('/recurrences')).send(contract({ dayOfMonth: 32 }))).status).toBe(400);
  });

  it('não deixa mudar o tipo do recorrente', async () => {
    const recurrence = await create();
    expect((await auth(api().patch(`/recurrences/${recurrence.recurrenceId}`)).send({ kind: 'EXPENSE' })).status).toBe(400);
    expect((await linked(recurrence.recurrenceId)).every(row => row.kind === 'INCOME')).toBe(true);
  });

  it('recusa apagar conta ou livro em uso por um recorrente com 409', async () => {
    const account = await auth(api().delete(`/accounts/${companyAccountId}`));
    expect(account.status).toBe(409);
    expect((account.body as Envelope<unknown>).error).toBe('O registro está em uso por outros dados.');
    expect((await auth(api().delete(`/ledgers/${companyLedgerId}`))).status).toBe(409);
  });

  it('isola os recorrentes por usuário', async () => {
    const recurrence = await create();
    expect((await auth(api().get(`/recurrences/${recurrence.recurrenceId}`), otherToken)).status).toBe(404);
    expect((await auth(api().patch(`/recurrences/${recurrence.recurrenceId}`), otherToken).send({ description: 'x' })).status).toBe(404);
    expect((await auth(api().delete(`/recurrences/${recurrence.recurrenceId}`), otherToken)).status).toBe(404);
    expect(body<{ data: unknown[] }>(await auth(api().get('/recurrences'), otherToken)).data).toHaveLength(0);
  });

  const dayAlreadyPassed = Number(todayIso().slice(8)) > 1;
  const itWhenDayPassed = dayAlreadyPassed ? it : it.skip;

  itWhenDayPassed('reajuste alcança o pendente do mês atual cujo dia já passou', async () => {
    const recurrence = await create({ dayOfMonth: 1 });
    await auth(api().patch(`/recurrences/${recurrence.recurrenceId}`)).send({ amountCents: 910000, dayOfMonth: 2 });
    const [current] = await linked(recurrence.recurrenceId);
    expect(current).toMatchObject({ month: month0, amount_cents: '910000', date: dueDate(month0, 2) });
  });

  itWhenDayPassed('excluir apaga também o pendente do mês atual cujo dia já passou, sem deixar órfão', async () => {
    const recurrence = await create({ dayOfMonth: 1, description: 'Digitado errado' });
    await auth(api().delete(`/recurrences/${recurrence.recurrenceId}`));
    const orphans = await dataSource.query<unknown[]>(`SELECT 1 FROM "transaction" WHERE description = 'Digitado errado'`);
    expect(orphans).toHaveLength(0);
  });

  it('aceita uma janela de recebimento e lança o pendente no último dia dela', async () => {
    const res = await auth(api().post('/recurrences')).send(contract({ dayOfMonthStart: 1, dayOfMonth: 5 }));
    expect(res.status).toBe(201);
    const recurrence = body<RecurrenceBody & { dayOfMonthStart: number; dayOfMonth: number }>(res);
    expect(recurrence).toMatchObject({ dayOfMonthStart: 1, dayOfMonth: 5 });
    expect((await linked(recurrence.recurrenceId)).map(row => row.date)).toEqual(months.map(month => dueDate(month, 5)));
  });

  it('recusa janela com início depois do fim', async () => {
    const res = await auth(api().post('/recurrences')).send(contract({ dayOfMonthStart: 10, dayOfMonth: 5 }));
    expect(res.status).toBe(400);
    expect((res.body as Envelope<unknown>).error).toMatch(/O primeiro dia não pode ser depois do último/);
  });

  it('tira a janela quando o início volta a vazio', async () => {
    const recurrence = await create({ dayOfMonthStart: 1, dayOfMonth: 5 });
    const res = await auth(api().patch(`/recurrences/${recurrence.recurrenceId}`)).send({ dayOfMonthStart: null });
    expect(body<{ dayOfMonthStart: number | null }>(res).dayOfMonthStart).toBeNull();
  });

  it('o resumo do livro agrupa as receitas pelo recorrente', async () => {
    const recurrence = await create({ description: 'Contrato por origem', amountCents: 123456 });
    const [first] = await linked(recurrence.recurrenceId);
    await auth(api().patch(`/transactions/${first.transaction_id}`)).send({ status: 'PAID' });
    const summary = body<{ incomeByOrigin: { name: string; totalCents: number }[] }>(await auth(api().get(`/dashboard/ledgers/${companyLedgerId}?from=${month0}&to=${dueDate(month0, 31)}`)));
    expect(summary.incomeByOrigin).toContainEqual(expect.objectContaining({ name: 'Contrato por origem', totalCents: 123456 }));
  });

  it('não gera meses numa conta arquivada', async () => {
    const accountId = body<{ accountId: string }>(await auth(api().post('/accounts')).send({ ledgerId: companyLedgerId, name: 'Conta a arquivar', type: 'CHECKING' })).accountId;
    const recurrence = await create({ accountId, endMonth: month0 });
    await auth(api().patch(`/accounts/${accountId}`)).send({ archived: true });
    await auth(api().patch(`/recurrences/${recurrence.recurrenceId}`)).send({ endMonth: null });
    expect((await linked(recurrence.recurrenceId)).map(row => row.month)).toEqual([month0]);
  });

  it('não gera meses num livro arquivado', async () => {
    const ledgerId = body<{ ledgerId: string }>(await auth(api().post('/ledgers')).send({ name: 'Empresa a arquivar' })).ledgerId;
    const accountId = body<{ accountId: string }>(await auth(api().post('/accounts')).send({ ledgerId, name: 'Conta', type: 'CHECKING' })).accountId;
    const recurrence = await create({ accountId, endMonth: month0 });
    await auth(api().patch(`/ledgers/${ledgerId}`)).send({ archived: true });
    await auth(api().patch(`/recurrences/${recurrence.recurrenceId}`)).send({ endMonth: null });
    expect((await linked(recurrence.recurrenceId)).map(row => row.month)).toEqual([month0]);
  });

  describe('lançamentos gerados', () => {
    interface TransactionBody {
      transactionId: string;
      accountId: string;
      kind: string;
      amountCents: number;
      date: string;
      description: string;
      status: string;
      categoryId: string | null;
      notes: string | null;
      recurrenceId: string | null;
      recurrence: { description: string } | null;
    }

    const getTransaction = async (transactionId: string) => body<TransactionBody>(await auth(api().get(`/transactions/${transactionId}`)));
    const fullForm = (transaction: TransactionBody) => ({
      accountId: transaction.accountId,
      kind: transaction.kind,
      amountCents: transaction.amountCents,
      date: transaction.date,
      description: transaction.description,
      status: transaction.status,
      categoryId: transaction.categoryId,
      notes: transaction.notes,
    });

    it('confirmar com outra data e valor mantém o vínculo', async () => {
      const recurrence = await create();
      const [first] = await linked(recurrence.recurrenceId);
      const current = await getTransaction(first.transaction_id);
      const res = await auth(api().patch(`/transactions/${first.transaction_id}`)).send({ ...fullForm(current), status: 'PAID', date: dueDate(month0, 3), amountCents: 899000 });
      expect(res.status).toBe(200);
      expect(body<TransactionBody>(res)).toMatchObject({ status: 'PAID', amountCents: 899000, recurrenceId: recurrence.recurrenceId });
    });

    it('editar o valor de um pendente desvincula e ele não recebe reajuste', async () => {
      const recurrence = await create();
      const [, second] = await linked(recurrence.recurrenceId);
      await auth(api().patch(`/transactions/${second.transaction_id}`)).send({ amountCents: 123400 });
      expect((await getTransaction(second.transaction_id)).recurrenceId).toBeNull();

      await auth(api().patch(`/recurrences/${recurrence.recurrenceId}`)).send({ amountCents: 777700 });
      expect((await getTransaction(second.transaction_id)).amountCents).toBe(123400);
      expect((await linked(recurrence.recurrenceId)).map(row => row.month)).toEqual([months[0], months[2]]);
    });

    it('mandar o formulário inteiro sem mudar nada mantém o vínculo', async () => {
      const recurrence = await create();
      const [, second] = await linked(recurrence.recurrenceId);
      const current = await getTransaction(second.transaction_id);
      await auth(api().patch(`/transactions/${second.transaction_id}`)).send(fullForm(current));
      expect((await getTransaction(second.transaction_id)).recurrenceId).toBe(recurrence.recurrenceId);
    });

    it('apagar um gerado não deixa o mês voltar', async () => {
      const recurrence = await create();
      const [, second] = await linked(recurrence.recurrenceId);
      expect((await auth(api().delete(`/transactions/${second.transaction_id}`))).status).toBe(200);
      await app.get(RecurrencesService).materialize();
      expect((await linked(recurrence.recurrenceId)).map(row => row.month)).toEqual([months[0], months[2]]);
      const skips = await dataSource.query<{ month: string }[]>(`SELECT to_char(month, 'YYYY-MM-DD') AS month FROM recurrence_skip WHERE recurrence_id = $1`, [recurrence.recurrenceId]);
      expect(skips).toEqual([{ month: months[1] }]);
    });

    it('voltar um pago para pendente mantém o vínculo', async () => {
      const recurrence = await create();
      const [first] = await linked(recurrence.recurrenceId);
      await auth(api().patch(`/transactions/${first.transaction_id}`)).send({ status: 'PAID' });
      await auth(api().patch(`/transactions/${first.transaction_id}`)).send({ status: 'PENDING' });
      expect((await getTransaction(first.transaction_id)).recurrenceId).toBe(recurrence.recurrenceId);
    });

    it('filtra lançamentos por recorrente e traz a descrição dele', async () => {
      const recurrence = await create({ description: 'Contrato filtrado' });
      const list = body<{ data: TransactionBody[] }>(await auth(api().get(`/transactions?filter.recurrenceId=$eq:${recurrence.recurrenceId}`))).data;
      expect(list).toHaveLength(3);
      expect(list.every(item => item.recurrence?.description === 'Contrato filtrado')).toBe(true);
    });
  });

  it('lista por livro com o próximo vencimento', async () => {
    const recurrence = await create({ accountId: personalAccountId, kind: 'EXPENSE', description: 'Aluguel', dayOfMonth: 5, amountCents: 250000 });
    const list = body<{ data: (RecurrenceBody & { description: string })[] }>(await auth(api().get(`/recurrences?filter.kind=$eq:EXPENSE`))).data;
    const found = list.find(item => item.recurrenceId === recurrence.recurrenceId);
    expect(found).toMatchObject({ description: 'Aluguel', pendingCount: 3 });
    expect([dueDate(months[0], 5), dueDate(months[1], 5)]).toContain(found?.nextDate);
  });
});
