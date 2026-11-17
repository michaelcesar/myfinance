/**
 * Testes da matemática de meses dos recorrentes.
 *
 * @module test/recurrences/recurrence-months.spec
 */
import { addMonths, currentMonth, dueDate, generationWindow, todayIso, toMonth } from '~/modules/recurrences/recurrence-months';

describe('recurrence-months', () => {
  const nov17 = new Date('2026-11-17T15:00:00Z');

  it('usa o mês de São Paulo mesmo com o relógio em UTC já no mês seguinte', () => {
    expect(currentMonth(new Date('2026-12-01T01:30:00Z'))).toBe('2026-11-01');
    expect(todayIso(new Date('2026-12-01T01:30:00Z'))).toBe('2026-11-30');
  });

  it('soma meses atravessando o ano', () => {
    expect(addMonths('2026-11-01', 3)).toBe('2027-02-01');
    expect(addMonths('2026-01-01', -2)).toBe('2025-11-01');
  });

  it('limita o dia ao último dia do mês', () => {
    expect(dueDate('2027-02-01', 31)).toBe('2027-02-28');
    expect(dueDate('2028-02-01', 31)).toBe('2028-02-29');
    expect(dueDate('2026-11-01', 31)).toBe('2026-11-30');
    expect(dueDate('2026-12-01', 5)).toBe('2026-12-05');
  });

  it('começa no mês atual quando o início é passado', () => {
    expect(generationWindow('2026-01-01', null, nov17)).toEqual(['2026-11-01', '2026-12-01', '2027-01-01']);
  });

  it('começa no início quando ele é futuro', () => {
    expect(generationWindow('2026-12-01', null, nov17)).toEqual(['2026-12-01', '2027-01-01']);
  });

  it('para no fim do contrato', () => {
    expect(generationWindow('2026-01-01', '2026-12-01', nov17)).toEqual(['2026-11-01', '2026-12-01']);
  });

  it('não gera nada com o fim no passado', () => {
    expect(generationWindow('2026-01-01', '2026-10-01', nov17)).toEqual([]);
  });

  it('não gera nada com o início além do horizonte', () => {
    expect(generationWindow('2027-03-01', null, nov17)).toEqual([]);
  });

  it('reduz uma data ao primeiro dia do mês', () => {
    expect(toMonth('2026-11-17')).toBe('2026-11-01');
  });
});
