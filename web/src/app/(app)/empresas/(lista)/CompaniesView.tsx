/**
 * Lista das empresas do usuário, com o resultado do período.
 *
 * @module app/(app)/empresas/(lista)/CompaniesView
 */
'use client';

import { Building2, ChevronRight, Plus } from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { useState } from 'react';
import { LedgerSheet } from '@/components/finance/LedgerSheet';
import { Reveal } from '@/components/finance/SummaryBlocks';
import { PAGE_STACK_CLASS, PageHeader } from '@/components/layout/PageHeader';
import { PeriodPicker, PeriodPickerSkeleton } from '@/components/layout/PeriodPicker';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { CARD_CLASS, Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/Feedback';
import { IconTile } from '@/components/ui/IconTile';
import { Money } from '@/components/ui/Money';
import { ButtonSkeleton, IconTileSkeleton, PageHeaderSkeleton, SkeletonText } from '@/components/ui/SkeletonKit';
import { useLedgers, useOverview } from '@/hooks/useFinance';
import { cn } from '@/lib/cn';
import { formatDocument, initials } from '@/lib/format';
import { usePeriod } from '@/providers/PeriodProvider';

const PAGE_TITLE = 'Empresas';
const PAGE_SUBTITLE = 'Cada empresa tem contas, receitas, despesas e investimentos próprios.';

/** Grade dos cartões — a tela e o esqueleto usam a mesma. */
const GRID_CLASS = 'grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3';

/** Respiro interno do cartão de empresa. */
const CARD_PADDING_CLASS = 'p-5';

/** Nome da empresa. */
const NAME_CLASS = 'truncate text-headline font-semibold';

/** Razão social e documento. */
const DETAIL_CLASS = 'truncate text-footnote text-fg-muted';

/** Faixa de indicadores no pé do cartão. */
const STATS_CLASS = 'mt-5 grid grid-cols-3 gap-2 border-t border-border pt-4 text-footnote';

/** Valor de cada indicador. */
const STAT_VALUE_CLASS = 'block truncate text-subhead font-semibold xl:text-callout';

/** Rótulos dos indicadores, na ordem do cartão. */
const STAT_LABELS = ['Patrimônio', 'Faturamento', 'Resultado'] as const;

/**
 * Esqueleto do cartão de empresa: mesmo cartão, mesmo bloco de iniciais,
 * nome, detalhe e a faixa dos três indicadores.
 *
 * @returns Cartão em esqueleto
 */
export function CompanyCardSkeleton() {
  return (
    <Card className={CARD_PADDING_CLASS} aria-hidden>
      <div className='flex items-center gap-3'>
        <IconTileSkeleton size='lg' />
        <div className='min-w-0 flex-1'>
          <SkeletonText className={NAME_CLASS} width='55%' />
          <SkeletonText className={DETAIL_CLASS} width='75%' />
        </div>
      </div>
      <div className={STATS_CLASS}>
        {STAT_LABELS.map(label => (
          <div key={label}>
            <SkeletonText width='70%' />
            <SkeletonText className={STAT_VALUE_CLASS} width='85%' />
          </div>
        ))}
      </div>
    </Card>
  );
}

/**
 * Esqueleto da tela de empresas — usado pelo `loading.tsx` e enquanto a lista carrega.
 *
 * @returns Página em esqueleto
 */
export function CompaniesPageSkeleton() {
  return (
    <div className={PAGE_STACK_CLASS}>
      <PageHeaderSkeleton
        title={PAGE_TITLE}
        subtitle={PAGE_SUBTITLE}
        actions={
          <>
            <PeriodPickerSkeleton />
            <ButtonSkeleton label='Nova empresa' icon />
          </>
        }
      />
      <div className={GRID_CLASS}>
        <CompanyCardSkeleton />
        <CompanyCardSkeleton />
      </div>
    </div>
  );
}

/**
 * Tela das empresas: cartões com patrimônio e resultado, inclusive as arquivadas.
 *
 * @returns Lista de empresas
 */
export function CompaniesView() {
  const period = usePeriod();
  const ledgers = useLedgers(true);
  const overview = useOverview({ from: period.from, to: period.to });
  const [creating, setCreating] = useState(false);

  if (ledgers.isPending) return <CompaniesPageSkeleton />;

  const companies = (ledgers.data ?? []).filter(ledger => ledger.type === 'COMPANY');
  const stats = new Map((overview.data?.ledgers ?? []).map(item => [item.ledgerId, item]));

  return (
    <div className={PAGE_STACK_CLASS}>
      <PageHeader
        title={PAGE_TITLE}
        subtitle={PAGE_SUBTITLE}
        actions={
          <>
            <PeriodPicker />
            <Button icon={<Plus className='size-4' strokeWidth={2.6} />} onClick={() => setCreating(true)}>
              Nova empresa
            </Button>
          </>
        }
      />
      {companies.length ? (
        <div className={GRID_CLASS}>
          {companies.map((company, index) => {
            const stat = stats.get(company.ledgerId);
            const values = stat ? [stat.cashCents + stat.investmentsCents, stat.incomeCents, stat.incomeCents - stat.expenseCents] : null;
            return (
              <Reveal key={company.ledgerId} index={index}>
                <motion.div whileHover={{ y: -2 }} transition={{ type: 'spring', stiffness: 400, damping: 30 }}>
                  <Link href={`/empresas/${company.ledgerId}`} className={cn('group block', CARD_CLASS, CARD_PADDING_CLASS)}>
                    <div className='flex items-center gap-3'>
                      <IconTile text={initials(company.name)} size='lg' />
                      <div className='min-w-0 flex-1'>
                        <div className='flex items-center gap-2'>
                          <p className={NAME_CLASS}>{company.name}</p>
                          {company.archived && <Badge>Arquivada</Badge>}
                        </div>
                        <p className={DETAIL_CLASS}>{[company.legalName, formatDocument(company.document)].filter(Boolean).join(' · ') || 'Sem razão social'}</p>
                      </div>
                      <ChevronRight className='size-5 text-fg-subtle transition-transform group-hover:translate-x-0.5' />
                    </div>
                    {values ? (
                      <div className={STATS_CLASS}>
                        {STAT_LABELS.map((label, position) => (
                          <div key={label}>
                            <p className='text-fg-muted'>{label}</p>
                            <Money cents={values[position]} signed={label === 'Resultado'} tone={label === 'Resultado' ? 'auto' : undefined} className={STAT_VALUE_CLASS} />
                          </div>
                        ))}
                      </div>
                    ) : (
                      overview.isPending && (
                        <div className={STATS_CLASS} aria-hidden>
                          {STAT_LABELS.map(label => (
                            <div key={label}>
                              <p className='text-fg-muted'>{label}</p>
                              <SkeletonText className={STAT_VALUE_CLASS} width='85%' />
                            </div>
                          ))}
                        </div>
                      )
                    )}
                  </Link>
                </motion.div>
              </Reveal>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={Building2}
          title='Nenhuma empresa ainda'
          message='Cadastre suas empresas para separar o dinheiro delas do seu.'
          action={
            <Button icon={<Plus className='size-4' />} onClick={() => setCreating(true)}>
              Nova empresa
            </Button>
          }
        />
      )}
      <LedgerSheet open={creating} onOpenChange={setCreating} />
    </div>
  );
}
