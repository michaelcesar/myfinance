/**
 * Átomo de carregamento: bloco cinza pulsante.
 *
 * Não se usa solto numa tela: as telas montam esqueletos com as peças de
 * `components/ui/SkeletonKit` e com o `*Skeleton` de cada componente (mesma
 * caixa, conteúdo trocado). Guarda: `test/guards/skeletonStandard`.
 *
 * @module components/ui/Skeleton
 */
import type { CSSProperties } from 'react';
import { cn } from '@/lib/cn';

/**
 * Bloco pulsante em `bg-fill`, raio `md` por padrão — o padrão sai quando
 * `className` traz outro raio (o `cn` só junta classes, não resolve conflito).
 *
 * @example
 * <Skeleton className='size-9 rounded-control' />
 */
export function Skeleton({ className, style }: { className?: string; style?: CSSProperties }) {
  const setsRadius = /(^|\s)rounded(-|$|\s)/.test(className ?? '');
  return <div className={cn('animate-pulse bg-fill', !setsRadius && 'rounded-md', className)} style={style} aria-hidden />;
}
