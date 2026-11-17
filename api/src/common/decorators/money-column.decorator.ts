/**
 * Coluna monetária em centavos inteiros.
 *
 * @module common/decorators/money-column.decorator
 */
import { Column, type ColumnOptions } from 'typeorm';

/**
 * Converte o `bigint` do Postgres (que o driver `pg` entrega como string)
 * em `number`. Centavos cabem com folga no inteiro seguro do JS
 * (até R$ 90 trilhões), então a conversão não perde precisão.
 */
const bigintToNumber = {
  to: (value: number | null | undefined) => value,
  from: (value: string | null) => (value === null ? null : Number(value)),
};

/**
 * Declara uma coluna `bigint` de centavos com conversão para `number`.
 *
 * Dinheiro nunca é `float` no projeto (`CONSTRAINTS.md` C08): R$ 10,50 é
 * gravado como `1050`.
 *
 * @param options - Opções extras da coluna (`nullable`, `default`...)
 * @returns Decorator de propriedade do TypeORM
 *
 * @example
 * @MoneyColumn({ default: 0 })
 * initialBalanceCents: number;
 */
export function MoneyColumn(options: ColumnOptions = {}): PropertyDecorator {
  return Column({ type: 'bigint', transformer: bigintToNumber, ...options });
}
