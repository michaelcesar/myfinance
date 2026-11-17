/**
 * Folha de criação e edição de categoria.
 *
 * @module components/finance/CategorySheet
 */
'use client';

import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ColorPicker } from '@/components/ui/ColorPicker';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Select, TextInput } from '@/components/ui/Field';
import { IconTile } from '@/components/ui/IconTile';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Sheet } from '@/components/ui/Sheet';
import { useAppForm } from '@/hooks/useAppForm';
import { useFinanceMutation } from '@/hooks/useFinance';
import { cn } from '@/lib/cn';
import { fieldError, textField } from '@/lib/form';
import { ICON_NAMES, iconFor } from '@/lib/icons';
import { type CategoryInput, categoriesService } from '@/services/finance.service';
import { type CategoryFormValues, categorySchema } from '@/schemas/category.schema';
import type { Category, CategoryKind } from '@/types/entities';

/** Propriedades da folha. */
export interface CategorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Category;
  kind?: CategoryKind;
  /** Recebe a categoria recém-criada (para já selecioná-la em outro formulário). */
  onCreated?: (category: Category) => void;
}

/**
 * Folha da categoria, com seletor de ícone e cor.
 *
 * @example
 * <CategorySheet open={open} onOpenChange={setOpen} kind='EXPENSE' />
 */
export function CategorySheet({ open, onOpenChange, category, kind, onCreated }: CategorySheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={category ? 'Editar categoria' : 'Nova categoria'}>
      <CategoryForm category={category} kind={kind} onCreated={onCreated} onDone={() => onOpenChange(false)} />
    </Sheet>
  );
}

/**
 * Formulário da categoria.
 *
 * @param props - Categoria em edição, tipo sugerido e callback
 * @returns Formulário
 */
function CategoryForm({ category, kind: initialKind, onCreated, onDone }: { category?: Category; kind?: CategoryKind; onCreated?: (category: Category) => void; onDone: () => void }) {
  const [confirming, setConfirming] = useState(false);

  const save = useFinanceMutation(
    (input: CategoryInput) =>
      category ? categoriesService.update(category.categoryId, { name: input.name, icon: input.icon, color: input.color, ledgerType: input.ledgerType }) : categoriesService.create(input),
    category ? 'Categoria atualizada.' : 'Categoria criada.'
  );
  const remove = useFinanceMutation(() => categoriesService.remove(category!.categoryId), 'Categoria apagada.');

  const form = useAppForm<CategoryFormValues>({
    initialValues: {
      kind: category?.kind ?? initialKind ?? 'EXPENSE',
      name: category?.name ?? '',
      icon: category?.icon ?? 'tag',
      color: category?.color ?? 'blue',
      ledgerType: category?.ledgerType ?? '',
    },
    schema: categorySchema,
    onSubmit: async values => {
      const saved = await save.mutateAsync({ kind: values.kind, name: values.name, icon: values.icon, color: values.color, ledgerType: values.ledgerType || null });
      if (!category) onCreated?.(saved);
      onDone();
    },
  });
  const iconError = fieldError(form, 'icon');

  return (
    <form onSubmit={form.submit} noValidate className='flex flex-col gap-4'>
      <div className='flex flex-col items-center gap-3 py-2'>
        <IconTile icon={iconFor(form.values.icon)} size='lg' />
      </div>
      {!category && (
        <SegmentedControl
          label='Tipo'
          className='w-full'
          segments={[
            { value: 'EXPENSE', label: 'Despesa' },
            { value: 'INCOME', label: 'Receita' },
          ]}
          value={form.values.kind}
          onChange={kind => void form.setFieldValue('kind', kind)}
        />
      )}
      <TextInput label='Nome' placeholder='Ex.: Pets' {...textField(form, 'name')} maxLength={80} />
      <Select
        label='Onde aparece'
        options={[
          { value: '', label: 'Pessoal e empresas' },
          { value: 'PERSONAL', label: 'Só pessoal' },
          { value: 'COMPANY', label: 'Só empresas' },
        ]}
        {...textField(form, 'ledgerType')}
      />
      <div className='flex flex-col gap-2'>
        <span className='px-1 text-footnote font-medium text-fg-muted'>Cor</span>
        <ColorPicker value={form.values.color} onChange={color => void form.setFieldValue('color', color)} />
      </div>
      <div className='flex flex-col gap-2'>
        <span className='px-1 text-footnote font-medium text-fg-muted'>Ícone</span>
        <div role='radiogroup' aria-label='Ícone' className='grid grid-cols-8 gap-1.5 rounded-control bg-fill-2 p-2'>
          {ICON_NAMES.map(name => {
            const Icon = iconFor(name);
            const active = name === form.values.icon;
            return (
              <button
                key={name}
                type='button'
                role='radio'
                name={active ? 'icon' : undefined}
                aria-checked={active}
                aria-label={name}
                onClick={() => void form.setFieldValue('icon', name, true)}
                className={cn('flex aspect-square items-center justify-center rounded-md transition-colors', active ? 'bg-primary text-primary-fg' : 'text-fg-muted hover:bg-fill')}
              >
                <Icon className='size-[18px]' />
              </button>
            );
          })}
        </div>
        {iconError && (
          <p role='alert' className='px-1 text-caption text-error'>
            {iconError}
          </p>
        )}
      </div>
      <Button type='submit' size='lg' className='mt-2 w-full' loading={save.isPending || form.isSubmitting}>
        {category ? 'Salvar' : 'Criar categoria'}
      </Button>
      {category && (
        <Button variant='destructive' icon={<Trash2 className='size-4' />} onClick={() => setConfirming(true)}>
          Apagar categoria
        </Button>
      )}
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title='Apagar categoria?'
        message='Os lançamentos dela ficam sem categoria.'
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
