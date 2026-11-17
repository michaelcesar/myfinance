/**
 * Estados de carregamento, vazio e erro.
 *
 * @module components/ui/Feedback
 */
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** Propriedades do estado vazio. */
export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  message: string;
  action?: ReactNode;
  className?: string;
}

/**
 * Estado vazio com ícone grande, título, explicação e ação.
 *
 * @example
 * <EmptyState icon={Wallet} title='Nenhuma conta' message='Cadastre onde seu dinheiro fica.' action={<Button>Nova conta</Button>} />
 */
export function EmptyState({ icon: Icon, title, message, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-12 text-center', className)}>
      <span className='mb-4 flex size-14 items-center justify-center rounded-full bg-fill-2 text-fg-subtle'>
        <Icon className='size-7' strokeWidth={1.8} />
      </span>
      <h3 className='text-headline font-semibold'>{title}</h3>
      <p className='mt-1 max-w-sm text-subhead text-fg-muted'>{message}</p>
      {action && <div className='mt-5'>{action}</div>}
    </div>
  );
}

/**
 * Mensagem de erro de leitura, com ação de tentar de novo.
 *
 * @example
 * <ErrorState message={error.message} onRetry={refetch} />
 */
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className='flex flex-col items-center px-6 py-10 text-center'>
      <p className='text-body text-fg-muted'>{message}</p>
      {onRetry && (
        <button type='button' onClick={onRetry} className='mt-3 text-body font-semibold text-fg underline-offset-4 hover:underline'>
          Tentar de novo
        </button>
      )}
    </div>
  );
}
