/**
 * Fluxo financeiro de ponta a ponta contra o `AppModule` real.
 *
 * Cobre o caso que motivou o modelo (`ADR-005`): o contratante paga a
 * empresa do usuário, a empresa repassa pró-labore para o pessoal, e a
 * visão consolidada conta a receita uma vez só.
 *
 * @module test/finance-flow.e2e-spec
 */
import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '~/app.module';
import { configureApp } from '~/bootstrap';

interface Envelope<T> {
  success: boolean;
  data: T;
  error?: string;
}

describe('fluxo financeiro (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let refreshCookie: string;

  const api = () => request(app.getHttpServer());
  const auth = (req: request.Test) => req.set('Authorization', `Bearer ${token}`);
  const body = <T>(res: request.Response) => (res.body as Envelope<T>).data;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = configureApp(moduleRef.createNestApplication());
    app.use(cookieParser());
    await app.init();
    await app.get(DataSource).query('TRUNCATE TABLE user_account CASCADE');
  });

  afterAll(async () => {
    await app.close();
  });

  it('nega acesso sem token', async () => {
    const res = await api().get('/ledgers');
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ success: false, statusCode: 401 });
  });

  it('cadastra, cria o livro pessoal e as categorias padrão', async () => {
    const res = await api().post('/auth/register').send({ name: 'Ana Teste', email: ' Ana@Financial.TEST ', password: 'senha-forte-1' });
    expect(res.status).toBe(201);
    const data = body<{ accessToken: string; user: { email: string; passwordHash?: string } }>(res);
    expect(data.user.email).toBe('ana@financial.test');
    expect(data.user.passwordHash).toBeUndefined();
    token = data.accessToken;
    refreshCookie = String(res.headers['set-cookie']).split(';')[0];

    const ledgers = body<{ data: { type: string }[] }>(await auth(api().get('/ledgers')));
    expect(ledgers.data.map(ledger => ledger.type)).toEqual(['PERSONAL']);
    const categories = body<{ meta: { totalItems: number } }>(await auth(api().get('/categories')));
    expect(categories.meta.totalItems).toBeGreaterThan(10);
  });

  it('recusa login com senha errada e aceita com a certa', async () => {
    expect((await api().post('/auth/login').send({ email: 'ana@financial.test', password: 'errada' })).status).toBe(401);
    expect((await api().post('/auth/login').send({ email: 'ana@financial.test', password: 'senha-forte-1' })).status).toBe(200);
  });

  it('renova a sessão pelo cookie e revoga o refresh usado', async () => {
    const first = await api().post('/auth/refresh').set('Cookie', refreshCookie);
    expect(first.status).toBe(200);
    expect(body<{ accessToken: string }>(first).accessToken).toBeTruthy();
    const reused = await api().post('/auth/refresh').set('Cookie', refreshCookie);
    expect(reused.status).toBe(401);
  });

  it('conta a receita da empresa uma vez só depois do pró-labore', async () => {
    const personal = body<{ data: { ledgerId: string }[] }>(await auth(api().get('/ledgers'))).data[0];
    const company = body<{ ledgerId: string }>(await auth(api().post('/ledgers')).send({ name: 'Studio Ltda', document: '11.222.333/0001-81' }));
    const ordered = body<{ data: { type: string }[] }>(await auth(api().get('/ledgers'))).data.map(ledger => ledger.type);
    expect(ordered).toEqual(['PERSONAL', 'COMPANY']);

    const companyAccount = body<{ accountId: string }>(await auth(api().post('/accounts')).send({ ledgerId: company.ledgerId, name: 'Itaú PJ', type: 'CHECKING' }));
    const personalAccount = body<{ accountId: string }>(await auth(api().post('/accounts')).send({ ledgerId: personal.ledgerId, name: 'Nubank', type: 'CHECKING', initialBalanceCents: 100000 }));

    const income = await auth(api().post('/transactions')).send({
      accountId: companyAccount.accountId,
      kind: 'INCOME',
      amountCents: 1500000,
      date: '2026-11-05',
      description: 'Nota 42',
    });
    expect(income.status).toBe(201);

    const transfer = await auth(api().post('/transfers')).send({
      fromAccountId: companyAccount.accountId,
      toAccountId: personalAccount.accountId,
      amountCents: 800000,
      date: '2026-11-06',
      kind: 'PRO_LABORE',
    });
    expect(transfer.status).toBe(201);
    expect(body<{ legs: unknown[]; description: string }>(transfer)).toMatchObject({ description: 'Pró-labore' });

    await auth(api().post('/transactions')).send({ accountId: personalAccount.accountId, kind: 'EXPENSE', amountCents: 30000, date: '2026-11-07', description: 'Mercado' });

    const period = '?from=2026-11-01&to=2026-11-30';
    const overview = body<{ totals: { incomeCents: number; expenseCents: number }; cashCents: number }>(await auth(api().get(`/dashboard/overview${period}`)));
    expect(overview.totals.incomeCents).toBe(1500000);
    expect(overview.totals.expenseCents).toBe(30000);
    expect(overview.cashCents).toBe(100000 + 1500000 - 30000);

    const personalSummary = body<{ totals: { incomeCents: number; transfersInCents: number }; cashCents: number }>(await auth(api().get(`/dashboard/ledgers/${personal.ledgerId}${period}`)));
    expect(personalSummary.totals.incomeCents).toBe(0);
    expect(personalSummary.totals.transfersInCents).toBe(800000);
    expect(personalSummary.cashCents).toBe(100000 + 800000 - 30000);

    const companySummary = body<{ totals: { incomeCents: number; transfersOutCents: number }; cashCents: number }>(await auth(api().get(`/dashboard/ledgers/${company.ledgerId}${period}`)));
    expect(companySummary.totals.transfersOutCents).toBe(800000);
    expect(companySummary.cashCents).toBe(1500000 - 800000);

    const legId = (await auth(api().get('/transactions?filter.kind=$eq:TRANSFER_IN'))).body.data.data[0].transactionId as string;
    expect((await auth(api().delete(`/transactions/${legId}`))).status).toBe(400);
  });

  it('aporte com conta move o saldo sem virar despesa', async () => {
    const personal = body<{ data: { ledgerId: string }[] }>(await auth(api().get('/ledgers?filter.type=$eq:PERSONAL'))).data[0];
    const account = body<{ data: { accountId: string; balanceCents: number }[] }>(await auth(api().get(`/accounts?filter.ledgerId=$eq:${personal.ledgerId}`))).data[0];
    const investment = body<{ investmentId: string }>(await auth(api().post('/investments')).send({ ledgerId: personal.ledgerId, name: 'Tesouro Selic', type: 'FIXED_INCOME' }));

    const afterContribution = body<{ currentValueCents: number; investedCents: number }>(
      await auth(api().post(`/investments/${investment.investmentId}/movements`)).send({ kind: 'CONTRIBUTION', amountCents: 50000, date: '2026-11-08', accountId: account.accountId })
    );
    expect(afterContribution).toMatchObject({ currentValueCents: 50000, investedCents: 50000 });

    const afterYield = body<{ currentValueCents: number; returnCents: number }>(
      await auth(api().post(`/investments/${investment.investmentId}/movements`)).send({ kind: 'YIELD', amountCents: 1200, date: '2026-11-30' })
    );
    expect(afterYield).toMatchObject({ currentValueCents: 51200, returnCents: 1200 });

    const accountNow = body<{ balanceCents: number }>(await auth(api().get(`/accounts/${account.accountId}`)));
    expect(accountNow.balanceCents).toBe(account.balanceCents - 50000);

    const overview = body<{ totals: { expenseCents: number }; investmentsCents: number }>(await auth(api().get('/dashboard/overview?from=2026-11-01&to=2026-11-30')));
    expect(overview.totals.expenseCents).toBe(30000);
    expect(overview.investmentsCents).toBe(51200);
  });

  it('esconde dado de outro usuário com 404', async () => {
    const mine = body<{ data: { ledgerId: string }[] }>(await auth(api().get('/ledgers'))).data[0];
    const other = await api().post('/auth/register').send({ name: 'Bruno', email: 'bruno@financial.test', password: 'senha-forte-2' });
    const otherToken = body<{ accessToken: string }>(other).accessToken;
    const res = await api().get(`/ledgers/${mine.ledgerId}`).set('Authorization', `Bearer ${otherToken}`);
    expect(res.status).toBe(404);
  });

  it('não tem mais contratantes nem fontes de renda: as rotas somem e os campos são recusados', async () => {
    expect((await auth(api().get('/clients'))).status).toBe(404);
    expect((await auth(api().get('/income-sources'))).status).toBe(404);
    const personal = body<{ data: { ledgerId: string }[] }>(await auth(api().get('/ledgers'))).data[0];
    const account = body<{ accountId: string }>(await auth(api().post('/accounts')).send({ ledgerId: personal.ledgerId, name: 'Conta extra', type: 'CHECKING' }));
    const someId = '00000000-0000-4000-8000-000000000000';
    const res = await auth(api().post('/transactions')).send({ accountId: account.accountId, kind: 'INCOME', amountCents: 100, date: '2026-11-05', description: 'x', incomeSourceId: someId });
    expect(res.status).toBe(400);
  });

  it('guarda a taxa de rendimento da conta e estima quanto rende por mês', async () => {
    const personal = body<{ data: { ledgerId: string }[] }>(await auth(api().get('/ledgers'))).data[0];
    const created = await auth(api().post('/accounts')).send({ ledgerId: personal.ledgerId, name: 'Caixinha', type: 'SAVINGS', initialBalanceCents: 1_000_000, annualYieldRate: 12 });
    expect(created.status).toBe(201);
    expect(body<{ annualYieldRate: number; estimatedMonthlyYieldCents: number }>(created)).toMatchObject({ annualYieldRate: 12, estimatedMonthlyYieldCents: 9489 });

    const absurd = await auth(api().post('/accounts')).send({ ledgerId: personal.ledgerId, name: 'Golpe', type: 'SAVINGS', annualYieldRate: 5000 });
    expect(absurd.status).toBe(400);
    expect(JSON.stringify(absurd.body)).toMatch(/Informe uma taxa entre 0 e 999% ao ano/);
  });

  it('bens ficam fora dos investimentos que rendem e mostram a perda', async () => {
    const ledgerId = body<{ ledgerId: string }>(await auth(api().post('/ledgers')).send({ name: 'Garagem Ltda' })).ledgerId;
    const created = await auth(api().post('/investments')).send({ ledgerId, name: 'Carro', type: 'ASSET' });
    expect(created.status).toBe(201);
    const car = body<{ investmentId: string }>(created);
    await auth(api().post(`/investments/${car.investmentId}/movements`)).send({ kind: 'CONTRIBUTION', amountCents: 8_000_000, date: '2026-01-10' });
    const valued = await auth(api().patch(`/investments/${car.investmentId}`)).send({ currentValueCents: 6_800_000, valuedAt: '2026-11-10' });
    expect(body<{ returnCents: number }>(valued).returnCents).toBe(-1_200_000);

    const summary = body<{ assetsCents: number; investmentsCents: number; netWorthCents: number; cashCents: number; allocation: { type: string }[] }>(
      await auth(api().get(`/dashboard/ledgers/${ledgerId}`))
    );
    expect(summary.assetsCents).toBe(6_800_000);
    expect(summary.investmentsCents).toBe(0);
    expect(summary.allocation.map(slice => slice.type)).not.toContain('ASSET');
    expect(summary.netWorthCents).toBe(summary.cashCents + summary.investmentsCents + summary.assetsCents);
  });
});
