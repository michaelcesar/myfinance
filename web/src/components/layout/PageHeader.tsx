/**
 * Cabeçalho de página com título grande, como nos apps da Apple.
 *
 * @module components/layout/PageHeader
 */
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** Contêiner do cabeçalho — o `PageHeaderSkeleton` usa o mesmo. Fica dentro do `PAGE_STACK_CLASS`: `mb-2` + `gap-4` dão os 24px até o conteúdo. */
export const PAGE_HEADER_CLASS = 'mb-2 flex flex-col gap-3 md:flex-row md:items-end md:justify-between';

/** Título grande da página. */
export const PAGE_TITLE_CLASS = 'font-display text-display leading-[1.1] font-bold tracking-[-0.03em]';

/** Subtítulo da página. */
export const PAGE_SUBTITLE_CLASS = 'mt-1.5 text-body text-fg-muted';

/** Área das ações à direita. */
export const PAGE_ACTIONS_CLASS = 'flex flex-wrap items-center gap-2';

/**
 * Pilha de blocos da página: espaço padrão entre seções e entrada escalonada
 * (`motion-stagger`, 50 ms entre blocos). A tela e o esqueleto dela usam a
 * mesma pilha, então a troca esqueleto → conteúdo é um esmaecer no lugar.
 */
export const PAGE_STACK_CLASS = 'flex flex-col gap-4 motion-stagger';

/** Propriedades do cabeçalho. */
export interface PageHeaderProps {
  title: string;
  subtitle?: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

/**
 * Título de 34 px em negrito, subtítulo e ações à direita.
 *
 * @example
 * <PageHeader title='Visão geral' subtitle='Tudo consolidado' actions={<PeriodPicker />} />
 */
export function PageHeader({ title, subtitle, eyebrow, actions, className }: PageHeaderProps) {
  return (
    <header className={cn(PAGE_HEADER_CLASS, className)}>
      <div className='min-w-0'>
        {eyebrow && <div className='mb-2'>{eyebrow}</div>}
        <h1 className={PAGE_TITLE_CLASS}>{title}</h1>
        {subtitle && <div className={PAGE_SUBTITLE_CLASS}>{subtitle}</div>}
      </div>
      {actions && <div className={PAGE_ACTIONS_CLASS}>{actions}</div>}
    </header>
  );
}
