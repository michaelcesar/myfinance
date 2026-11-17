/**
 * Marca do Finance Manager: só as letras "FM" em texto, sem logo nem bloco.
 * O nome completo aparece num lugar discreto (rodapé do menu e título da aba).
 *
 * @module components/layout/BrandMark
 */
import { cn } from '@/lib/cn';

/** Nome completo do produto, para os lugares discretos. */
export const PRODUCT_NAME = 'Finance Manager';

/** Classes do monograma; o tamanho vem de quem usa (`text-title-3`, `text-display`…). */
export const BRAND_MARK_CLASS = 'font-display leading-none font-extrabold tracking-[-0.04em] text-fg';

/**
 * Monograma "FM" em texto.
 *
 * @example
 * <BrandMark className='text-title-3' />
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cn('shrink-0 select-none', BRAND_MARK_CLASS, className)} role='img' aria-label={PRODUCT_NAME}>
      FM
    </span>
  );
}
