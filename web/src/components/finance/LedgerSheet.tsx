/**
 * Folha de criação e edição de empresa (ou do livro pessoal).
 *
 * @module components/finance/LedgerSheet
 */
'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { ColorPicker } from '@/components/ui/ColorPicker';
import { TextInput } from '@/components/ui/Field';
import { Sheet } from '@/components/ui/Sheet';
import { useAppForm } from '@/hooks/useAppForm';
import { useFinanceMutation } from '@/hooks/useFinance';
import { textField } from '@/lib/form';
import { formatDocument } from '@/lib/format';
import { type LedgerInput, ledgersService } from '@/services/finance.service';
import { documentDigits } from '@/schemas/document';
import { type LedgerFormValues, ledgerSchema } from '@/schemas/ledger.schema';
import type { Ledger } from '@/types/entities';

/** Propriedades da folha. */
export interface LedgerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ledger?: Ledger;
}

/**
 * Cria uma empresa e abre a página dela, ou edita uma existente.
 *
 * @example
 * <LedgerSheet open={open} onOpenChange={setOpen} />
 */
export function LedgerSheet({ open, onOpenChange, ledger }: LedgerSheetProps) {
  const isPersonal = ledger?.type === 'PERSONAL';
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={ledger ? (isPersonal ? 'Editar livro pessoal' : 'Editar empresa') : 'Nova empresa'}
      description={ledger ? undefined : 'Cada empresa tem contas, lançamentos e investimentos próprios.'}
    >
      <LedgerForm ledger={ledger} onDone={() => onOpenChange(false)} />
    </Sheet>
  );
}

/**
 * Formulário da empresa.
 *
 * @param props - Livro em edição e callback
 * @returns Formulário
 */
function LedgerForm({ ledger, onDone }: { ledger?: Ledger; onDone: () => void }) {
  const router = useRouter();
  const isPersonal = ledger?.type === 'PERSONAL';
  const save = useFinanceMutation((input: LedgerInput) => (ledger ? ledgersService.update(ledger.ledgerId, input) : ledgersService.create(input)), ledger ? 'Alterações salvas.' : 'Empresa criada.');

  const form = useAppForm<LedgerFormValues>({
    initialValues: {
      personal: isPersonal,
      name: ledger?.name ?? '',
      legalName: ledger?.legalName ?? '',
      document: formatDocument(ledger?.document ?? null),
      color: ledger?.color ?? 'indigo',
    },
    schema: ledgerSchema,
    onSubmit: async values => {
      const saved = await save.mutateAsync({ name: values.name, legalName: values.legalName || null, document: documentDigits(values.document) || null, color: values.color });
      onDone();
      if (!ledger) router.push(`/empresas/${saved.ledgerId}`);
    },
  });

  return (
    <form onSubmit={form.submit} noValidate className='flex flex-col gap-4'>
      <TextInput label={isPersonal ? 'Nome do livro' : 'Nome fantasia'} placeholder='Ex.: Studio Aurora' {...textField(form, 'name')} maxLength={120} autoFocus />
      {!isPersonal && <TextInput label='Razão social' placeholder='Opcional' {...textField(form, 'legalName')} maxLength={200} />}
      <TextInput label={isPersonal ? 'CPF' : 'CNPJ'} placeholder='Opcional' inputMode='numeric' {...textField(form, 'document')} maxLength={18} />
      <div className='flex flex-col gap-2'>
        <span className='px-1 text-footnote font-medium text-fg-muted'>Cor</span>
        <ColorPicker value={form.values.color} onChange={color => void form.setFieldValue('color', color)} />
      </div>
      <Button type='submit' size='lg' className='mt-2 w-full' loading={save.isPending || form.isSubmitting}>
        {ledger ? 'Salvar' : 'Criar empresa'}
      </Button>
    </form>
  );
}
