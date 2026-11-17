/**
 * Testes dos utilitários de período.
 *
 * @module test/common/period.util.spec
 */
import { lastMonths, resolvePeriod, toIsoDate } from '~/common/utils/period.util';

describe('period.util', () => {
  const today = new Date(2026, 10, 16);

  it('formata data local sem deslocar o dia pelo fuso', () => {
    expect(toIsoDate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('usa o mês corrente quando o período não vem', () => {
    expect(resolvePeriod(undefined, undefined, today)).toEqual({ from: '2026-11-01', to: '2026-11-30' });
  });

  it('ignora data malformada e cai no padrão', () => {
    expect(resolvePeriod('16/11/2026', '2026-11-20', today)).toEqual({ from: '2026-11-01', to: '2026-11-20' });
  });

  it('reordena intervalo invertido', () => {
    expect(resolvePeriod('2026-12-31', '2026-01-01', today)).toEqual({ from: '2026-01-01', to: '2026-12-31' });
  });

  it('lista os últimos meses atravessando a virada do ano', () => {
    expect(lastMonths(3, new Date(2026, 0, 10))).toEqual(['2025-11', '2025-12', '2026-01']);
  });
});
