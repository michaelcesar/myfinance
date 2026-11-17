/**
 * Folha de lançamento: despesa, receita ou transferência — criar e editar.
 *
 * @module components/finance/TransactionSheet
 */
'use client';

import { ArrowDown, Info, Trash2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { FIELD_CLASS, FIELD_LABEL_CLASS, Select, TextArea, TextInput } from '@/components/ui/Field';
import { MoneyInput } from '@/components/ui/MoneyInput';
import { SegmentedControl, SegmentedControlSkeleton } from '@/components/ui/SegmentedControl';
import { Sheet } from '@/components/ui/Sheet';
import { Skeleton } from '@/components/ui/Skeleton';
import { ButtonSkeleton, SkeletonText, FieldSkeleton } from '@/components/ui/SkeletonKit';
import { Switch } from '@/components/ui/Switch';
import { useAppForm } from '@/hooks/useAppForm';
import { useAccounts, useCategories, useFinanceMutation, useLedgers } from '@/hooks/useFinance';
import { cn } from '@/lib/cn';
import { fieldError, moneyField, textField } from '@/lib/form';
import { todayIso } from '@/lib/format';
import { toOptions, TRANSFER_KIND_LABELS } from '@/lib/labels';
import { accountOptions, categoryOptions, EMPTY_ACCOUNTS, EMPTY_CATEGORIES } from '@/lib/options';
import { type TransactionInput, transactionsService, type TransferInput, transfersService } from '@/services/finance.service';
import { type EntryKind, type TransactionFormValues, transactionSchema } from '@/schemas/transaction.schema';
import { AccountSheet } from './AccountSheet';
import { CategorySheet } from './CategorySheet';
import type { Account, CategoryKind, Ledger, Transaction, TransferKind } from '@/types/entities';

export type { EntryKind } from '@/schemas/transaction.schema';

/** Opções do tipo de lançamento — o controle e o esqueleto usam as mesmas. */
const KIND_SEGMENTS: { value: EntryKind; label: string }[] = [
  { value: 'EXPENSE', label: 'Despesa' },
  { value: 'INCOME', label: 'Receita' },
  { value: 'TRANSFER', label: 'Transferência' },
];

/** Rótulos dos campos — o formulário e o esqueleto usam os mesmos. */
const FIELD_LABELS = {
  amount: 'Valor',
  from: 'De',
  to: 'Para',
  reason: 'Motivo',
  description: 'Descrição',
  date: 'Data',
  account: 'Conta',
  category: 'Categoria',
  notes: 'Observações',
} as const;

/** Explicação da chave de pago quando ligada (o padrão de um lançamento novo). */
const PAID_DESCRIPTION = 'Entra no saldo da conta.';

/** Pilha do formulário. */
const FORM_CLASS = 'flex flex-col gap-4';

/** Par de campos lado a lado a partir do `sm`. */
const FIELD_PAIR_CLASS = 'grid grid-cols-1 gap-4 sm:grid-cols-2';

/** Origem, seta e destino da transferência. */
const TRANSFER_ACCOUNTS_CLASS = 'flex flex-col gap-2';

/** Seta entre origem e destino. */
const TRANSFER_ARROW_CLASS = 'flex justify-center text-fg-subtle';

/** Linha dos botões no pé do formulário. */
const ACTIONS_CLASS = 'mt-2 flex items-center gap-2';

/** Largura mínima do botão de enviar. */
const SUBMIT_CLASS = 'min-w-[140px]';

/** Caixa do valor grande (campo `hero` do `MoneyInput`). */
const HERO_AMOUNT_BOX_CLASS = 'flex h-16 w-full items-center justify-center';

/** Texto do valor grande (campo `hero` do `MoneyInput`). */
const HERO_AMOUNT_TEXT_CLASS = 'tabular font-display text-display-lg font-bold tracking-[-0.03em]';

/** Caixa da área de observações: três linhas de `text-body` e o respiro vertical do controle. */
const NOTES_SHAPE_CLASS = 'h-[calc(3lh+1.25rem)] text-body';

/** Linha da chave de pago (`Switch`). */
const SWITCH_ROW_CLASS = 'flex items-center justify-between gap-4 rounded-control bg-fill-2 px-3.5 py-2.5';

/** Valores iniciais ao abrir a folha. */
export interface TransactionSheetDefaults {
  kind?: EntryKind;
  ledgerId?: string;
  accountId?: string;
  /** Lançamento existente: abre em modo de edição. */
  transaction?: Transaction;
}

/** Propriedades da folha. */
export interface TransactionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaults?: TransactionSheetDefaults;
}

/**
 * Sugere o motivo da transferência pelos livros envolvidos: empresa →
 * pessoal é pró-labore; pessoal → empresa, aporte; mesmo livro, entre contas.
 *
 * @param from - Livro de origem
 * @param to - Livro de destino
 * @returns Motivo sugerido
 */
export function suggestTransferKind(from?: Ledger, to?: Ledger): TransferKind {
  if (!from || !to || from.ledgerId === to.ledgerId) return 'INTERNAL';
  if (from.type === 'COMPANY' && to.type === 'PERSONAL') return 'PRO_LABORE';
  if (from.type === 'PERSONAL' && to.type === 'COMPANY') return 'CAPITAL_CONTRIBUTION';
  return 'INTERNAL';
}

/**
 * Folha de lançamento. O formulário só monta com a folha aberta, então cada
 * abertura começa limpa (ou com os dados do lançamento editado).
 *
 * @example
 * <TransactionSheet open={open} onOpenChange={setOpen} defaults={{ kind: 'INCOME', ledgerId }} />
 */
export function TransactionSheet({ open, onOpenChange, defaults }: TransactionSheetProps) {
  const editing = defaults?.transaction;
  const title = editing ? (editing.transferId ? 'Editar transferência' : 'Editar lançamento') : 'Novo lançamento';
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={title}>
      <TransactionForm defaults={defaults} onDone={() => onOpenChange(false)} />
    </Sheet>
  );
}

/**
 * Tipo com que a folha abre: o do lançamento editado, o pedido ou despesa.
 *
 * @param defaults - Valores iniciais
 * @returns Tipo inicial
 */
function initialKindOf(defaults?: TransactionSheetDefaults): EntryKind {
  const editing = defaults?.transaction;
  if (editing) return editing.transferId ? 'TRANSFER' : (editing.kind as EntryKind);
  return defaults?.kind ?? 'EXPENSE';
}

/** Propriedades do esqueleto do formulário. */
export interface TransactionFormSkeletonProps {
  /** Tipo com que o formulário vai abrir (decide os campos). */
  kind?: EntryKind;
  /** Edição: sem o seletor de tipo e com o botão de apagar. */
  editing?: boolean;
}

/**
 * Esqueleto do formulário de lançamento: os mesmos campos e a mesma grade do
 * tipo que vai abrir, com rótulos fixos e caixas no lugar dos controles.
 *
 * @param props - Tipo e se é edição
 * @returns Formulário em esqueleto
 *
 * @example
 * <TransactionFormSkeleton kind='INCOME' />
 */
export function TransactionFormSkeleton({ kind = 'EXPENSE', editing = false }: TransactionFormSkeletonProps) {
  return (
    <div className={FORM_CLASS} aria-hidden>
      {!editing && <SegmentedControlSkeleton labels={KIND_SEGMENTS.map(segment => segment.label)} className='w-full' />}
      <div className={cn(FIELD_CLASS, 'items-center text-center')}>
        <SkeletonText className={FIELD_LABEL_CLASS} text={FIELD_LABELS.amount} />
        <div className={HERO_AMOUNT_BOX_CLASS}>
          <SkeletonText className={HERO_AMOUNT_TEXT_CLASS} text='R$ 0,00' />
        </div>
      </div>
      {kind === 'TRANSFER' ? (
        <>
          <div className={TRANSFER_ACCOUNTS_CLASS}>
            <FieldSkeleton label={FIELD_LABELS.from} />
            <div className={TRANSFER_ARROW_CLASS}>
              <ArrowDown className='size-5' />
            </div>
            <FieldSkeleton label={FIELD_LABELS.to} />
          </div>
          <FieldSkeleton label={FIELD_LABELS.reason} />
          <FieldSkeleton label={FIELD_LABELS.description} />
          <FieldSkeleton label={FIELD_LABELS.date} />
        </>
      ) : (
        <>
          <FieldSkeleton label={FIELD_LABELS.description} />
          <div className={FIELD_PAIR_CLASS}>
            <FieldSkeleton label={FIELD_LABELS.date} />
            <FieldSkeleton label={FIELD_LABELS.account} />
          </div>
          <FieldSkeleton label={FIELD_LABELS.category} />
          <div className={SWITCH_ROW_CLASS}>
            <div className='min-w-0'>
              <SkeletonText className='text-body' text={paidLabel(kind)} />
              <SkeletonText className='text-caption' text={PAID_DESCRIPTION} />
            </div>
            <Skeleton className='h-[31px] w-[51px] shrink-0 rounded-full' />
          </div>
        </>
      )}
      <FieldSkeleton label={FIELD_LABELS.notes} controlClassName={NOTES_SHAPE_CLASS} />
      <div className={ACTIONS_CLASS}>
        {editing && <ButtonSkeleton label='Apagar' icon />}
        <div className='flex-1' />
        <ButtonSkeleton size='lg' label={editing ? 'Salvar' : 'Adicionar'} className={SUBMIT_CLASS} />
      </div>
    </div>
  );
}

/**
 * Rótulo da chave de pago, pelo tipo do lançamento.
 *
 * @param kind - Tipo
 * @returns "Já recebido" ou "Já pago"
 */
function paidLabel(kind: EntryKind): string {
  return kind === 'INCOME' ? 'Já recebido' : 'Já pago';
}

/**
 * Espera livros e contas carregarem antes de montar o formulário, para a
 * conta sugerida já entrar nos valores iniciais.
 *
 * @param props - Valores iniciais e callback de conclusão
 * @returns Formulário, ou um esqueleto enquanto carrega
 */
function TransactionForm({ defaults, onDone }: { defaults?: TransactionSheetDefaults; onDone: () => void }) {
  const ledgers = useLedgers();
  const accounts = useAccounts();
  if (ledgers.isPending || accounts.isPending) return <TransactionFormSkeleton kind={initialKindOf(defaults)} editing={!!defaults?.transaction} />;
  return <TransactionFormBody defaults={defaults} ledgers={ledgers.data ?? []} accounts={accounts.data ?? []} onDone={onDone} />;
}

/** Propriedades do corpo do formulário. */
interface TransactionFormBodyProps {
  defaults?: TransactionSheetDefaults;
  ledgers: Ledger[];
  accounts: Account[];
  onDone: () => void;
}

/**
 * Corpo do formulário.
 *
 * @param props - Valores iniciais, livros, contas e callback de conclusão
 * @returns Formulário
 */
function TransactionFormBody({ defaults, ledgers, accounts, onDone }: TransactionFormBodyProps) {
  const editing = defaults?.transaction;
  const editingTransfer = editing?.transfer ?? null;
  const initialKind = initialKindOf(defaults);

  const categories = useCategories();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [creating, setCreating] = useState<'accountId' | 'fromAccountId' | 'toAccountId' | 'categoryId' | null>(null);

  const preferredLedgerId = editing ? undefined : defaults?.ledgerId;
  const accountList = useMemo(
    () => (preferredLedgerId ? [...accounts.filter(a => a.ledgerId === preferredLedgerId), ...accounts.filter(a => a.ledgerId !== preferredLedgerId)] : accounts),
    [accounts, preferredLedgerId]
  );
  const ledgerById = useMemo(() => new Map(ledgers.map(ledger => [ledger.ledgerId, ledger])), [ledgers]);
  const accountById = useMemo(() => new Map(accountList.map(account => [account.accountId, account])), [accountList]);

  /** Sem conta escolhida, sugere a primeira do livro de origem (ou a primeira de todas). */
  const suggestedAccountId = accountList.find(account => !preferredLedgerId || account.ledgerId === preferredLedgerId)?.accountId ?? '';

  /**
   * Livro de uma conta.
   *
   * @param accountId - Id da conta
   * @returns Livro, se a conta for conhecida
   */
  const ledgerOf = (accountId: string) => ledgerById.get(accountById.get(accountId)?.ledgerId ?? '');

  const saveTransaction = useFinanceMutation(
    (input: TransactionInput) => (editing ? transactionsService.update(editing.transactionId, input) : transactionsService.create(input)),
    editing ? 'Lançamento atualizado.' : 'Lançamento salvo.'
  );
  const saveTransfer = useFinanceMutation(
    (input: TransferInput) =>
      editingTransfer
        ? transfersService.update(editingTransfer.transferId, { amountCents: input.amountCents, date: input.date, kind: input.kind, description: input.description, notes: input.notes })
        : transfersService.create(input),
    editingTransfer ? 'Transferência atualizada.' : 'Transferência salva.'
  );
  const remove = useFinanceMutation(
    () => (editingTransfer ? transfersService.remove(editingTransfer.transferId) : transactionsService.remove(editing!.transactionId)),
    editingTransfer ? 'Transferência apagada.' : 'Lançamento apagado.'
  );

  const form = useAppForm<TransactionFormValues>({
    initialValues: {
      kind: initialKind,
      amountCents: editingTransfer?.amountCents ?? editing?.amountCents ?? null,
      description: editing?.transferId ? (editingTransfer?.description ?? editing.description) : (editing?.description ?? ''),
      date: editing?.date ?? todayIso(),
      accountId: editing ? editing.accountId : defaults?.accountId || suggestedAccountId,
      fromAccountId: editingTransfer?.fromAccountId ?? '',
      toAccountId: editingTransfer?.toAccountId ?? '',
      categoryId: editing?.categoryId ?? '',
      paid: editing ? editing.status === 'PAID' : true,
      notes: editing?.notes ?? '',
      transferKind: editingTransfer?.kind ?? null,
    },
    schema: transactionSchema,
    onSubmit: async values => {
      const amountCents = values.amountCents ?? 0;
      if (values.kind === 'TRANSFER') {
        await saveTransfer.mutateAsync({
          fromAccountId: values.fromAccountId,
          toAccountId: values.toAccountId,
          amountCents,
          date: values.date,
          kind: values.transferKind ?? suggestTransferKind(ledgerOf(values.fromAccountId), ledgerOf(values.toAccountId)),
          description: values.description || undefined,
          notes: values.notes || null,
        });
      } else {
        await saveTransaction.mutateAsync({
          accountId: values.accountId,
          kind: values.kind,
          amountCents,
          date: values.date,
          description: values.description,
          status: values.paid ? 'PAID' : 'PENDING',
          categoryId: values.categoryId || null,
          notes: values.notes || null,
        });
      }
      onDone();
    },
  });

  const { values } = form;
  const isTransfer = values.kind === 'TRANSFER';
  const categoryKind: CategoryKind = values.kind === 'INCOME' ? 'INCOME' : 'EXPENSE';
  const selectedAccount = accountById.get(values.accountId);
  const selectedLedger = selectedAccount ? ledgerById.get(selectedAccount.ledgerId) : undefined;
  const fromLedger = ledgerOf(values.fromAccountId);
  const toLedger = ledgerOf(values.toAccountId);
  const effectiveTransferKind = values.transferKind ?? suggestTransferKind(fromLedger, toLedger);
  const crossLedger = !!fromLedger && !!toLedger && fromLedger.ledgerId !== toLedger.ledgerId;
  const accountOpts = accountOptions(accountList, ledgers);
  const busy = saveTransaction.isPending || saveTransfer.isPending || form.isSubmitting;

  /**
   * Troca o tipo do lançamento; a categoria do tipo anterior não serve mais.
   *
   * @param kind - Novo tipo
   */
  function chooseKind(kind: EntryKind) {
    void form.setValues({ ...values, kind, categoryId: '' });
  }

  return (
    <>
      <form onSubmit={form.submit} noValidate className={FORM_CLASS}>
        {!editing && <SegmentedControl label='Tipo de lançamento' className='w-full' segments={KIND_SEGMENTS} value={values.kind} onChange={chooseKind} />}

        <MoneyInput label={FIELD_LABELS.amount} {...moneyField(form, 'amountCents')} size='hero' autoFocus={!editing} />

        <AnimatePresence mode='wait' initial={false}>
          <motion.div
            key={isTransfer ? 'transfer' : 'entry'}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
            className={FORM_CLASS}
          >
            {isTransfer ? (
              <>
                <div className={TRANSFER_ACCOUNTS_CLASS}>
                  <Select
                    label={FIELD_LABELS.from}
                    placeholder='Escolha a conta de origem'
                    options={accountOpts}
                    {...textField(form, 'fromAccountId')}
                    disabled={!!editingTransfer}
                    empty={{ ...EMPTY_ACCOUNTS, onCreate: () => setCreating('fromAccountId') }}
                  />
                  <div className={TRANSFER_ARROW_CLASS}>
                    <ArrowDown className='size-5' />
                  </div>
                  <Select
                    label={FIELD_LABELS.to}
                    placeholder='Escolha a conta de destino'
                    options={accountOpts.filter(o => o.value !== values.fromAccountId)}
                    {...textField(form, 'toAccountId')}
                    disabled={!!editingTransfer}
                    empty={{ ...EMPTY_ACCOUNTS, onCreate: () => setCreating('toAccountId') }}
                  />
                </div>
                <Select
                  label={FIELD_LABELS.reason}
                  options={toOptions(TRANSFER_KIND_LABELS)}
                  name='transferKind'
                  value={effectiveTransferKind}
                  onChange={form.handleChange}
                  onBlur={form.handleBlur}
                  error={fieldError(form, 'transferKind')}
                />
                {crossLedger && (
                  <p className='flex gap-2 rounded-control bg-fill-2 px-3.5 py-2.5 text-footnote text-fg-muted'>
                    <Info className='mt-0.5 size-4 shrink-0 text-fg-muted' />
                    Dinheiro entre {fromLedger.name} e {toLedger.name}: aparece como saída e entrada em cada livro, mas não conta como receita nem despesa na visão geral.
                  </p>
                )}
                <TextInput label={FIELD_LABELS.description} placeholder={TRANSFER_KIND_LABELS[effectiveTransferKind]} {...textField(form, 'description')} maxLength={200} />
                <TextInput label={FIELD_LABELS.date} type='date' {...textField(form, 'date')} />
              </>
            ) : (
              <>
                <TextInput label={FIELD_LABELS.description} placeholder={values.kind === 'INCOME' ? 'Ex.: Nota fiscal 42' : 'Ex.: Mercado'} {...textField(form, 'description')} maxLength={200} />
                <div className={FIELD_PAIR_CLASS}>
                  <TextInput label={FIELD_LABELS.date} type='date' {...textField(form, 'date')} />
                  <Select
                    label={FIELD_LABELS.account}
                    placeholder='Escolha a conta'
                    options={accountOpts}
                    {...textField(form, 'accountId')}
                    empty={{ ...EMPTY_ACCOUNTS, onCreate: () => setCreating('accountId') }}
                  />
                </div>
                <Select
                  label={FIELD_LABELS.category}
                  placeholder='Sem categoria'
                  options={categoryOptions(categories.data ?? [], categoryKind, selectedLedger?.type)}
                  {...textField(form, 'categoryId')}
                  empty={categories.isPending ? undefined : { ...EMPTY_CATEGORIES, onCreate: () => setCreating('categoryId') }}
                />
                <Switch
                  label={paidLabel(values.kind)}
                  description={values.paid ? PAID_DESCRIPTION : 'Fica como previsão até ser confirmado.'}
                  checked={values.paid}
                  onChange={paid => void form.setFieldValue('paid', paid)}
                />
              </>
            )}
            <TextArea label={FIELD_LABELS.notes} {...textField(form, 'notes')} maxLength={2000} />
          </motion.div>
        </AnimatePresence>

        <div className={ACTIONS_CLASS}>
          {editing && (
            <Button variant='destructive' icon={<Trash2 className='size-4' />} onClick={() => setConfirmingDelete(true)}>
              Apagar
            </Button>
          )}
          <div className='flex-1' />
          <Button type='submit' size='lg' loading={busy} className={SUBMIT_CLASS}>
            {editing ? 'Salvar' : 'Adicionar'}
          </Button>
        </div>

        <ConfirmDialog
          open={confirmingDelete}
          onOpenChange={setConfirmingDelete}
          title={editingTransfer ? 'Apagar transferência?' : 'Apagar lançamento?'}
          message={editingTransfer ? 'As duas pontas da transferência serão removidas.' : 'Esta ação não pode ser desfeita.'}
          confirmLabel='Apagar'
          destructive
          loading={remove.isPending}
          onConfirm={async () => {
            await remove.mutateAsync(undefined);
            setConfirmingDelete(false);
            onDone();
          }}
        />
      </form>
      <AccountSheet
        open={creating === 'accountId' || creating === 'fromAccountId' || creating === 'toAccountId'}
        onOpenChange={open => !open && setCreating(null)}
        ledgerId={preferredLedgerId}
        onCreated={account => creating && creating !== 'categoryId' && void form.setFieldValue(creating, account.accountId)}
      />
      <CategorySheet
        open={creating === 'categoryId'}
        onOpenChange={open => !open && setCreating(null)}
        kind={categoryKind}
        onCreated={category => void form.setFieldValue('categoryId', category.categoryId)}
      />
    </>
  );
}
