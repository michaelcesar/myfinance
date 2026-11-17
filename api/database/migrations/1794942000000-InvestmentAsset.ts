/**
 * Classe de investimento `ASSET` (bens físicos: carro, eletrônicos).
 *
 * Escrita à mão: acrescentar valor a enum do Postgres é um `ALTER TYPE`; o
 * `down` recria o tipo sem `ASSET`, convertendo os bens em `OTHER`.
 *
 * @module database/migrations/investment-asset
 */
import { MigrationInterface, QueryRunner } from 'typeorm';

/** Acrescenta a classe de bens (`ADR-012`). */
export class InvestmentAsset1794942000000 implements MigrationInterface {
  name = 'InvestmentAsset1794942000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE "public"."investment_type" ADD VALUE IF NOT EXISTS 'ASSET'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE "public"."investment_type" RENAME TO "investment_type_old"`);
    await queryRunner.query(`CREATE TYPE "public"."investment_type" AS ENUM('FIXED_INCOME', 'STOCKS', 'REITS', 'FUNDS', 'CRYPTO', 'PENSION', 'INTERNATIONAL', 'OTHER')`);
    await queryRunner.query(
      `ALTER TABLE "investment" ALTER COLUMN "type" TYPE "public"."investment_type" USING (CASE WHEN "type"::text = 'ASSET' THEN 'OTHER' ELSE "type"::text END)::"public"."investment_type"`
    );
    await queryRunner.query(`DROP TYPE "public"."investment_type_old"`);
  }
}
