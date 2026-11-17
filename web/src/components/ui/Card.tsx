/**
 * Cartão de conteúdo e cabeçalho de seção.
 *
 * @module components/ui/Card
 */
import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * Superfície branca (ou cinza-escura no tema escuro) com cantos de 20 px.
 *
 * @example
 * <Card className='p-5'>...</Card>
 */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn(CARD_CLASS, className)} {...props} />;
}

/** Propriedades do cabeçalho de seção. */
/** Moldura do cartão. Esqueleto usa `<Card>`, nunca a moldura copiada à mão. */
export const CARD_CLASS = 'rounded-card bg-surface shadow-card';

/** Contêiner do título de seção. */
export const SECTION_HEADER_CLASS = 'mb-3 flex items-end justify-between gap-3 px-1';

/** Título de seção. */
export const SECTION_TITLE_CLASS = 'font-display text-title-3 font-bold tracking-[-0.02em]';

/** Subtítulo de seção. */
export const SECTION_SUBTITLE_CLASS = 'mt-0.5 text-footnote text-fg-muted';

/** Propriedades do título de seção. */
export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}

/**
 * Título de seção com ação opcional à direita (o "Ver tudo" do iOS).
 *
 * @example
 * <SectionHeader title='Contas' action={<Link href='/contas'>Ver todas</Link>} />
 */
export function SectionHeader({ title, subtitle, action, className }: SectionHeaderProps) {
  return (
    <div className={cn(SECTION_HEADER_CLASS, className)}>
      <div className='min-w-0'>
        <h2 className={SECTION_TITLE_CLASS}>{title}</h2>
        {subtitle && <p className={SECTION_SUBTITLE_CLASS}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
