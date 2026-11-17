/**
 * Estratégia de nomes do TypeORM: tabelas e colunas em `snake_case`.
 *
 * Propriedades ficam em camelCase no código (`initialBalanceCents`) e viram
 * `initial_balance_cents` no banco sem `name:` explícito em cada coluna.
 * Colunas de chave estrangeira continuam exigindo `@JoinColumn` com o nome
 * real — ver `CONSTRAINTS.md` C07.
 *
 * @module config/naming.strategy
 */
import { DefaultNamingStrategy, type NamingStrategyInterface } from 'typeorm';

/**
 * Converte um identificador camelCase em snake_case.
 *
 * @param value - Identificador em camelCase
 * @returns Identificador em snake_case
 *
 * @example
 * toSnakeCase('initialBalanceCents'); // 'initial_balance_cents'
 */
export function toSnakeCase(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1_$2')
    .toLowerCase();
}

/**
 * Nomes de tabela e coluna em snake_case, preservando nomes explícitos.
 *
 * @example
 * new DataSource({ namingStrategy: new SnakeNamingStrategy() });
 */
export class SnakeNamingStrategy extends DefaultNamingStrategy implements NamingStrategyInterface {
  /**
   * Nome da tabela: o explícito do `@Entity`, ou o da classe em snake_case.
   *
   * @param targetName - Nome da classe
   * @param userSpecifiedName - Nome passado ao `@Entity`, se houver
   * @returns Nome final da tabela
   *
   * @example
   * strategy.tableName('IncomeSource', undefined); // 'income_source'
   */
  override tableName(targetName: string, userSpecifiedName: string | undefined): string {
    return userSpecifiedName ?? toSnakeCase(targetName);
  }

  /**
   * Nome da coluna: o explícito, ou a propriedade em snake_case.
   *
   * @param propertyName - Nome da propriedade
   * @param customName - Nome passado ao `@Column`, se houver
   * @param embeddedPrefixes - Prefixos de colunas embutidas
   * @returns Nome final da coluna
   *
   * @example
   * strategy.columnName('amountCents', '', []); // 'amount_cents'
   */
  override columnName(propertyName: string, customName: string, embeddedPrefixes: string[]): string {
    return toSnakeCase(embeddedPrefixes.concat(customName || propertyName).join('_'));
  }
}
