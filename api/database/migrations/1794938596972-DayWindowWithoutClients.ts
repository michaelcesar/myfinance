/**
 * Janela de recebimento nos recorrentes (`day_of_month_start`) e fim dos
 * contratantes: some a tabela `client` e as colunas `client_id` de
 * lançamento, fonte de renda e recorrente.
 *
 * Escrita à mão: o `migration:generate` não apaga tabela sem entidade.
 *
 * @module database/migrations/day-window-without-clients
 */
import { MigrationInterface, QueryRunner } from 'typeorm';

/** Acrescenta a janela de dias e remove os contratantes (`ADR-011`). */
export class DayWindowWithoutClients1794938596972 implements MigrationInterface {
  name = 'DayWindowWithoutClients1794938596972';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "recurrence" ADD "day_of_month_start" smallint`);
    await queryRunner.query(`ALTER TABLE "recurrence" ADD CONSTRAINT "ck_recurrence_day_window" CHECK ("day_of_month_start" IS NULL OR "day_of_month_start" BETWEEN 1 AND "day_of_month")`);
    await queryRunner.query(`ALTER TABLE "income_source" DROP CONSTRAINT "FK_b0184acae7d4bef295c1ee89063"`);
    await queryRunner.query(`ALTER TABLE "recurrence" DROP CONSTRAINT "FK_9c7850fa28c04243d5f9080aa50"`);
    await queryRunner.query(`ALTER TABLE "transaction" DROP CONSTRAINT "FK_3e4cf3f31643825f80f28f929e2"`);
    await queryRunner.query(`ALTER TABLE "income_source" DROP COLUMN "client_id"`);
    await queryRunner.query(`ALTER TABLE "recurrence" DROP COLUMN "client_id"`);
    await queryRunner.query(`ALTER TABLE "transaction" DROP COLUMN "client_id"`);
    await queryRunner.query(`DROP TABLE "client"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "client" ("created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "client_id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "name" character varying(160) NOT NULL, "document" character varying(14), "email" character varying(254), "phone" character varying(20), "notes" text, "color" character varying(20) NOT NULL DEFAULT 'indigo', "archived" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_7510ce0a84bde51dbff978b4b49" PRIMARY KEY ("client_id"))`
    );
    await queryRunner.query(`ALTER TABLE "client" ADD CONSTRAINT "FK_f18a6fabea7b2a90ab6bf10a650" FOREIGN KEY ("user_id") REFERENCES "user_account"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "transaction" ADD "client_id" uuid`);
    await queryRunner.query(`ALTER TABLE "recurrence" ADD "client_id" uuid`);
    await queryRunner.query(`ALTER TABLE "income_source" ADD "client_id" uuid`);
    await queryRunner.query(
      `ALTER TABLE "transaction" ADD CONSTRAINT "FK_3e4cf3f31643825f80f28f929e2" FOREIGN KEY ("client_id") REFERENCES "client"("client_id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "recurrence" ADD CONSTRAINT "FK_9c7850fa28c04243d5f9080aa50" FOREIGN KEY ("client_id") REFERENCES "client"("client_id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "income_source" ADD CONSTRAINT "FK_b0184acae7d4bef295c1ee89063" FOREIGN KEY ("client_id") REFERENCES "client"("client_id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(`ALTER TABLE "recurrence" DROP CONSTRAINT "ck_recurrence_day_window"`);
    await queryRunner.query(`ALTER TABLE "recurrence" DROP COLUMN "day_of_month_start"`);
  }
}
