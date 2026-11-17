/**
 * Todas as contas, de todos os livros.
 *
 * @module app/(app)/contas/AccountsView
 */
'use client';

import { useState } from 'react';
import { AccountsPanel, AccountsPanelSkeleton } from '@/components/finance/AccountsPanel';
import { PAGE_STACK_CLASS, PageHeader } from '@/components/layout/PageHeader';
import { SegmentedControl, SegmentedControlSkeleton } from '@/components/ui/SegmentedControl';
import { PageHeaderSkeleton } from '@/components/ui/SkeletonKit';
import { useAccounts } from '@/hooks/useFinance';

const PAGE_TITLE = 'Contas';
const PAGE_SUBTITLE = 'Bancos, carteiras, cartões e corretoras, pessoais e das empresas.';

/** Opções do filtro de arquivadas — o controle e o esqueleto usam as mesmas. */
const SCOPE_SEGMENTS: { value: 'active' | 'all'; label: string }[] = [
  { value: 'active', label: 'Ativas' },
  { value: 'all', label: 'Todas' },
];

/**
 * Esqueleto da tela de contas — usado pelo `loading.tsx` e enquanto as contas carregam.
 *
 * @returns Página em esqueleto
 */
export function AccountsPageSkeleton() {
  return (
    <div className={PAGE_STACK_CLASS}>
      <PageHeaderSkeleton title={PAGE_TITLE} subtitle={PAGE_SUBTITLE} actions={<SegmentedControlSkeleton labels={SCOPE_SEGMENTS.map(segment => segment.label)} size='sm' />} />
      <AccountsPanelSkeleton />
    </div>
  );
}

/**
 * Tela de contas, com opção de ver as arquivadas. Espera a primeira carga
 * das contas ativas (a mesma query do painel); trocar para "Todas" carrega
 * dentro do painel, sem tirar o cabeçalho.
 *
 * @returns Cabeçalho e grade de contas
 */
export function AccountsView() {
  const [scope, setScope] = useState<'active' | 'all'>('active');
  const accounts = useAccounts();

  if (accounts.isPending) return <AccountsPageSkeleton />;

  return (
    <div className={PAGE_STACK_CLASS}>
      <PageHeader title={PAGE_TITLE} subtitle={PAGE_SUBTITLE} actions={<SegmentedControl label='Mostrar' size='sm' segments={SCOPE_SEGMENTS} value={scope} onChange={setScope} />} />
      <AccountsPanel includeArchived={scope === 'all'} />
    </div>
  );
}
