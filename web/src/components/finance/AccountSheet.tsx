/**
 * Folha de criação e edição de conta.
 *
 * @module components/finance/AccountSheet
 */
'use client';

import { Archive, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ColorPicker } from '@/components/ui/ColorPicker';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Select, TextInput } from '@/components/ui/Field';
import { MoneyInput } from '@/components/ui/MoneyInput';
import { Sheet } from '@/components/ui/Sheet';
import { useAppForm } from '@/hooks/useAppForm';
import { useFinanceMutation, useLedgers } from '@/hooks/useFinance';
import { moneyField, textField } from '@/lib/form';
import { ACCOUNT_TYPE_LABELS, toOptions } from '@/lib/labels';
import { ledgerOptions } from '@/lib/options';
import { type AccountInput, accountsService } from '@/services/finance.service';
import { type AccountFormValues, accountSchema, parseRate } from '@/schemas/account.schema';
import type { Account } from '@/types/entities';

/** Propriedades da folha. */
export interface AccountSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: Account;
  ledgerId?: string;
  /** Recebe a conta recém-criada (para já selecioná-la em outro formulário). */
  onCreated?: (account: Account) => void;
}

/**
 * Folha da conta.
 *
 * @example
 * <AccountSheet open={open} onOpenChange={setOpen} ledgerId={ledgerId} />
 */
export function AccountSheet({ open, onOpenChange, account, ledgerId, onCreated }: AccountSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={account ? 'Editar conta' : 'Nova conta'} description={account ? undefined : 'Banco, carteira, cartão ou corretora.'}>
      <AccountForm account={account} ledgerId={ledgerId} onCreated={onCreated} onDone={() => onOpenChange(false)} />
    </Sheet>
  );
}

/**
 * Formulário da conta.
 *
 * @param props - Conta em edição, livro sugerido e callbacks
 * @returns Formulário
 */
function AccountForm({ account, ledgerId, onCreated, onDone }: { account?: Account; ledgerId?: string; onCreated?: (account: Account) => void; onDone: () => void }) {
  const ledgers = useLedgers();
  const [confirming, setConfirming] = useState(false);
  const save = useFinanceMutation(
    (input: AccountInput) =>
      account
        ? accountsService.update(account.accountId, {
            name: input.name,
            type: input.type,
            institution: input.institution,
            initialBalanceCents: input.initialBalanceCents,
            color: input.color,
            annualYieldRate: input.annualYieldRate,
          })
        : accountsService.create(input),
    account ? 'Conta atualizada.' : 'Conta criada.'
  );
  const archive = useFinanceMutation(() => accountsService.update(account!.accountId, { archived: !account!.archived }), account?.archived ? 'Conta reativada.' : 'Conta arquivada.');
  const remove = useFinanceMutation(() => accountsService.remove(account!.accountId), 'Conta apagada.');

  const form = useAppForm<AccountFormValues>({
    initialValues: {
      ledgerId: account?.ledgerId ?? ledgerId ?? ledgers.data?.[0]?.ledgerId ?? '',
      name: account?.name ?? '',
      type: account?.type ?? 'CHECKING',
      institution: account?.institution ?? '',
      initialBalanceCents: account?.initialBalanceCents ?? null,
      color: account?.color ?? 'blue',
      annualYieldRate: account?.annualYieldRate ? String(account.annualYieldRate).replace('.', ',') : '',
    },
    schema: accountSchema,
    onSubmit: async values => {
      const saved = await save.mutateAsync({
        ...values,
        institution: values.institution || null,
        initialBalanceCents: values.initialBalanceCents ?? 0,
        annualYieldRate: parseRate(values.annualYieldRate),
      });
      if (!account) onCreated?.(saved);
      onDone();
    },
  });

  return (
    <form onSubmit={form.submit} noValidate className='flex flex-col gap-4'>
      <Select
        label='Livro'
        options={ledgerOptions(ledgers.data ?? [])}
        placeholder={ledgers.data?.length ? undefined : 'Carregando…'}
        {...textField(form, 'ledgerId')}
        disabled={!!account}
        hint={account ? 'Uma conta não muda de livro.' : undefined}
      />
      <TextInput label='Nome' placeholder='Ex.: Nubank' {...textField(form, 'name')} maxLength={120} />
      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
        <Select label='Tipo' options={toOptions(ACCOUNT_TYPE_LABELS)} {...textField(form, 'type')} />
        <TextInput label='Instituição' placeholder='Opcional' {...textField(form, 'institution')} maxLength={120} />
      </div>
      <MoneyInput label='Saldo inicial' {...moneyField(form, 'initialBalanceCents')} allowNegative hint='O saldo no dia em que você começou a acompanhar esta conta.' />
      <TextInput
        label='Rende (% ao ano)'
        inputMode='decimal'
        placeholder='Ex.: 11,15'
        {...textField(form, 'annualYieldRate')}
        maxLength={9}
        hint='Opcional. É a taxa do banco, usada para estimar o rendimento.'
      />
      <div className='flex flex-col gap-2'>
        <span className='px-1 text-footnote font-medium text-fg-muted'>Cor</span>
        <ColorPicker value={form.values.color} onChange={color => void form.setFieldValue('color', color)} />
      </div>
      <Button type='submit' size='lg' className='mt-2 w-full' loading={save.isPending || form.isSubmitting}>
        {account ? 'Salvar' : 'Criar conta'}
      </Button>
      {account && (
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
            {account.archived ? 'Reativar' : 'Arquivar'}
          </Button>
          <Button variant='destructive' className='flex-1' icon={<Trash2 className='size-4' />} onClick={() => setConfirming(true)}>
            Apagar
          </Button>
        </div>
      )}
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title='Apagar conta?'
        message='Só é possível apagar uma conta sem lançamentos. Com histórico, arquive.'
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
