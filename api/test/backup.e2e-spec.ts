/**
 * Backup ponta a ponta: exportar, mudar os dados, importar e conferir que
 * tudo voltou como estava — com os mesmos ids e os mesmos saldos. E um
 * arquivo inválido é recusado sem tocar em nada.
 *
 * @module test/backup.e2e-spec
 */
import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '~/app.module';
import { configureApp } from '~/bootstrap';
import { currentMonth } from '~/modules/recurrences/recurrence-months';
import { RecurrencesService } from '~/modules/recurrences/recurrences.service';

interface Envelope<T> {
  success: boolean;
  data: T;
  error?: string;
}

interface BackupFile {
  format: string;
  version: number;
  counts: Record<string, number>;
  data: Record<string, Record<string, unknown>[]>;
}

describe('backup (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let backup: BackupFile;
  let balancesBefore: Record<string, number>;
  let recurrenceId: string;
  let linkedBefore: number;

  const api = () => request(app.getHttpServer());
  const auth = (req: request.Test) => req.set('Authorization', `Bearer ${token}`);
  const body = <T>(res: request.Response) => (res.body as Envelope<T>).data;
  const linkedCount = async () => body<{ data: unknown[] }>(await auth(api().get(`/transactions?filter.recurrenceId=$eq:${recurrenceId}`))).data.length;
  const balances = async () => {
    const accounts = body<{ data: { accountId: string; balanceCents: number }[] }>(await auth(api().get('/accounts?limit=100'))).data;
    return Object.fromEntries(accounts.map(account => [account.accountId, account.balanceCents]));
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = configureApp(moduleRef.createNestApplication());
    app.use(cookieParser());
    await app.init();
    await app.get(DataSource).query('TRUNCATE TABLE user_account CASCADE');

    const registered = await api().post('/auth/register').send({ name: 'Bia Backup', email: 'bia@backup.test', password: 'senha-forte-1' });
    token = body<{ accessToken: string }>(registered).accessToken;

    const personal = body<{ data: { ledgerId: string }[] }>(await auth(api().get('/ledgers'))).data[0];
    const company = body<{ ledgerId: string }>(await auth(api().post('/ledgers')).send({ name: 'Bia Studio' }));
    const companyAccount = body<{ accountId: string }>(await auth(api().post('/accounts')).send({ ledgerId: company.ledgerId, name: 'Itaú PJ', type: 'CHECKING' }));
    const personalAccount = body<{ accountId: string }>(await auth(api().post('/accounts')).send({ ledgerId: personal.ledgerId, name: 'Nubank', type: 'CHECKING', initialBalanceCents: 50000 }));
    await auth(api().post('/transactions')).send({ accountId: companyAccount.accountId, kind: 'INCOME', amountCents: 900000, date: '2026-11-05', description: 'Nota 7' });
    await auth(api().post('/transfers')).send({ fromAccountId: companyAccount.accountId, toAccountId: personalAccount.accountId, amountCents: 300000, date: '2026-11-06', kind: 'PRO_LABORE' });
    const investment = body<{ investmentId: string }>(await auth(api().post('/investments')).send({ ledgerId: personal.ledgerId, name: 'Tesouro', type: 'FIXED_INCOME' }));
    await auth(api().post(`/investments/${investment.investmentId}/movements`)).send({ kind: 'CONTRIBUTION', amountCents: 20000, date: '2026-11-08', accountId: personalAccount.accountId });
    recurrenceId = body<{ recurrenceId: string }>(
      await auth(api().post('/recurrences')).send({
        accountId: companyAccount.accountId,
        kind: 'INCOME',
        description: 'Contrato mensal',
        amountCents: 500000,
        dayOfMonth: 15,
        startMonth: currentMonth(),
      })
    ).recurrenceId;
    const generated = body<{ data: { transactionId: string }[] }>(await auth(api().get(`/transactions?filter.recurrenceId=$eq:${recurrenceId}&sortBy=date:ASC`))).data;
    await auth(api().delete(`/transactions/${generated[1].transactionId}`));
    linkedBefore = await linkedCount();
    balancesBefore = await balances();
  });

  afterAll(async () => {
    await app.close();
  });

  it('exporta todas as tabelas, sem dono nem senha', async () => {
    const res = await auth(api().get('/backup/export'));
    expect(res.status).toBe(200);
    backup = body<BackupFile>(res);
    expect(backup).toMatchObject({ format: 'finance-manager-backup', version: 4 });
    expect(backup.counts).toMatchObject({ ledgers: 2, accounts: 2, transfers: 1, investments: 1, investmentMovements: 1, recurrences: 1, recurrenceSkips: 1 });
    expect(backup.counts.transactions).toBe(6);
    expect(backup.counts.categories).toBeGreaterThan(10);
    expect(JSON.stringify(backup)).not.toMatch(/userId|passwordHash/);
  });

  it('importa e devolve exatamente o que foi exportado, apagando o que veio depois', async () => {
    await auth(api().post('/categories')).send({ kind: 'EXPENSE', name: 'Criada depois' });
    await auth(api().post('/ledgers')).send({ name: 'Empresa criada depois' });

    const res = await auth(api().post('/backup/import')).send(backup);
    expect(res.status).toBe(200);
    expect(body<{ counts: Record<string, number> }>(res).counts).toEqual(backup.counts);

    const categories = body<{ data: { name: string }[] }>(await auth(api().get('/categories?limit=100'))).data.map(category => category.name);
    expect(categories).not.toContain('Criada depois');
    const ledgers = body<{ data: { ledgerId: string }[] }>(await auth(api().get('/ledgers'))).data.map(ledger => ledger.ledgerId);
    expect(ledgers.sort()).toEqual(backup.data.ledgers.map(ledger => ledger.ledgerId as string).sort());
    expect(await balances()).toEqual(balancesBefore);
  });

  it('preserva recorrentes, skips e vínculos, e gerar de novo não duplica', async () => {
    expect(await linkedCount()).toBe(linkedBefore);
    await app.get(RecurrencesService).materialize();
    expect(await linkedCount()).toBe(linkedBefore);
  });

  it('aceita arquivo da versão 1, sem recorrentes', async () => {
    const legacy = structuredClone(backup);
    legacy.version = 1;
    delete legacy.data.recurrences;
    delete legacy.data.recurrenceSkips;
    legacy.data.transactions = legacy.data.transactions.filter(row => !row.recurrenceId).map(({ recurrenceId: _recurrenceId, recurrenceMonth: _recurrenceMonth, ...row }) => row);
    const res = await auth(api().post('/backup/import')).send(legacy);
    expect(res.status).toBe(200);
    expect(body<{ counts: Record<string, number> }>(res).counts).toMatchObject({ recurrences: 0, recurrenceSkips: 0, transactions: 4 });
    expect(await balances()).toEqual(balancesBefore);
  });

  it('recusa arquivo que não é backup, versão desconhecida e dados inconsistentes, sem mudar nada', async () => {
    expect((await auth(api().post('/backup/import')).send({ format: 'outra-coisa', version: 1, data: {} })).status).toBe(400);
    expect((await auth(api().post('/backup/import')).send({ ...backup, version: 5 })).status).toBe(400);

    const broken = structuredClone(backup);
    broken.data.transactions[0].accountId = '00000000-0000-4000-8000-000000000000';
    const res = await auth(api().post('/backup/import')).send(broken);
    expect(res.status).toBe(400);
    expect((res.body as Envelope<unknown>).error).toMatch(/nada foi alterado/);
    expect(await balances()).toEqual(balancesBefore);
  });
});
