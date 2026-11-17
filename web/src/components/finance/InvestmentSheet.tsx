/**
 * Folhas de investimento: cadastro/edição do ativo e nova movimentação.
 *
 * @module components/finance/InvestmentSheet
 */
'use client';

import { Archive, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Select, TextArea, TextInput } from '@/components/ui/Field';
import { MoneyInput } from '@/components/ui/MoneyInput';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Sheet } from '@/components/ui/Sheet';
import { useAppForm } from '@/hooks/useAppForm';
import { useAccounts, useFinanceMutation, useLedgers } from '@/hooks/useFinance';
import { moneyField, textField } from '@/lib/form';
import { formatMoney, todayIso } from '@/lib/format';
import { INVESTMENT_TYPE_LABELS, toOptions } from '@/lib/labels';
import { EMPTY_ACCOUNTS, ledgerOptions } from '@/lib/options';
import { type InvestmentInput, investmentsService, type MovementInput } from '@/services/finance.service';
import { createMovementSchema, type InvestmentFormValues, investmentSchema, type MovementFormValues } from '@/schemas/investment.schema';
import type { Investment, MovementKind } from '@/types/entities';
import { AccountSheet } from './AccountSheet';

/** Propriedades da folha do ativo. */
export interface InvestmentSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  investment?: Investment;
  ledgerId?: string;
}

/**
 * Folha de cadastro ou edição de um ativo. Na edição, o valor atual vira
 * a "atualização de valor" (marcação a mercado).
 *
 * @example
 * <InvestmentSheet open={open} onOpenChange={setOpen} ledgerId={ledgerId} />
 */
export function InvestmentSheet({ open, onOpenChange, investment, ledgerId }: InvestmentSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={investment ? 'Editar investimento' : 'Novo investimento'}>
      <InvestmentForm investment={investment} ledgerId={ledgerId} onDone={() => onOpenChange(false)} />
    </Sheet>
  );
}

/**
 * Formulário do ativo.
 *
 * @param props - Ativo em edição, livro sugerido e callback
 * @returns Formulário
 */
function InvestmentForm({ investment, ledgerId, onDone }: { investment?: Investment; ledgerId?: string; onDone: () => void }) {
  const ledgers = useLedgers();
  const [confirming, setConfirming] = useState(false);
  const save = useFinanceMutation(
    (input: InvestmentInput) =>
      investment
        ? investmentsService.update(investment.investmentId, {
            name: input.name,
            type: input.type,
            institution: input.institution,
            currentValueCents: input.currentValueCents,
            valuedAt: input.valuedAt,
            notes: input.notes,
          })
        : investmentsService.create(input),
    investment ? 'Investimento atualizado.' : 'Investimento criado.'
  );
  const archive = useFinanceMutation(() => investmentsService.update(investment!.investmentId, { archived: true }), 'Investimento arquivado.');
  const remove = useFinanceMutation(() => investmentsService.remove(investment!.investmentId), 'Investimento apagado.');

  const form = useAppForm<InvestmentFormValues>({
    initialValues: {
      ledgerId: investment?.ledgerId ?? ledgerId ?? ledgers.data?.[0]?.ledgerId ?? '',
      name: investment?.name ?? '',
      type: investment?.type ?? 'FIXED_INCOME',
      institution: investment?.institution ?? '',
      currentValueCents: investment?.currentValueCents ?? null,
      valuedAt: investment?.valuedAt ?? todayIso(),
      notes: investment?.notes ?? '',
    },
    schema: investmentSchema,
    onSubmit: async values => {
      await save.mutateAsync({
        ledgerId: values.ledgerId,
        name: values.name,
        type: values.type,
        institution: values.institution || null,
        ...(values.currentValueCents !== null ? { currentValueCents: values.currentValueCents, valuedAt: values.valuedAt } : {}),
        notes: values.notes || null,
      });
      onDone();
    },
  });

  return (
    <form onSubmit={form.submit} noValidate className='flex flex-col gap-4'>
      <Select
        label='Livro'
        options={ledgerOptions(ledgers.data ?? [])}
        placeholder={form.values.ledgerId ? undefined : ledgers.data?.length ? 'Escolha' : 'Carregando…'}
        {...textField(form, 'ledgerId')}
        disabled={!!investment}
      />
      <TextInput label='Nome' placeholder='Ex.: Tesouro Selic 2029' {...textField(form, 'name')} maxLength={160} autoFocus={!investment} />
      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
        <Select label='Classe' options={toOptions(INVESTMENT_TYPE_LABELS)} {...textField(form, 'type')} />
        <TextInput label='Instituição' placeholder='Opcional' {...textField(form, 'institution')} maxLength={120} />
      </div>
      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
        <MoneyInput label='Valor atual' {...moneyField(form, 'currentValueCents')} hint={investment ? `Investido: ${formatMoney(investment.investedCents)}` : 'Ou deixe zerado e registre aportes.'} />
        <TextInput label='Atualizado em' type='date' {...textField(form, 'valuedAt')} />
      </div>
      <TextArea label='Observações' {...textField(form, 'notes')} maxLength={2000} />
      <Button type='submit' size='lg' className='mt-2 w-full' loading={save.isPending || form.isSubmitting}>
        {investment ? 'Salvar' : 'Criar investimento'}
      </Button>
      {investment && (
        <div className='flex gap-2'>
          <Button
            variant='secondary'
            className='flex-1'
            icon={<Archive className='size-4' />}
            loading={archive.isPending}
            onClick={async () => {
              await archive.mutateAsync(undefined);
              onDone();
            }}
          >
            Arquivar
          </Button>
          <Button variant='destructive' className='flex-1' icon={<Trash2 className='size-4' />} onClick={() => setConfirming(true)}>
            Apagar
          </Button>
        </div>
      )}
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title='Apagar investimento?'
        message='As movimentações e os lançamentos gerados nas contas também serão apagados.'
        confirmLabel='Apagar'
        destructive
        loading={remove.isPending}
        onConfirm={async () => {
          await remove.mutateAsync(undefined).finally(() => setConfirming(false));
          onDone();
        }}
      />
    </form>
  );
}

/** Propriedades da folha de movimentação. */
export interface MovementSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  investment?: Investment;
  initialKind?: MovementKind;
}

/**
 * Folha de aporte, resgate ou rendimento.
 *
 * @example
 * <MovementSheet open={open} onOpenChange={setOpen} investment={investment} />
 */
export function MovementSheet({ open, onOpenChange, investment, initialKind }: MovementSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title='Nova movimentação' description={investment?.name}>
      {investment && <MovementForm investment={investment} initialKind={initialKind} onDone={() => onOpenChange(false)} />}
    </Sheet>
  );
}

/**
 * Formulário da movimentação.
 *
 * @param props - Ativo, tipo inicial e callback
 * @returns Formulário
 */
function MovementForm({ investment, initialKind, onDone }: { investment: Investment; initialKind?: MovementKind; onDone: () => void }) {
  const accounts = useAccounts(investment.ledgerId);
  const [creatingAccount, setCreatingAccount] = useState(false);
  const save = useFinanceMutation((input: MovementInput) => investmentsService.addMovement(investment.investmentId, input), 'Movimentação registrada.');

  const form = useAppForm<MovementFormValues>({
    initialValues: { kind: initialKind ?? 'CONTRIBUTION', amountCents: null, date: todayIso(), accountId: '', notes: '' },
    schema: createMovementSchema(investment.currentValueCents),
    onSubmit: async values => {
      await save.mutateAsync({
        kind: values.kind,
        amountCents: values.amountCents ?? 0,
        date: values.date,
        accountId: values.kind === 'YIELD' ? null : values.accountId || null,
        notes: values.notes || null,
      });
      onDone();
    },
  });
  const kind = form.values.kind;

  return (
    <>
      <form onSubmit={form.submit} noValidate className='flex flex-col gap-4'>
        <SegmentedControl<MovementKind>
          label='Tipo de movimentação'
          className='w-full'
          segments={[
            { value: 'CONTRIBUTION', label: 'Aporte' },
            { value: 'WITHDRAWAL', label: 'Resgate' },
            { value: 'YIELD', label: 'Rendimento' },
          ]}
          value={kind}
          onChange={next => void form.setFieldValue('kind', next)}
        />
        <MoneyInput label='Valor' {...moneyField(form, 'amountCents')} size='hero' autoFocus hint={kind === 'WITHDRAWAL' ? `Valor atual: ${formatMoney(investment.currentValueCents)}` : undefined} />
        <TextInput label='Data' type='date' {...textField(form, 'date')} />
        {kind !== 'YIELD' && (
          <Select
            label={kind === 'CONTRIBUTION' ? 'Saiu da conta' : 'Voltou para a conta'}
            placeholder='Nenhuma (só registrar)'
            options={(accounts.data ?? []).map(account => ({ value: account.accountId, label: account.name }))}
            {...textField(form, 'accountId')}
            empty={accounts.isPending ? undefined : { ...EMPTY_ACCOUNTS, onCreate: () => setCreatingAccount(true) }}
            hint='Com conta, o saldo dela acompanha, sem virar receita nem despesa.'
          />
        )}
        <TextArea label='Observações' {...textField(form, 'notes')} maxLength={2000} />
        <Button type='submit' size='lg' className='mt-2 w-full' loading={save.isPending || form.isSubmitting}>
          Registrar
        </Button>
      </form>
      <AccountSheet open={creatingAccount} onOpenChange={setCreatingAccount} ledgerId={investment.ledgerId} onCreated={account => void form.setFieldValue('accountId', account.accountId)} />
    </>
  );
}
