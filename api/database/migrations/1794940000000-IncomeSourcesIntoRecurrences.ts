/**
 * Junta fontes de renda em recorrentes: cada fonte mensal com valor e conta
 * vira um recorrente de receita (mesmo nome, livro, conta, valor, dia e
 * vigência); depois somem a tabela `income_source`, os enums dela e as colunas
 * `income_source_id` de lançamento e recorrente.
 *
 * Escrita à mão: o `migration:generate` não apaga tabela sem entidade nem
 * converte dados. O `down` recria a estrutura vazia.
 *
 * @module database/migrations/income-sources-into-recurrences
 */
import { MigrationInterface, QueryRunner } from 'typeorm';

/** Converte as fontes mensais em recorrentes e remove as fontes de renda (`ADR-011`). */
export class IncomeSourcesIntoRecurrences1794940000000 implements MigrationInterface {
  name = 'IncomeSourcesIntoRecurrences1794940000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO "recurrence" ("user_id", "ledger_id", "account_id", "kind", "description", "amount_cents", "day_of_month", "start_month", "end_month", "notes")
       SELECT s."user_id", a."ledger_id", s."account_id", 'INCOME', s."name", s."expected_amount_cents",
              LEAST(GREATEST(COALESCE(s."pay_day", 1), 1), 31),
              date_trunc('month', COALESCE(s."start_date", now()))::date,
              CASE WHEN s."end_date" IS NOT NULL AND date_trunc('month', s."end_date") >= date_trunc('month', COALESCE(s."start_date", now()))
                   THEN date_trunc('month', s."end_date")::date END,
              s."notes"
       FROM "income_source" s
       JOIN "account" a ON a."account_id" = s."account_id"
       WHERE s."frequency" = 'MONTHLY' AND s."expected_amount_cents" > 0`
    );
    await queryRunner.query(`ALTER TABLE "transaction" DROP CONSTRAINT "FK_01479527b23aeda6a9781a105fd"`);
    await queryRunner.query(`ALTER TABLE "recurrence" DROP CONSTRAINT "FK_139addfa3a2869106506b6fb655"`);
    await queryRunner.query(`ALTER TABLE "transaction" DROP COLUMN "income_source_id"`);
    await queryRunner.query(`ALTER TABLE "recurrence" DROP COLUMN "income_source_id"`);
    await queryRunner.query(`DROP TABLE "income_source"`);
    await queryRunner.query(`DROP TYPE "public"."income_frequency"`);
    await queryRunner.query(`DROP TYPE "public"."income_source_type"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "public"."income_source_type" AS ENUM('EMPLOYMENT', 'SERVICE_CONTRACT', 'FREELANCE', 'BUSINESS_REVENUE', 'RENTAL', 'DIVIDENDS', 'OTHER')`);
    await queryRunner.query(`CREATE TYPE "public"."income_frequency" AS ENUM('WEEKLY', 'BIWEEKLY', 'MONTHLY', 'YEARLY', 'ONE_OFF', 'VARIABLE')`);
    await queryRunner.query(
      `CREATE TABLE "income_source" ("created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "income_source_id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "name" character varying(120) NOT NULL, "type" "public"."income_source_type" NOT NULL, "ledger_id" uuid NOT NULL, "account_id" uuid, "expected_amount_cents" bigint, "frequency" "public"."income_frequency" NOT NULL DEFAULT 'MONTHLY', "pay_day" smallint, "start_date" date, "end_date" date, "active" boolean NOT NULL DEFAULT true, "notes" text, CONSTRAINT "PK_49a76d6090d42a177b5cb2b054a" PRIMARY KEY ("income_source_id"))`
    );
    await queryRunner.query(
      `ALTER TABLE "income_source" ADD CONSTRAINT "FK_2b8fab1171056bceb7be1e12ffb" FOREIGN KEY ("user_id") REFERENCES "user_account"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "income_source" ADD CONSTRAINT "FK_6849658fe906be0bf8efaf6a89e" FOREIGN KEY ("ledger_id") REFERENCES "ledger"("ledger_id") ON DELETE RESTRICT ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "income_source" ADD CONSTRAINT "FK_bfdf82b9aedb62fb9c1b52a7602" FOREIGN KEY ("account_id") REFERENCES "account"("account_id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(`ALTER TABLE "transaction" ADD "income_source_id" uuid`);
    await queryRunner.query(`ALTER TABLE "recurrence" ADD "income_source_id" uuid`);
    await queryRunner.query(
      `ALTER TABLE "transaction" ADD CONSTRAINT "FK_01479527b23aeda6a9781a105fd" FOREIGN KEY ("income_source_id") REFERENCES "income_source"("income_source_id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "recurrence" ADD CONSTRAINT "FK_139addfa3a2869106506b6fb655" FOREIGN KEY ("income_source_id") REFERENCES "income_source"("income_source_id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
  }
}
