/**
 * Tipos de movimentação de investimento.
 *
 * @module modules/investments/enums/movement-kind.enum
 */

/**
 * `CONTRIBUTION` (aporte) e `WITHDRAWAL` (resgate) mudam o valor investido;
 * `YIELD` (rendimento) só muda o valor atual.
 */
export enum MovementKind {
  CONTRIBUTION = 'CONTRIBUTION',
  WITHDRAWAL = 'WITHDRAWAL',
  YIELD = 'YIELD',
}
