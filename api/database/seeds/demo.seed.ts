/**
 * Seed de demonstração: um usuário com seis meses de movimento realista.
 *
 * Passa pelos serviços da aplicação (não por SQL cru), então os dados de
 * exemplo obedecem às mesmas regras de vínculo, transferência e saldo da API.
 * Idempotente: se o e-mail de demonstração já existe, não faz nada.
 *
 * Uso: `pnpm run seed:demo` (lê `SEED_DEMO_EMAIL`/`SEED_DEMO_PASSWORD`).
 *
 * @module database/seeds/demo.seed
 */
import { config as loadEnv } from 'dotenv';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { hash } from 'bcryptjs';
import { DataSource } from 'typeorm';
import { AppModule } from '~/app.module';
import { toIsoDate } from '~/common/utils';
import { AccountsService } from '~/modules/accounts/accounts.service';
import { AccountType } from '~/modules/accounts/enums/account-type.enum';
import { CategoriesService } from '~/modules/categories/categories.service';
import { Category } from '~/modules/categories/entities/category.entity';
import { InvestmentType } from '~/modules/investments/enums/investment-type.enum';
import { MovementKind } from '~/modules/investments/enums/movement-kind.enum';
import { InvestmentsService } from '~/modules/investments/investments.service';
import { LedgersService } from '~/modules/ledgers/ledgers.service';
import { addMonths, currentMonth } from '~/modules/recurrences/recurrence-months';
import { RecurrencesService } from '~/modules/recurrences/recurrences.service';
import { TransactionKind } from '~/modules/transactions/enums/transaction-kind.enum';
import { TransactionStatus } from '~/modules/transactions/enums/transaction-status.enum';
import { TransferKind } from '~/modules/transactions/enums/transfer-kind.enum';
import { TransactionsService } from '~/modules/transactions/transactions.service';
import { TransfersService } from '~/modules/transactions/transfers.service';
import { User } from '~/modules/users/entities/user.entity';
import { UsersService } from '~/modules/users/users.service';

loadEnv({ quiet: true });

const logger = new Logger('DemoSeed');

/** Meses de histórico gerados, contando o atual. */
const MONTHS = 6;

/**
 * Data do dia `day` no mês deslocado `offset` meses de hoje.
 *
 * @param offset - 0 é o mês atual, -1 o anterior...
 * @param day - Dia do mês (limitado ao último dia)
 * @returns Data `YYYY-MM-DD`
 */
function dayOf(offset: number, day: number): string {
  const now = new Date();
  const last = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0).getDate();
  return toIsoDate(new Date(now.getFullYear(), now.getMonth() + offset, Math.min(day, last)));
}

/**
 * Variação determinística de ±`spread` sobre um valor, para os meses não
 * ficarem idênticos sem depender de `Math.random`.
 *
 * @param cents - Valor base
 * @param seed - Semente (o índice do mês)
 * @param spread - Fração máxima de variação
 * @returns Valor variado, em centavos inteiros
 */
function vary(cents: number, seed: number, spread = 0.15): number {
  const factor = 1 + Math.sin(seed * 12.9898) * spread;
  return Math.round(cents * factor);
}

/**
 * Cria o usuário de demonstração e todo o histórico.
 *
 * @example
 * pnpm run seed:demo
 */
async function run(): Promise<void> {
  const email = (process.env.SEED_DEMO_EMAIL ?? 'user@user.com').toLowerCase();
  const password = process.env.SEED_DEMO_PASSWORD;
  if (!password) throw new Error('Defina SEED_DEMO_PASSWORD para rodar o seed.');

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  const dataSource = app.get(DataSource);

  if (await dataSource.getRepository(User).exists({ where: { email } })) {
    logger.log(`Usuário ${email} já existe; nada a fazer.`);
    await app.close();
    return;
  }

  const users = app.get(UsersService);
  const ledgers = app.get(LedgersService);
  const categories = app.get(CategoriesService);
  const accounts = app.get(AccountsService);
  const recurrences = app.get(RecurrencesService);
  const transactions = app.get(TransactionsService);
  const transfers = app.get(TransfersService);
  const investments = app.get(InvestmentsService);

  const passwordHash = await hash(password, 12);
  const user = await dataSource.transaction(async manager => {
    const created = await users.create(manager, { name: 'Conta Demo', email, passwordHash });
    await ledgers.createPersonal(manager, created.userId);
    await categories.seedDefaults(manager, created.userId);
    return created;
  });
  const userId = user.userId;

  const categoryList = await dataSource.getRepository(Category).find({ where: { userId } });
  const cat = (name: string) => categoryList.find(category => category.name === name)!.categoryId;

  const personal = await ledgers.findPersonal(userId);
  const studio = await ledgers.create(userId, { name: 'Studio Aurora', legalName: 'Studio Aurora Digital Ltda', document: '11222333000181', color: 'indigo' });
  const holding = await ledgers.create(userId, { name: 'Aurora Participações', legalName: 'Aurora Participações Ltda', color: 'teal' });

  const nubank = await accounts.create(userId, {
    ledgerId: personal.ledgerId,
    name: 'Nubank',
    type: AccountType.CHECKING,
    institution: 'Nu Pagamentos',
    initialBalanceCents: 1_250_000,
    color: 'purple',
  });
  const wallet = await accounts.create(userId, { ledgerId: personal.ledgerId, name: 'Carteira', type: AccountType.CASH, initialBalanceCents: 30_000, color: 'green' });
  const card = await accounts.create(userId, { ledgerId: personal.ledgerId, name: 'Cartão Visa', type: AccountType.CREDIT_CARD, institution: 'Itaú', color: 'orange' });
  const broker = await accounts.create(userId, { ledgerId: personal.ledgerId, name: 'XP Investimentos', type: AccountType.BROKERAGE, institution: 'XP', color: 'gray' });
  const studioBank = await accounts.create(userId, { ledgerId: studio.ledgerId, name: 'Itaú PJ', type: AccountType.CHECKING, institution: 'Itaú', initialBalanceCents: 2_400_000, color: 'orange' });
  const holdingBank = await accounts.create(userId, {
    ledgerId: holding.ledgerId,
    name: 'Inter PJ',
    type: AccountType.CHECKING,
    institution: 'Banco Inter',
    initialBalanceCents: 800_000,
    color: 'orange',
  });

  const nextMonth = addMonths(currentMonth(), 1);
  const contract = (accountId: string, description: string, amountCents: number, dayOfMonth: number, categoryId: string) =>
    recurrences.create(userId, { accountId, kind: TransactionKind.INCOME, description, amountCents, dayOfMonth, categoryId, startMonth: nextMonth });

  const today = toIsoDate(new Date());
  const statusOf = (date: string) => (date <= today ? TransactionStatus.PAID : TransactionStatus.PENDING);
  const add = (accountId: string, kind: TransactionKind.INCOME | TransactionKind.EXPENSE, amountCents: number, date: string, description: string, categoryId: string, extra = {}) =>
    transactions.create(userId, { accountId, kind, amountCents, date, description, categoryId, status: statusOf(date), ...extra });

  for (let index = 0; index < MONTHS; index++) {
    const offset = index - (MONTHS - 1);
    const { INCOME, EXPENSE } = TransactionKind;

    await add(nubank.accountId, INCOME, 980_000, dayOf(offset, 5), 'Salário Globex', cat('Salário'));
    await add(studioBank.accountId, INCOME, 1_800_000, dayOf(offset, 10), 'NF Acme — desenvolvimento', cat('Faturamento'));
    await add(holdingBank.accountId, INCOME, 250_000, dayOf(offset, 1), 'Aluguel sala 304', cat('Outras receitas'));
    if (index % 2 === 0) await add(nubank.accountId, INCOME, vary(450_000, index), dayOf(offset, 18), 'Projeto Initech', cat('Freelance'));

    await add(studioBank.accountId, EXPENSE, 64_000, dayOf(offset, 3), 'Figma, GitHub e Vercel', cat('Software e ferramentas'));
    await add(studioBank.accountId, EXPENSE, 45_000, dayOf(offset, 12), 'Honorários contábeis', cat('Contabilidade'));
    await add(studioBank.accountId, EXPENSE, 108_000, dayOf(offset, 20), 'DAS — Simples Nacional', cat('Impostos'));
    if (index % 3 === 1) await add(studioBank.accountId, EXPENSE, vary(150_000, index), dayOf(offset, 22), 'Anúncios', cat('Marketing'));
    await add(holdingBank.accountId, EXPENSE, 18_000, dayOf(offset, 15), 'Tarifa e IPTU proporcional', cat('Impostos'));

    await add(nubank.accountId, EXPENSE, 320_000, dayOf(offset, 8), 'Aluguel apartamento', cat('Moradia'));
    await add(card.accountId, EXPENSE, vary(140_000, index + 1), dayOf(offset, 9), 'Supermercado', cat('Mercado'));
    await add(card.accountId, EXPENSE, vary(62_000, index + 2), dayOf(offset, 14), 'Restaurantes', cat('Alimentação'));
    await add(card.accountId, EXPENSE, vary(45_000, index + 3), dayOf(offset, 16), 'Combustível e apps', cat('Transporte'));
    await add(card.accountId, EXPENSE, 18_990, dayOf(offset, 11), 'Streaming e iCloud', cat('Assinaturas'));
    await add(wallet.accountId, EXPENSE, vary(25_000, index + 4), dayOf(offset, 21), 'Feira e padaria', cat('Mercado'));
    if (index % 2 === 1) await add(card.accountId, EXPENSE, vary(50_000, index + 5), dayOf(offset, 24), 'Cinema e shows', cat('Lazer'));
    await add(nubank.accountId, EXPENSE, 35_000, dayOf(offset, 6), 'Plano de saúde', cat('Saúde'));

    const proLaboreDate = dayOf(offset, 15);
    if (proLaboreDate <= today) {
      await transfers.create(userId, { fromAccountId: studioBank.accountId, toAccountId: nubank.accountId, amountCents: 600_000, date: proLaboreDate, kind: TransferKind.PRO_LABORE });
    }
    const distributionDate = dayOf(offset, 25);
    if (index % 2 === 0 && distributionDate <= today) {
      await transfers.create(userId, { fromAccountId: studioBank.accountId, toAccountId: nubank.accountId, amountCents: 400_000, date: distributionDate, kind: TransferKind.PROFIT_DISTRIBUTION });
    }
    const cardPaymentDate = dayOf(offset, 28);
    if (cardPaymentDate <= today) {
      await transfers.create(userId, { fromAccountId: nubank.accountId, toAccountId: card.accountId, amountCents: 280_000, date: cardPaymentDate, description: 'Pagamento da fatura' });
    }
  }

  await contract(nubank.accountId, 'Salário Globex', 980_000, 5, cat('Salário'));
  await contract(studioBank.accountId, 'Contrato Acme', 1_800_000, 10, cat('Faturamento'));
  await contract(holdingBank.accountId, 'Aluguel sala 304', 250_000, 1, cat('Outras receitas'));

  const selic = await investments.create(userId, { ledgerId: personal.ledgerId, name: 'Tesouro Selic 2029', type: InvestmentType.FIXED_INCOME, institution: 'Tesouro Direto' });
  const stocks = await investments.create(userId, { ledgerId: personal.ledgerId, name: 'Carteira de ações', type: InvestmentType.STOCKS, institution: 'XP' });
  const reits = await investments.create(userId, { ledgerId: personal.ledgerId, name: 'Fundos imobiliários', type: InvestmentType.REITS, institution: 'XP' });
  const cdb = await investments.create(userId, { ledgerId: studio.ledgerId, name: 'CDB liquidez diária', type: InvestmentType.FIXED_INCOME, institution: 'Itaú' });
  const crypto = await investments.create(userId, { ledgerId: personal.ledgerId, name: 'Bitcoin', type: InvestmentType.CRYPTO, institution: 'Binance' });

  await transfers.create(userId, { fromAccountId: nubank.accountId, toAccountId: broker.accountId, amountCents: 3_000_000, date: dayOf(-MONTHS + 1, 2), description: 'Envio para corretora' });
  await investments.addMovement(userId, stocks.investmentId, { kind: MovementKind.CONTRIBUTION, amountCents: 1_800_000, date: dayOf(-MONTHS + 1, 3), accountId: broker.accountId });
  await investments.addMovement(userId, reits.investmentId, { kind: MovementKind.CONTRIBUTION, amountCents: 900_000, date: dayOf(-MONTHS + 1, 3), accountId: broker.accountId });
  await investments.addMovement(userId, cdb.investmentId, { kind: MovementKind.CONTRIBUTION, amountCents: 1_500_000, date: dayOf(-MONTHS + 1, 12), accountId: studioBank.accountId });
  await investments.addMovement(userId, crypto.investmentId, { kind: MovementKind.CONTRIBUTION, amountCents: 300_000, date: dayOf(-MONTHS + 2, 7), accountId: nubank.accountId });

  for (let index = 0; index < MONTHS; index++) {
    const offset = index - (MONTHS - 1);
    const contributionDate = dayOf(offset, 6);
    if (contributionDate <= today)
      await investments.addMovement(userId, selic.investmentId, { kind: MovementKind.CONTRIBUTION, amountCents: 150_000, date: contributionDate, accountId: nubank.accountId });
    const yieldDate = dayOf(offset, 28);
    if (yieldDate <= today) {
      await investments.addMovement(userId, selic.investmentId, { kind: MovementKind.YIELD, amountCents: 1_100 * (index + 1), date: yieldDate });
      await investments.addMovement(userId, cdb.investmentId, { kind: MovementKind.YIELD, amountCents: 14_500, date: yieldDate });
      await investments.addMovement(userId, reits.investmentId, { kind: MovementKind.YIELD, amountCents: 7_800, date: yieldDate });
    }
  }
  await investments.update(userId, stocks.investmentId, { currentValueCents: 1_946_300, valuedAt: today });
  await investments.update(userId, crypto.investmentId, { currentValueCents: 352_000, valuedAt: today });

  logger.log(`Usuário de demonstração criado: ${email}`);
  await app.close();
}

run().catch((error: unknown) => {
  logger.error(error instanceof Error ? error.stack : String(error));
  process.exit(1);
});
