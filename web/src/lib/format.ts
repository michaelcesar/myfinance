/**
 * Formatação de dinheiro, datas e períodos em pt-BR.
 *
 * @module lib/format
 */

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const compactCurrency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 });
const percent = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 1 });

/**
 * Formata centavos como reais.
 *
 * @param cents - Valor em centavos
 * @param options - `signed` força o sinal de `+`; `compact` abrevia (R$ 12,3 mil)
 * @returns Texto como `R$ 1.234,56`
 *
 * @example
 * formatMoney(123456); // 'R$ 1.234,56'
 * formatMoney(-500, { signed: true }); // '-R$ 5,00'
 */
export function formatMoney(cents: number, options: { signed?: boolean; compact?: boolean } = {}): string {
  const formatter = options.compact ? compactCurrency : currency;
  const text = formatter.format(Math.abs(cents) / 100);
  if (cents < 0) return `-${text}`;
  return options.signed && cents > 0 ? `+${text}` : text;
}

/**
 * Formata uma fração como porcentagem.
 *
 * @param ratio - Fração (0,125 = 12,5%)
 * @returns Texto como `12,5%`
 */
export function formatPercent(ratio: number): string {
  return percent.format(ratio);
}

/**
 * Converte `YYYY-MM-DD` em `Date` local, sem o deslocamento de fuso que
 * `new Date('2026-11-05')` (UTC) causaria.
 *
 * @param iso - Data de calendário
 * @returns Data local à meia-noite
 */
export function parseIsoDate(iso: string): Date {
  const [year, month, day] = iso.slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Formata `Date` local como `YYYY-MM-DD`.
 *
 * @param date - Data
 * @returns Data de calendário
 */
export function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * Data de hoje como `YYYY-MM-DD`.
 *
 * @returns Data de calendário de hoje
 */
export function todayIso(): string {
  return toIsoDate(new Date());
}

/**
 * Formata uma data de lançamento: "Hoje", "Ontem", "Amanhã" ou "5 de nov.".
 *
 * @param iso - Data `YYYY-MM-DD`
 * @returns Texto curto
 */
export function formatDay(iso: string): string {
  const date = parseIsoDate(iso);
  const today = parseIsoDate(todayIso());
  const diff = Math.round((date.getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return 'Hoje';
  if (diff === -1) return 'Ontem';
  if (diff === 1) return 'Amanhã';
  const sameYear = date.getFullYear() === today.getFullYear();
  return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }) });
}

/**
 * Formata uma data completa: "quinta-feira, 5 de novembro".
 *
 * @param iso - Data `YYYY-MM-DD`
 * @returns Texto longo, com inicial maiúscula
 */
export function formatLongDay(iso: string): string {
  const text = parseIsoDate(iso).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Nome curto do mês de um `YYYY-MM`: "nov.".
 *
 * @param month - Mês `YYYY-MM`
 * @returns Abreviação
 */
export function formatMonthShort(month: string): string {
  return parseIsoDate(`${month}-01`).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
}

/**
 * Nome do mês com ano: "Novembro de 2026".
 *
 * @param month - Mês `YYYY-MM`
 * @returns Texto com inicial maiúscula
 */
export function formatMonthLong(month: string): string {
  const text = parseIsoDate(`${month}-01`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Formata CNPJ (14 dígitos) ou CPF (11 dígitos).
 *
 * @param digits - Documento só com dígitos
 * @returns Documento com máscara, ou o valor original se não tiver 11/14 dígitos
 */
export function formatDocument(digits: string | null): string {
  if (!digits) return '';
  if (digits.length === 14) return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  if (digits.length === 11) return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  return digits;
}

/**
 * Iniciais para avatar: "Studio Aurora" → "SA".
 *
 * @param name - Nome
 * @returns Até duas letras maiúsculas
 */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]!.toUpperCase())
    .join('');
}
