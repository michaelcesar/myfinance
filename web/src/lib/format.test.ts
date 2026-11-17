/**
 * Testes da formatação de dinheiro e datas.
 *
 * @module lib/format.test
 */
import { describe, expect, it } from 'vitest';
import { formatDocument, formatMoney, initials, parseIsoDate, toIsoDate } from './format';

/** O `Intl` usa espaço não separável entre "R$" e o número. */
const normalize = (text: string) => text.replace(/ /g, ' ');

describe('format', () => {
  it('formata centavos em reais', () => {
    expect(normalize(formatMoney(123456))).toBe('R$ 1.234,56');
  });

  it('põe o sinal de menos antes do símbolo e o de mais só quando pedido', () => {
    expect(normalize(formatMoney(-500))).toBe('-R$ 5,00');
    expect(normalize(formatMoney(500, { signed: true }))).toBe('+R$ 5,00');
    expect(normalize(formatMoney(0, { signed: true }))).toBe('R$ 0,00');
  });

  it('lê data de calendário sem deslocar pelo fuso', () => {
    const date = parseIsoDate('2026-11-01');
    expect(date.getDate()).toBe(1);
    expect(toIsoDate(date)).toBe('2026-11-01');
  });

  it('aplica máscara de CNPJ e CPF', () => {
    expect(formatDocument('11222333000181')).toBe('11.222.333/0001-81');
    expect(formatDocument('52998224725')).toBe('529.982.247-25');
    expect(formatDocument(null)).toBe('');
  });

  it('gera até duas iniciais', () => {
    expect(initials('Studio Aurora Digital')).toBe('SA');
    expect(initials('acme')).toBe('A');
  });
});
