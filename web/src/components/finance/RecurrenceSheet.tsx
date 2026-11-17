/**
 * Folha de criar/editar recorrente (contrato ou conta fixa mensal).
 *
 * @module components/finance/RecurrenceSheet
 */
'use client';

import { CalendarX2, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Select, TextArea, TextInput } from '@/components/ui/Field';
import { MoneyInput } from '@/components/ui/MoneyInput';
import { Sheet } from '@/components/ui/Sheet';
import { useAppForm } from '@/hooks/useAppForm';
import { useAccounts, useCategories, useFinanceMutation, useLedgers } from '@/hooks/useFinance';
import { todayIso } from '@/lib/format';
import { moneyField, textField } from '@/lib/form';
import { accountOptions, categoryOptions, EMPTY_ACCOUNTS, EMPTY_CATEGORIES } from '@/lib/options';
import { type RecurrenceFormValues, recurrenceSchema } from '@/schemas/recurrence.schema';
import { type RecurrenceInput, recurrencesService } from '@/services/finance.service';
import type { Recurrence } from '@/types/entities';
import { AccountSheet } from './AccountSheet';
import { CategorySheet } from './CategorySheet';

/** Opções de tipo (só na criação). */
const KIND_OPTIONS = [
  { value: 'INCOME', label: 'Receita' },
  { value: 'EXPENSE', label: 'Despesa' },
];

/** Aviso quando o início é anterior ao mês atual. */
const PAST_START_HINT = 'Meses anteriores ao atual não são criados. Lance-os à mão se precisar.';

/** Explicação do primeiro dia da janela. */
const DAY_START_HINT = 'Opcional. Use para receber entre dois dias, como de 1 a 5.';

/** Explicação do último dia (o prazo). */
const DAY_END_HINT = 'O pendente fica neste dia; em mês mais curto, vale o último.';

/** Explicação do início no formulário. */
const START_HINT = 'O sistema mantém este mês e os dois seguintes como pendentes.';

/**
 * Mês atual no formato do `<input type="month">`.
 *
 * @returns `AAAA-MM`
 */
function currentMonthInput(): string {
  return todayIso().slice(0, 7);
}

/**
 * Converte o mês do formulário para o da API.
 *
 * @param month - `AAAA-MM`
 * @returns `AAAA-MM-01`
 */
function toApiMonth(month: string): string {
  return `${month}-01`;
}

/**
 * Troca o tipo do recorrente. A categoria é de um tipo só, então sai — senão a categoria some do select mas segue no envio e a API recusa.
 *
 * @param values - Valores atuais
 * @param kind - Tipo escolhido
 * @returns Valores com o tipo novo
 *
 * @example
 * withKind(values, 'EXPENSE'); // categoryId: ''
 */
export function withKind(values: RecurrenceFormValues, kind: Recurrence['kind']): RecurrenceFormValues {
  if (values.kind === kind) return values;
  return { ...values, kind, categoryId: '' };
}

/**
 * Diz se faz sentido oferecer "Encerrar neste mês": contrato sem fim que já começou.
 *
 * @param recurrence - Início e fim do recorrente
 * @param month - Mês atual, `AAAA-MM`
 * @returns `true` quando dá para encerrar
 *
 * @example
 * canEndThisMonth({ startMonth: '2026-10-01', endMonth: null }, '2026-11'); // true
 */
export function canEndThisMonth(recurrence: Pick<Recurrence, 'startMonth' | 'endMonth'>, month: string): boolean {
  return !recurrence.endMonth && recurrence.startMonth.slice(0, 7) <= month;
}

/** Propriedades da folha. */
export interface RecurrenceSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recurrence?: Recurrence;
  kind?: Recurrence['kind'];
  ledgerId?: string;
}

/**
 * Folha do recorrente: o que entra ou sai todo mês, em qual conta, em que
 * dias e desde quando. Reajustar vale para os pendentes deste mês em diante.
 *
 * @example
 * <RecurrenceSheet open={open} onOpenChange={setOpen} kind='INCOME' ledgerId={companyId} />
 */
export function RecurrenceSheet({ open, onOpenChange, recurrence, kind, ledgerId }: RecurrenceSheetProps) {
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={recurrence ? 'Editar recorrente' : 'Novo recorrente'}
      description={recurrence ? 'Mudanças valem para os pendentes deste mês em diante; pagos não mudam.' : 'Contrato ou conta fixa que se repete todo mês.'}
    >
      <RecurrenceForm key={recurrence?.recurrenceId ?? 'new'} recurrence={recurrence} kind={kind} ledgerId={ledgerId} onDone={() => onOpenChange(false)} />
    </Sheet>
  );
}

/**
 * Formulário do recorrente.
 *
 * @param props - Recorrente em edição, tipo/livro sugeridos e callback
 * @returns Formulário
 */
function RecurrenceForm({ recurrence, kind, ledgerId, onDone }: { recurrence?: Recurrence; kind?: Recurrence['kind']; ledgerId?: string; onDone: () => void }) {
  const ledgers = useLedgers();
  const accounts = useAccounts(ledgerId);
  const categories = useCategories();
  const [confirming, setConfirming] = useState(false);
  const [creating, setCreating] = useState<'account' | 'category' | null>(null);
  const save = useFinanceMutation(
    (input: RecurrenceInput) => {
      if (!recurrence) return recurrencesService.create(input);
      const { kind: _kind, ...changes } = input;
      return recurrencesService.update(recurrence.recurrenceId, changes);
    },
    recurrence ? 'Recorrente atualizado.' : 'Recorrente criado.'
  );
  const end = useFinanceMutation(() => recurrencesService.update(recurrence!.recurrenceId, { endMonth: toApiMonth(currentMonthInput()) }), 'Recorrente encerrado.');
  const remove = useFinanceMutation(() => recurrencesService.remove(recurrence!.recurrenceId), 'Recorrente apagado.');

  const form = useAppForm<RecurrenceFormValues>({
    initialValues: {
      kind: recurrence?.kind ?? kind ?? 'INCOME',
      description: recurrence?.description ?? '',
      amountCents: recurrence?.amountCents ?? null,
      dayOfMonth: recurrence ? String(recurrence.dayOfMonth) : '',
      dayOfMonthStart: recurrence?.dayOfMonthStart ? String(recurrence.dayOfMonthStart) : '',
      accountId: recurrence?.accountId ?? '',
      categoryId: recurrence?.categoryId ?? '',
      startMonth: recurrence ? recurrence.startMonth.slice(0, 7) : currentMonthInput(),
      endMonth: recurrence?.endMonth ? recurrence.endMonth.slice(0, 7) : '',
      notes: recurrence?.notes ?? '',
    },
    schema: recurrenceSchema,
    onSubmit: async values => {
      await save.mutateAsync({
        kind: values.kind,
        description: values.description,
        amountCents: values.amountCents ?? 0,
        dayOfMonth: Number(values.dayOfMonth),
        dayOfMonthStart: values.dayOfMonthStart ? Number(values.dayOfMonthStart) : null,
        accountId: values.accountId,
        categoryId: values.categoryId || null,
        startMonth: toApiMonth(values.startMonth),
        endMonth: values.endMonth ? toApiMonth(values.endMonth) : null,
        notes: values.notes || null,
      });
      onDone();
    },
  });

  const selectedAccount = accounts.data?.find(item => item.accountId === form.values.accountId);
  const selectedLedger = ledgers.data?.find(item => item.ledgerId === selectedAccount?.ledgerId);
  const isIncome = form.values.kind === 'INCOME';
  const pastStart = Boolean(form.values.startMonth) && form.values.startMonth < currentMonthInput();

  return (
    <>
      <form onSubmit={form.submit} noValidate className='flex flex-col gap-4'>
        <Select
          label='Tipo'
          options={KIND_OPTIONS}
          {...textField(form, 'kind')}
          onChange={event => void form.setValues(withKind(form.values, event.target.value as Recurrence['kind']))}
          disabled={Boolean(recurrence)}
          hint={recurrence ? 'O tipo não muda depois de criado.' : undefined}
        />
        <TextInput label='Nome' placeholder={isIncome ? 'Ex.: Contrato Acme' : 'Ex.: Aluguel'} {...textField(form, 'description')} maxLength={200} autoFocus={!recurrence} />
        <MoneyInput label='Valor por mês' {...moneyField(form, 'amountCents')} />
        <div className='grid grid-cols-2 gap-4'>
          <TextInput label='Do dia' inputMode='numeric' placeholder='Ex.: 1' {...textField(form, 'dayOfMonthStart')} maxLength={2} hint={DAY_START_HINT} />
          <TextInput label='Até o dia' inputMode='numeric' placeholder='Ex.: 5' {...textField(form, 'dayOfMonth')} maxLength={2} hint={DAY_END_HINT} />
        </div>
        <Select
          label='Conta'
          placeholder={accounts.isPending ? 'Carregando…' : 'Escolha'}
          options={accountOptions(accounts.data ?? [], ledgers.data ?? [])}
          {...textField(form, 'accountId')}
          empty={accounts.isPending ? undefined : { ...EMPTY_ACCOUNTS, onCreate: () => setCreating('account') }}
          hint={selectedLedger ? `Entra no livro ${selectedLedger.name}.` : undefined}
        />
        <Select
          label='Categoria'
          placeholder='Sem categoria'
          options={categoryOptions(categories.data ?? [], form.values.kind, selectedLedger?.type)}
          {...textField(form, 'categoryId')}
          empty={categories.isPending ? undefined : { ...EMPTY_CATEGORIES, onCreate: () => setCreating('category') }}
        />
        <div className='grid grid-cols-2 gap-4'>
          <TextInput label='Início' type='month' {...textField(form, 'startMonth')} hint={pastStart ? PAST_START_HINT : START_HINT} />
          <TextInput label='Fim' type='month' {...textField(form, 'endMonth')} hint='Vazio = sem data para acabar.' />
        </div>
        <TextArea label='Observações' {...textField(form, 'notes')} maxLength={2000} />
        <Button type='submit' size='lg' className='mt-2 w-full' loading={save.isPending || form.isSubmitting}>
          {recurrence ? 'Salvar' : 'Criar recorrente'}
        </Button>
        {recurrence && canEndThisMonth(recurrence, currentMonthInput()) && (
          <Button
            variant='secondary'
            icon={<CalendarX2 className='size-4' />}
            loading={end.isPending}
            onClick={async () => {
              await end.mutateAsync(undefined);
              onDone();
            }}
          >
            Encerrar neste mês
          </Button>
        )}
        {recurrence && (
          <Button variant='destructive' icon={<Trash2 className='size-4' />} onClick={() => setConfirming(true)}>
            Apagar recorrente
          </Button>
        )}
        <ConfirmDialog
          open={confirming}
          onOpenChange={setConfirming}
          title='Apagar recorrente?'
          message='Os pendentes deste mês em diante serão apagados. Lançamentos já pagos continuam.'
          confirmLabel='Apagar'
          destructive
          loading={remove.isPending}
          onConfirm={async () => {
            await remove.mutateAsync(undefined).finally(() => setConfirming(false));
            onDone();
          }}
        />
      </form>
      <AccountSheet
        open={creating === 'account'}
        onOpenChange={open => !open && setCreating(null)}
        ledgerId={ledgerId}
        onCreated={account => void form.setFieldValue('accountId', account.accountId)}
      />
      <CategorySheet
        open={creating === 'category'}
        onOpenChange={open => !open && setCreating(null)}
        kind={form.values.kind}
        onCreated={category => void form.setFieldValue('categoryId', category.categoryId)}
      />
    </>
  );
}
