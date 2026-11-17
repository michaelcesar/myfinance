/**
 * Testes da projeção de recorrentes na previsão.
 *
 * @module test/dashboard/forecast.projection.spec
 */
import { monthsBetween, projectRecurrence } from '~/modules/dashboard/forecast.projection';

describe('forecast.projection', () => {
  const months = monthsBetween('2026-10-01', '2027-03-01');
  const current = '2026-11-01';

  it('lista os meses do período, atravessando o ano', () => {
    expect(months).toEqual(['2026-10-01', '2026-11-01', '2026-12-01', '2027-01-01', '2027-02-01', '2027-03-01']);
  });

  it('projeta do mês atual em diante, nunca no passado', () => {
    const projected = projectRecurrence({ startMonth: '2026-01-01', endMonth: null, amountCents: 1000 }, months, new Set(), current);
    expect([...projected.keys()]).toEqual(['2026-11-01', '2026-12-01', '2027-01-01', '2027-02-01', '2027-03-01']);
    expect(projected.get('2027-01-01')).toBe(1000);
  });

  it('respeita início futuro e fim no meio do período', () => {
    const projected = projectRecurrence({ startMonth: '2026-12-01', endMonth: '2027-01-01', amountCents: 1000 }, months, new Set(), current);
    expect([...projected.keys()]).toEqual(['2026-12-01', '2027-01-01']);
  });

  it('não projeta mês já tomado por lançamento real ou apagado pelo dono', () => {
    const projected = projectRecurrence({ startMonth: '2026-11-01', endMonth: null, amountCents: 1000 }, months, new Set(['2026-11-01', '2027-02-01']), current);
    expect([...projected.keys()]).toEqual(['2026-12-01', '2027-01-01', '2027-03-01']);
  });
});
