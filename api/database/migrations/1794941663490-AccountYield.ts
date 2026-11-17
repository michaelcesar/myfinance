/**
 * Taxa de rendimento informada na conta (`annual_yield_rate`, % ao ano).
 *
 * Gerada pelo `pnpm run migration:generate` a partir das entidades.
 *
 * @module database/migrations/account-yield
 */
import { MigrationInterface, QueryRunner } from 'typeorm';

/** Acrescenta a taxa de rendimento da conta (`ADR-012`). */
export class AccountYield1794941663490 implements MigrationInterface {
  name = 'AccountYield1794941663490';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "account" ADD "annual_yield_rate" numeric(7,4)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "account" DROP COLUMN "annual_yield_rate"`);
  }
}
