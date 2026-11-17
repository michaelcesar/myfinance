/**
 * Etiqueta pequena em pílula.
 *
 * @module components/ui/Badge
 */
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** Tom da etiqueta: neutro ou um estado de feedback. */
export type BadgeTone = 'neutral' | 'success' | 'warning' | 'error';

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-fill text-fg-muted',
  success: 'bg-success-subtle text-success',
  warning: 'bg-warning-subtle text-warning',
  error: 'bg-error-subtle text-error',
};

/**
 * Pílula com fundo suave no tom pedido.
 *
 * @example
 * <Badge tone='warning'>Pendente</Badge>
 */
export function Badge({ tone = 'neutral', children, className }: { tone?: BadgeTone; children: ReactNode; className?: string }) {
  return <span className={cn('inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-caption-2 font-semibold', TONES[tone], className)}>{children}</span>;
}
