/**
 * Esquema inicial do Financial: usuários, sessões, livros, contas, categorias,
 * contratantes, fontes de renda, lançamentos, transferências e investimentos.
 *
 * Gerada pelo `pnpm run migration:generate` a partir das entidades.
 *
 * @module database/migrations/initial-schema
 */
import { MigrationInterface, QueryRunner } from 'typeorm';

/** Cria todas as tabelas, enums e índices da fase 1. */
export class InitialSchema1794865956748 implements MigrationInterface {
  name = 'InitialSchema1794865956748';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "user_account" ("created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "user_id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(120) NOT NULL, "email" character varying(254) NOT NULL, "password_hash" character varying NOT NULL, CONSTRAINT "UQ_56a0e4bcec2b5411beafa47ffa5" UNIQUE ("email"), CONSTRAINT "PK_1e7af5387f4169347ddef6e8180" PRIMARY KEY ("user_id"))`
    );
    await queryRunner.query(`CREATE TYPE "public"."ledger_type" AS ENUM('PERSONAL', 'COMPANY')`);
    await queryRunner.query(
      `CREATE TABLE "ledger" ("created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "ledger_id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "type" "public"."ledger_type" NOT NULL, "name" character varying(120) NOT NULL, "legal_name" character varying(200), "document" character varying(14), "color" character varying(20) NOT NULL DEFAULT 'blue', "archived" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_526d1ab7dd099e89fe69c70048b" PRIMARY KEY ("ledger_id"))`
    );
    await queryRunner.query(`CREATE UNIQUE INDEX "uq_ledger_personal_per_user" ON "ledger" ("user_id") WHERE "type" = 'PERSONAL'`);
    await queryRunner.query(`CREATE TYPE "public"."account_type" AS ENUM('CHECKING', 'SAVINGS', 'DIGITAL_WALLET', 'CASH', 'CREDIT_CARD', 'BROKERAGE')`);
    await queryRunner.query(
      `CREATE TABLE "account" ("created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "account_id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "ledger_id" uuid NOT NULL, "name" character varying(120) NOT NULL, "type" "public"."account_type" NOT NULL, "institution" character varying(120), "initial_balance_cents" bigint NOT NULL DEFAULT '0', "color" character varying(20) NOT NULL DEFAULT 'blue', "archived" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_ea08b54a9d7322975ffc57fc612" PRIMARY KEY ("account_id"))`
    );
    await queryRunner.query(`CREATE TYPE "public"."category_kind" AS ENUM('INCOME', 'EXPENSE')`);
    await queryRunner.query(`CREATE TYPE "public"."category_ledger_type" AS ENUM('PERSONAL', 'COMPANY')`);
    await queryRunner.query(
      `CREATE TABLE "category" ("created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "category_id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "kind" "public"."category_kind" NOT NULL, "name" character varying(80) NOT NULL, "color" character varying(20) NOT NULL DEFAULT 'gray', "icon" character varying(40) NOT NULL DEFAULT 'tag', "ledger_type" "public"."category_ledger_type", "archived" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_cc7f32b7ab33c70b9e715afae84" PRIMARY KEY ("category_id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "client" ("created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "client_id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "name" character varying(160) NOT NULL, "document" character varying(14), "email" character varying(254), "phone" character varying(20), "notes" text, "color" character varying(20) NOT NULL DEFAULT 'indigo', "archived" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_7510ce0a84bde51dbff978b4b49" PRIMARY KEY ("client_id"))`
    );
    await queryRunner.query(`CREATE TYPE "public"."income_source_type" AS ENUM('EMPLOYMENT', 'SERVICE_CONTRACT', 'FREELANCE', 'BUSINESS_REVENUE', 'RENTAL', 'DIVIDENDS', 'OTHER')`);
    await queryRunner.query(`CREATE TYPE "public"."income_frequency" AS ENUM('WEEKLY', 'BIWEEKLY', 'MONTHLY', 'YEARLY', 'ONE_OFF', 'VARIABLE')`);
    await queryRunner.query(
      `CREATE TABLE "income_source" ("created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "income_source_id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "name" character varying(120) NOT NULL, "type" "public"."income_source_type" NOT NULL, "client_id" uuid, "ledger_id" uuid NOT NULL, "account_id" uuid, "expected_amount_cents" bigint, "frequency" "public"."income_frequency" NOT NULL DEFAULT 'MONTHLY', "pay_day" smallint, "start_date" date, "end_date" date, "active" boolean NOT NULL DEFAULT true, "notes" text, CONSTRAINT "PK_49a76d6090d42a177b5cb2b054a" PRIMARY KEY ("income_source_id"))`
    );
    await queryRunner.query(`CREATE TYPE "public"."investment_type" AS ENUM('FIXED_INCOME', 'STOCKS', 'REITS', 'FUNDS', 'CRYPTO', 'PENSION', 'INTERNATIONAL', 'OTHER')`);
    await queryRunner.query(
      `CREATE TABLE "investment" ("created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "investment_id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "ledger_id" uuid NOT NULL, "name" character varying(160) NOT NULL, "type" "public"."investment_type" NOT NULL, "institution" character varying(120), "current_value_cents" bigint NOT NULL DEFAULT '0', "valued_at" date, "notes" text, "archived" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_b50d90e7e9b3949158ffb881049" PRIMARY KEY ("investment_id"))`
    );
    await queryRunner.query(`CREATE TYPE "public"."movement_kind" AS ENUM('CONTRIBUTION', 'WITHDRAWAL', 'YIELD')`);
    await queryRunner.query(
      `CREATE TABLE "investment_movement" ("created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "investment_movement_id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "investment_id" uuid NOT NULL, "kind" "public"."movement_kind" NOT NULL, "amount_cents" bigint NOT NULL, "date" date NOT NULL, "account_id" uuid, "notes" text, CONSTRAINT "PK_5c521db78faeceba976e03a1520" PRIMARY KEY ("investment_movement_id"))`
    );
    await queryRunner.query(`CREATE TYPE "public"."transfer_kind" AS ENUM('INTERNAL', 'PRO_LABORE', 'PROFIT_DISTRIBUTION', 'CAPITAL_CONTRIBUTION', 'LOAN', 'REIMBURSEMENT')`);
    await queryRunner.query(
      `CREATE TABLE "transfer" ("created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "transfer_id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "from_account_id" uuid NOT NULL, "to_account_id" uuid NOT NULL, "amount_cents" bigint NOT NULL, "date" date NOT NULL, "kind" "public"."transfer_kind" NOT NULL DEFAULT 'INTERNAL', "description" character varying(200) NOT NULL, "notes" text, CONSTRAINT "PK_7aa3769048ff14716eb5e0939e1" PRIMARY KEY ("transfer_id"))`
    );
    await queryRunner.query(`CREATE TYPE "public"."transaction_kind" AS ENUM('INCOME', 'EXPENSE', 'TRANSFER_IN', 'TRANSFER_OUT')`);
    await queryRunner.query(`CREATE TYPE "public"."transaction_status" AS ENUM('PAID', 'PENDING')`);
    await queryRunner.query(
      `CREATE TABLE "transaction" ("created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "transaction_id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "ledger_id" uuid NOT NULL, "account_id" uuid NOT NULL, "kind" "public"."transaction_kind" NOT NULL, "status" "public"."transaction_status" NOT NULL DEFAULT 'PAID', "amount_cents" bigint NOT NULL, "date" date NOT NULL, "description" character varying(200) NOT NULL, "category_id" uuid, "client_id" uuid, "income_source_id" uuid, "transfer_id" uuid, "investment_movement_id" uuid, "notes" text, CONSTRAINT "ck_transaction_amount_positive" CHECK ("amount_cents" > 0), CONSTRAINT "PK_6e02e5a0a6a7400e1c944d1e946" PRIMARY KEY ("transaction_id"))`
    );
    await queryRunner.query(`CREATE INDEX "ix_transaction_ledger_date" ON "transaction" ("ledger_id", "date") `);
    await queryRunner.query(`CREATE INDEX "ix_transaction_user_date" ON "transaction" ("user_id", "date") `);
    await queryRunner.query(
      `CREATE TABLE "refresh_token" ("created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "refresh_token_id" uuid NOT NULL DEFAULT uuid_generate_v4(), "token_hash" character varying(64) NOT NULL, "user_id" uuid NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "revoked" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_38622f85836f4e77b3230e39f31" PRIMARY KEY ("refresh_token_id"))`
    );
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_f0812282fad2e352cdaf83ef0a" ON "refresh_token" ("token_hash") `);
    await queryRunner.query(`ALTER TABLE "ledger" ADD CONSTRAINT "FK_f010927e851c0368a15c587f89a" FOREIGN KEY ("user_id") REFERENCES "user_account"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "account" ADD CONSTRAINT "FK_efef1e5fdbe318a379c06678c51" FOREIGN KEY ("user_id") REFERENCES "user_account"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "account" ADD CONSTRAINT "FK_93e93f133558177445b565e6130" FOREIGN KEY ("ledger_id") REFERENCES "ledger"("ledger_id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    await queryRunner.query(
      `ALTER TABLE "category" ADD CONSTRAINT "FK_6562e564389d0600e6e243d9604" FOREIGN KEY ("user_id") REFERENCES "user_account"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(`ALTER TABLE "client" ADD CONSTRAINT "FK_f18a6fabea7b2a90ab6bf10a650" FOREIGN KEY ("user_id") REFERENCES "user_account"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(
      `ALTER TABLE "income_source" ADD CONSTRAINT "FK_2b8fab1171056bceb7be1e12ffb" FOREIGN KEY ("user_id") REFERENCES "user_account"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "income_source" ADD CONSTRAINT "FK_b0184acae7d4bef295c1ee89063" FOREIGN KEY ("client_id") REFERENCES "client"("client_id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "income_source" ADD CONSTRAINT "FK_6849658fe906be0bf8efaf6a89e" FOREIGN KEY ("ledger_id") REFERENCES "ledger"("ledger_id") ON DELETE RESTRICT ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "income_source" ADD CONSTRAINT "FK_bfdf82b9aedb62fb9c1b52a7602" FOREIGN KEY ("account_id") REFERENCES "account"("account_id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "investment" ADD CONSTRAINT "FK_e4f0cfe94d01377877528a764b2" FOREIGN KEY ("user_id") REFERENCES "user_account"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "investment" ADD CONSTRAINT "FK_2363647c58fcb61b841b836e388" FOREIGN KEY ("ledger_id") REFERENCES "ledger"("ledger_id") ON DELETE RESTRICT ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "investment_movement" ADD CONSTRAINT "FK_a61be7c833c7bf129a8fde97644" FOREIGN KEY ("user_id") REFERENCES "user_account"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "investment_movement" ADD CONSTRAINT "FK_e71c7ccbe4a03b9d5cb22026476" FOREIGN KEY ("investment_id") REFERENCES "investment"("investment_id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "investment_movement" ADD CONSTRAINT "FK_a07a89f20cb7e94a3ae0fff2ad4" FOREIGN KEY ("account_id") REFERENCES "account"("account_id") ON DELETE RESTRICT ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "transfer" ADD CONSTRAINT "FK_4a79110cc3fdc33249603c8d10a" FOREIGN KEY ("user_id") REFERENCES "user_account"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "transfer" ADD CONSTRAINT "FK_e2f71240f767a903a4fe85ce25a" FOREIGN KEY ("from_account_id") REFERENCES "account"("account_id") ON DELETE RESTRICT ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "transfer" ADD CONSTRAINT "FK_e588c446185bd0c7e4861bb66bb" FOREIGN KEY ("to_account_id") REFERENCES "account"("account_id") ON DELETE RESTRICT ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "transaction" ADD CONSTRAINT "FK_b4a3d92d5dde30f3ab5c34c5862" FOREIGN KEY ("user_id") REFERENCES "user_account"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "transaction" ADD CONSTRAINT "FK_f1d71c4a67a7753a2500b4cc2f8" FOREIGN KEY ("ledger_id") REFERENCES "ledger"("ledger_id") ON DELETE RESTRICT ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "transaction" ADD CONSTRAINT "FK_e2652fa8c16723c83a00fb9b17e" FOREIGN KEY ("account_id") REFERENCES "account"("account_id") ON DELETE RESTRICT ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "transaction" ADD CONSTRAINT "FK_abbe63b71ee4193f61c322ab497" FOREIGN KEY ("category_id") REFERENCES "category"("category_id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "transaction" ADD CONSTRAINT "FK_3e4cf3f31643825f80f28f929e2" FOREIGN KEY ("client_id") REFERENCES "client"("client_id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "transaction" ADD CONSTRAINT "FK_01479527b23aeda6a9781a105fd" FOREIGN KEY ("income_source_id") REFERENCES "income_source"("income_source_id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "transaction" ADD CONSTRAINT "FK_199138f5484fe6d84a905362e7a" FOREIGN KEY ("transfer_id") REFERENCES "transfer"("transfer_id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "transaction" ADD CONSTRAINT "FK_d107c09940c9e7345449c3a1400" FOREIGN KEY ("investment_movement_id") REFERENCES "investment_movement"("investment_movement_id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_token" ADD CONSTRAINT "FK_6bbe63d2fe75e7f0ba1710351d4" FOREIGN KEY ("user_id") REFERENCES "user_account"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "refresh_token" DROP CONSTRAINT "FK_6bbe63d2fe75e7f0ba1710351d4"`);
    await queryRunner.query(`ALTER TABLE "transaction" DROP CONSTRAINT "FK_d107c09940c9e7345449c3a1400"`);
    await queryRunner.query(`ALTER TABLE "transaction" DROP CONSTRAINT "FK_199138f5484fe6d84a905362e7a"`);
    await queryRunner.query(`ALTER TABLE "transaction" DROP CONSTRAINT "FK_01479527b23aeda6a9781a105fd"`);
    await queryRunner.query(`ALTER TABLE "transaction" DROP CONSTRAINT "FK_3e4cf3f31643825f80f28f929e2"`);
    await queryRunner.query(`ALTER TABLE "transaction" DROP CONSTRAINT "FK_abbe63b71ee4193f61c322ab497"`);
    await queryRunner.query(`ALTER TABLE "transaction" DROP CONSTRAINT "FK_e2652fa8c16723c83a00fb9b17e"`);
    await queryRunner.query(`ALTER TABLE "transaction" DROP CONSTRAINT "FK_f1d71c4a67a7753a2500b4cc2f8"`);
    await queryRunner.query(`ALTER TABLE "transaction" DROP CONSTRAINT "FK_b4a3d92d5dde30f3ab5c34c5862"`);
    await queryRunner.query(`ALTER TABLE "transfer" DROP CONSTRAINT "FK_e588c446185bd0c7e4861bb66bb"`);
    await queryRunner.query(`ALTER TABLE "transfer" DROP CONSTRAINT "FK_e2f71240f767a903a4fe85ce25a"`);
    await queryRunner.query(`ALTER TABLE "transfer" DROP CONSTRAINT "FK_4a79110cc3fdc33249603c8d10a"`);
    await queryRunner.query(`ALTER TABLE "investment_movement" DROP CONSTRAINT "FK_a07a89f20cb7e94a3ae0fff2ad4"`);
    await queryRunner.query(`ALTER TABLE "investment_movement" DROP CONSTRAINT "FK_e71c7ccbe4a03b9d5cb22026476"`);
    await queryRunner.query(`ALTER TABLE "investment_movement" DROP CONSTRAINT "FK_a61be7c833c7bf129a8fde97644"`);
    await queryRunner.query(`ALTER TABLE "investment" DROP CONSTRAINT "FK_2363647c58fcb61b841b836e388"`);
    await queryRunner.query(`ALTER TABLE "investment" DROP CONSTRAINT "FK_e4f0cfe94d01377877528a764b2"`);
    await queryRunner.query(`ALTER TABLE "income_source" DROP CONSTRAINT "FK_bfdf82b9aedb62fb9c1b52a7602"`);
    await queryRunner.query(`ALTER TABLE "income_source" DROP CONSTRAINT "FK_6849658fe906be0bf8efaf6a89e"`);
    await queryRunner.query(`ALTER TABLE "income_source" DROP CONSTRAINT "FK_b0184acae7d4bef295c1ee89063"`);
    await queryRunner.query(`ALTER TABLE "income_source" DROP CONSTRAINT "FK_2b8fab1171056bceb7be1e12ffb"`);
    await queryRunner.query(`ALTER TABLE "client" DROP CONSTRAINT "FK_f18a6fabea7b2a90ab6bf10a650"`);
    await queryRunner.query(`ALTER TABLE "category" DROP CONSTRAINT "FK_6562e564389d0600e6e243d9604"`);
    await queryRunner.query(`ALTER TABLE "account" DROP CONSTRAINT "FK_93e93f133558177445b565e6130"`);
    await queryRunner.query(`ALTER TABLE "account" DROP CONSTRAINT "FK_efef1e5fdbe318a379c06678c51"`);
    await queryRunner.query(`ALTER TABLE "ledger" DROP CONSTRAINT "FK_f010927e851c0368a15c587f89a"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_f0812282fad2e352cdaf83ef0a"`);
    await queryRunner.query(`DROP TABLE "refresh_token"`);
    await queryRunner.query(`DROP INDEX "public"."ix_transaction_user_date"`);
    await queryRunner.query(`DROP INDEX "public"."ix_transaction_ledger_date"`);
    await queryRunner.query(`DROP TABLE "transaction"`);
    await queryRunner.query(`DROP TYPE "public"."transaction_status"`);
    await queryRunner.query(`DROP TYPE "public"."transaction_kind"`);
    await queryRunner.query(`DROP TABLE "transfer"`);
    await queryRunner.query(`DROP TYPE "public"."transfer_kind"`);
    await queryRunner.query(`DROP TABLE "investment_movement"`);
    await queryRunner.query(`DROP TYPE "public"."movement_kind"`);
    await queryRunner.query(`DROP TABLE "investment"`);
    await queryRunner.query(`DROP TYPE "public"."investment_type"`);
    await queryRunner.query(`DROP TABLE "income_source"`);
    await queryRunner.query(`DROP TYPE "public"."income_frequency"`);
    await queryRunner.query(`DROP TYPE "public"."income_source_type"`);
    await queryRunner.query(`DROP TABLE "client"`);
    await queryRunner.query(`DROP TABLE "category"`);
    await queryRunner.query(`DROP TYPE "public"."category_ledger_type"`);
    await queryRunner.query(`DROP TYPE "public"."category_kind"`);
    await queryRunner.query(`DROP TABLE "account"`);
    await queryRunner.query(`DROP TYPE "public"."account_type"`);
    await queryRunner.query(`DROP INDEX "public"."uq_ledger_personal_per_user"`);
    await queryRunner.query(`DROP TABLE "ledger"`);
    await queryRunner.query(`DROP TYPE "public"."ledger_type"`);
    await queryRunner.query(`DROP TABLE "user_account"`);
  }
}
