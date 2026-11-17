/**
 * Recorrentes: tabelas `recurrence` e `recurrence_skip`, e o vínculo do
 * lançamento com o recorrente (`recurrence_id`, `recurrence_month` e o índice
 * único que impede mês duplicado).
 *
 * Gerada pelo `pnpm run migration:generate` a partir das entidades.
 *
 * @module database/migrations/recurrences
 */
import { MigrationInterface, QueryRunner } from 'typeorm';

/** Cria os recorrentes (`ADR-011`). */
export class Recurrences1794934578421 implements MigrationInterface {
  name = 'Recurrences1794934578421';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "recurrence" ("created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "recurrence_id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "ledger_id" uuid NOT NULL, "account_id" uuid NOT NULL, "kind" "public"."transaction_kind" NOT NULL, "description" character varying(200) NOT NULL, "amount_cents" bigint NOT NULL, "day_of_month" smallint NOT NULL, "start_month" date NOT NULL, "end_month" date, "category_id" uuid, "client_id" uuid, "income_source_id" uuid, "notes" text, CONSTRAINT "ck_recurrence_end_after_start" CHECK ("end_month" IS NULL OR "end_month" >= "start_month"), CONSTRAINT "ck_recurrence_day_of_month" CHECK ("day_of_month" BETWEEN 1 AND 31), CONSTRAINT "ck_recurrence_amount_positive" CHECK ("amount_cents" > 0), CONSTRAINT "PK_dc9d5a896107baf79e8f39bc264" PRIMARY KEY ("recurrence_id"))`
    );
    await queryRunner.query(`CREATE INDEX "ix_recurrence_user_ledger" ON "recurrence" ("user_id", "ledger_id") `);
    await queryRunner.query(
      `CREATE TABLE "recurrence_skip" ("created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "recurrence_skip_id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "recurrence_id" uuid NOT NULL, "month" date NOT NULL, CONSTRAINT "PK_4a08d8937288aa47ec899a2a1e3" PRIMARY KEY ("recurrence_skip_id"))`
    );
    await queryRunner.query(`CREATE UNIQUE INDEX "uq_recurrence_skip_month" ON "recurrence_skip" ("recurrence_id", "month") `);
    await queryRunner.query(`ALTER TABLE "transaction" ADD "recurrence_id" uuid`);
    await queryRunner.query(`ALTER TABLE "transaction" ADD "recurrence_month" date`);
    await queryRunner.query(`CREATE UNIQUE INDEX "uq_transaction_recurrence_month" ON "transaction" ("recurrence_id", "recurrence_month") WHERE "recurrence_id" IS NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "recurrence" ADD CONSTRAINT "FK_f2a4cd220367360bb42b901d0a2" FOREIGN KEY ("user_id") REFERENCES "user_account"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "recurrence" ADD CONSTRAINT "FK_7f40f45cee5f753cb66a1f17779" FOREIGN KEY ("ledger_id") REFERENCES "ledger"("ledger_id") ON DELETE RESTRICT ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "recurrence" ADD CONSTRAINT "FK_5b494ddc3d1a83f71cb83bb9ab2" FOREIGN KEY ("account_id") REFERENCES "account"("account_id") ON DELETE RESTRICT ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "recurrence" ADD CONSTRAINT "FK_a01dae9205e4b14782cc6be60b3" FOREIGN KEY ("category_id") REFERENCES "category"("category_id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "recurrence" ADD CONSTRAINT "FK_9c7850fa28c04243d5f9080aa50" FOREIGN KEY ("client_id") REFERENCES "client"("client_id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "recurrence" ADD CONSTRAINT "FK_139addfa3a2869106506b6fb655" FOREIGN KEY ("income_source_id") REFERENCES "income_source"("income_source_id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "recurrence_skip" ADD CONSTRAINT "FK_6233723b4e20cf843def5a7385a" FOREIGN KEY ("user_id") REFERENCES "user_account"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "recurrence_skip" ADD CONSTRAINT "FK_4214d72559ea1754a5f2071c3c2" FOREIGN KEY ("recurrence_id") REFERENCES "recurrence"("recurrence_id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "transaction" ADD CONSTRAINT "FK_24a6df820af94a76ab90db3e0d7" FOREIGN KEY ("recurrence_id") REFERENCES "recurrence"("recurrence_id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "transaction" DROP CONSTRAINT "FK_24a6df820af94a76ab90db3e0d7"`);
    await queryRunner.query(`ALTER TABLE "recurrence_skip" DROP CONSTRAINT "FK_4214d72559ea1754a5f2071c3c2"`);
    await queryRunner.query(`ALTER TABLE "recurrence_skip" DROP CONSTRAINT "FK_6233723b4e20cf843def5a7385a"`);
    await queryRunner.query(`ALTER TABLE "recurrence" DROP CONSTRAINT "FK_139addfa3a2869106506b6fb655"`);
    await queryRunner.query(`ALTER TABLE "recurrence" DROP CONSTRAINT "FK_9c7850fa28c04243d5f9080aa50"`);
    await queryRunner.query(`ALTER TABLE "recurrence" DROP CONSTRAINT "FK_a01dae9205e4b14782cc6be60b3"`);
    await queryRunner.query(`ALTER TABLE "recurrence" DROP CONSTRAINT "FK_5b494ddc3d1a83f71cb83bb9ab2"`);
    await queryRunner.query(`ALTER TABLE "recurrence" DROP CONSTRAINT "FK_7f40f45cee5f753cb66a1f17779"`);
    await queryRunner.query(`ALTER TABLE "recurrence" DROP CONSTRAINT "FK_f2a4cd220367360bb42b901d0a2"`);
    await queryRunner.query(`DROP INDEX "public"."uq_transaction_recurrence_month"`);
    await queryRunner.query(`ALTER TABLE "transaction" DROP COLUMN "recurrence_month"`);
    await queryRunner.query(`ALTER TABLE "transaction" DROP COLUMN "recurrence_id"`);
    await queryRunner.query(`DROP INDEX "public"."uq_recurrence_skip_month"`);
    await queryRunner.query(`DROP TABLE "recurrence_skip"`);
    await queryRunner.query(`DROP INDEX "public"."ix_recurrence_user_ledger"`);
    await queryRunner.query(`DROP TABLE "recurrence"`);
  }
}
