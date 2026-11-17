/**
 * Configurações: perfil, senha, aparência, categorias e backup.
 *
 * @module app/(app)/configuracoes/SettingsView
 */
'use client';

import { LogOut, Plus } from 'lucide-react';
import { useState } from 'react';
import { BackupCard, BackupCardSkeleton } from '@/components/finance/BackupCard';
import { CategorySheet } from '@/components/finance/CategorySheet';
import { PAGE_STACK_CLASS, PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, SECTION_HEADER_CLASS, SECTION_TITLE_CLASS, SectionHeader } from '@/components/ui/Card';
import { TextInput } from '@/components/ui/Field';
import { IconTile } from '@/components/ui/IconTile';
import { SegmentedControl, SegmentedControlSkeleton } from '@/components/ui/SegmentedControl';
import { ButtonSkeleton, IconTileSkeleton, PageHeaderSkeleton, FieldSkeleton, SectionHeaderSkeleton, SkeletonText } from '@/components/ui/SkeletonKit';
import { useAppForm } from '@/hooks/useAppForm';
import { useCategories } from '@/hooks/useFinance';
import { ApiError } from '@/lib/api-client';
import { textField } from '@/lib/form';
import { cn } from '@/lib/cn';
import { iconFor } from '@/lib/icons';
import { useAuth } from '@/providers/AuthProvider';
import { type ThemePreference, useTheme } from '@/providers/ThemeProvider';
import { useToast } from '@/providers/ToastProvider';
import { type ChangePasswordFormValues, changePasswordSchema, type ProfileFormValues, profileSchema } from '@/schemas/profile.schema';
import { authService } from '@/services/auth.service';
import type { Category, CategoryKind } from '@/types/entities';

const PAGE_TITLE = 'Configurações';

/** Rótulo do botão de sair. */
const LOGOUT_LABEL = 'Sair';

/** Respiro dos cartões de configuração. */
const CARD_PADDING_CLASS = 'p-5';

/** Pilha dos formulários de perfil e senha. */
const FORM_CLASS = 'flex flex-col gap-4';

/** Botão de enviar, alinhado à direita. */
const SUBMIT_CLASS = 'self-end';

/** Grade dos cartões de perfil e senha. */
const ACCOUNT_GRID_CLASS = 'grid grid-cols-1 gap-4 lg:grid-cols-2';

/** Textos fixos do cartão de perfil. */
const PROFILE_COPY = { title: 'Perfil', name: 'Nome', email: 'E-mail', emailHint: 'O e-mail é o seu login.', submit: 'Salvar' } as const;

/** Textos fixos do cartão de senha. */
const PASSWORD_COPY = {
  title: 'Senha',
  subtitle: 'Trocar a senha encerra todas as sessões abertas.',
  current: 'Senha atual',
  next: 'Nova senha',
  nextHint: 'Pelo menos 8 caracteres.',
  confirm: 'Confirmar nova senha',
  submit: 'Trocar senha',
} as const;

/** Cartão de aparência: texto à esquerda e o controle à direita a partir do `sm`. */
const APPEARANCE_CARD_CLASS = 'flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between';

/** Explicação abaixo do título de aparência. */
const APPEARANCE_SUBTITLE_CLASS = 'text-footnote text-fg-muted';

/** Textos fixos do cartão de aparência. */
const APPEARANCE_COPY = { title: 'Aparência', subtitle: 'Siga o sistema ou escolha um tema fixo.' } as const;

/** Opções de tema — o controle e o esqueleto usam as mesmas. */
const THEME_SEGMENTS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'Automático' },
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Escuro' },
];

/** Título do cartão de categorias. */
const CATEGORIES_TITLE = 'Categorias';

/** Rótulo do botão de nova categoria. */
const NEW_CATEGORY_LABEL = 'Nova';

/** Opções do tipo de categoria — o controle e o esqueleto usam as mesmas. */
const CATEGORY_KIND_SEGMENTS: { value: CategoryKind; label: string }[] = [
  { value: 'EXPENSE', label: 'Despesas' },
  { value: 'INCOME', label: 'Receitas' },
];

/** Espaço entre o controle de tipo e a lista. */
const CATEGORY_KIND_CLASS = 'mb-4';

/** Grade das categorias. */
const CATEGORY_GRID_CLASS = 'grid grid-cols-1 gap-1 sm:grid-cols-2';

/** Caixa de cada categoria. */
const CATEGORY_ROW_CLASS = 'flex w-full items-center gap-3 rounded-lg px-2 py-2';

/** Nome da categoria. */
const CATEGORY_NAME_CLASS = 'block truncate text-subhead font-medium';

/** Escopo da categoria (pessoal, empresas). */
const CATEGORY_SCOPE_CLASS = 'block text-caption text-fg-muted';

/** Larguras do nome e do escopo, alternadas entre as categorias do esqueleto. */
const CATEGORY_SKELETON_WIDTHS = [
  ['48%', '62%'],
  ['36%', '40%'],
  ['56%', '52%'],
  ['30%', '62%'],
] as const;

/**
 * Esqueleto do cartão de perfil.
 *
 * @returns Cartão em esqueleto
 */
function ProfileCardSkeleton() {
  return (
    <Card className={CARD_PADDING_CLASS} aria-hidden>
      <SectionHeaderSkeleton title={PROFILE_COPY.title} />
      <div className={FORM_CLASS}>
        <FieldSkeleton label={PROFILE_COPY.name} />
        <FieldSkeleton label={PROFILE_COPY.email} hint={PROFILE_COPY.emailHint} />
        <ButtonSkeleton label={PROFILE_COPY.submit} className={SUBMIT_CLASS} />
      </div>
    </Card>
  );
}

/**
 * Esqueleto do cartão de senha.
 *
 * @returns Cartão em esqueleto
 */
function PasswordCardSkeleton() {
  return (
    <Card className={CARD_PADDING_CLASS} aria-hidden>
      <SectionHeaderSkeleton title={PASSWORD_COPY.title} subtitle={PASSWORD_COPY.subtitle} />
      <div className={FORM_CLASS}>
        <FieldSkeleton label={PASSWORD_COPY.current} />
        <FieldSkeleton label={PASSWORD_COPY.next} hint={PASSWORD_COPY.nextHint} />
        <FieldSkeleton label={PASSWORD_COPY.confirm} />
        <ButtonSkeleton label={PASSWORD_COPY.submit} className={SUBMIT_CLASS} />
      </div>
    </Card>
  );
}

/**
 * Esqueleto do cartão de aparência.
 *
 * @returns Cartão em esqueleto
 */
function AppearanceCardSkeleton() {
  return (
    <Card className={APPEARANCE_CARD_CLASS} aria-hidden>
      <div>
        <SkeletonText className={SECTION_TITLE_CLASS} text={APPEARANCE_COPY.title} />
        <SkeletonText className={APPEARANCE_SUBTITLE_CLASS} text={APPEARANCE_COPY.subtitle} />
      </div>
      <SegmentedControlSkeleton labels={THEME_SEGMENTS.map(segment => segment.label)} />
    </Card>
  );
}

/**
 * Esqueleto do cartão de categorias: cabeçalho com o botão, controle de tipo
 * e a grade de categorias.
 *
 * @returns Cartão em esqueleto
 */
function CategoriesCardSkeleton() {
  return (
    <Card className={CARD_PADDING_CLASS} aria-hidden>
      <div className={SECTION_HEADER_CLASS}>
        <div className='min-w-0 flex-1'>
          <SkeletonText className={SECTION_TITLE_CLASS} text={CATEGORIES_TITLE} />
        </div>
        <ButtonSkeleton size='sm' label={NEW_CATEGORY_LABEL} icon />
      </div>
      <SegmentedControlSkeleton labels={CATEGORY_KIND_SEGMENTS.map(segment => segment.label)} size='sm' className={CATEGORY_KIND_CLASS} />
      <div className={CATEGORY_GRID_CLASS}>
        {Array.from({ length: 8 }, (_, index) => {
          const [nameWidth, scopeWidth] = CATEGORY_SKELETON_WIDTHS[index % CATEGORY_SKELETON_WIDTHS.length];
          return (
            <div key={index} className={CATEGORY_ROW_CLASS}>
              <IconTileSkeleton size='sm' />
              <div className='min-w-0 flex-1'>
                <SkeletonText className={CATEGORY_NAME_CLASS} width={nameWidth} />
                <SkeletonText className={CATEGORY_SCOPE_CLASS} width={scopeWidth} />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/**
 * Esqueleto da tela de configurações — usado pelo `loading.tsx` e enquanto as
 * categorias carregam.
 *
 * @returns Página em esqueleto
 */
export function SettingsPageSkeleton() {
  return (
    <div className={PAGE_STACK_CLASS}>
      <PageHeaderSkeleton title={PAGE_TITLE} subtitleLines={0} actions={<ButtonSkeleton label={LOGOUT_LABEL} icon />} />
      <AppearanceCardSkeleton />
      <div className={ACCOUNT_GRID_CLASS}>
        <ProfileCardSkeleton />
        <PasswordCardSkeleton />
      </div>
      <CategoriesCardSkeleton />
      <BackupCardSkeleton />
    </div>
  );
}

/**
 * Cartão do perfil: nome e e-mail.
 *
 * @returns Formulário do perfil
 */
function ProfileCard() {
  const { user, setUser } = useAuth();
  const { notify } = useToast();
  const form = useAppForm<ProfileFormValues>({
    initialValues: { name: user?.name ?? '' },
    schema: profileSchema,
    onSubmit: async values => {
      try {
        const updated = await authService.updateProfile(values.name);
        setUser(updated);
        form.resetForm({ values: { name: updated.name } });
        notify('Perfil atualizado.');
      } catch (error) {
        notify(error instanceof ApiError ? error.message : 'Não foi possível salvar.', 'error');
      }
    },
  });

  return (
    <Card className={CARD_PADDING_CLASS}>
      <SectionHeader title={PROFILE_COPY.title} />
      <form onSubmit={form.submit} noValidate className={FORM_CLASS}>
        <TextInput label={PROFILE_COPY.name} autoComplete='name' {...textField(form, 'name')} maxLength={120} />
        <TextInput label={PROFILE_COPY.email} value={user?.email ?? ''} disabled hint={PROFILE_COPY.emailHint} />
        <Button type='submit' className={SUBMIT_CLASS} loading={form.isSubmitting}>
          {PROFILE_COPY.submit}
        </Button>
      </form>
    </Card>
  );
}

/**
 * Cartão de troca de senha.
 *
 * @returns Formulário de senha
 */
function PasswordCard() {
  const { logout } = useAuth();
  const { notify } = useToast();
  const form = useAppForm<ChangePasswordFormValues>({
    initialValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
    schema: changePasswordSchema,
    onSubmit: async values => {
      try {
        await authService.changePassword(values.currentPassword, values.newPassword);
      } catch (error) {
        notify(error instanceof ApiError ? error.message : 'Não foi possível trocar a senha.', 'error');
        return;
      }
      form.resetForm();
      notify('Senha alterada. Entre novamente.');
      await logout();
    },
  });

  return (
    <Card className={CARD_PADDING_CLASS}>
      <SectionHeader title={PASSWORD_COPY.title} subtitle={PASSWORD_COPY.subtitle} />
      <form onSubmit={form.submit} noValidate className={FORM_CLASS}>
        <TextInput label={PASSWORD_COPY.current} type='password' autoComplete='current-password' {...textField(form, 'currentPassword')} />
        <TextInput label={PASSWORD_COPY.next} type='password' autoComplete='new-password' {...textField(form, 'newPassword')} hint={PASSWORD_COPY.nextHint} />
        <TextInput label={PASSWORD_COPY.confirm} type='password' autoComplete='new-password' {...textField(form, 'confirmPassword')} />
        <Button type='submit' className={SUBMIT_CLASS} loading={form.isSubmitting}>
          {PASSWORD_COPY.submit}
        </Button>
      </form>
    </Card>
  );
}

/**
 * Cartão de aparência (sistema, claro, escuro).
 *
 * @returns Controle de tema
 */
function AppearanceCard() {
  const { preference, setPreference } = useTheme();
  return (
    <Card className={APPEARANCE_CARD_CLASS}>
      <div>
        <h2 className={SECTION_TITLE_CLASS}>{APPEARANCE_COPY.title}</h2>
        <p className={APPEARANCE_SUBTITLE_CLASS}>{APPEARANCE_COPY.subtitle}</p>
      </div>
      <SegmentedControl<ThemePreference> label='Tema' segments={THEME_SEGMENTS} value={preference} onChange={setPreference} />
    </Card>
  );
}

/**
 * Cartão de categorias, separado por receitas e despesas.
 *
 * @returns Lista editável de categorias
 */
function CategoriesCard() {
  const categories = useCategories();
  const [kind, setKind] = useState<CategoryKind>('EXPENSE');
  const [sheet, setSheet] = useState<{ open: boolean; category?: Category }>({ open: false });
  const list = (categories.data ?? []).filter(category => category.kind === kind);
  const scopeLabel = (category: Category) => (category.ledgerType === 'PERSONAL' ? 'Só pessoal' : category.ledgerType === 'COMPANY' ? 'Só empresas' : 'Pessoal e empresas');

  return (
    <Card className={CARD_PADDING_CLASS}>
      <SectionHeader
        title={CATEGORIES_TITLE}
        action={
          <Button size='sm' variant='tinted' icon={<Plus className='size-4' />} onClick={() => setSheet({ open: true })}>
            {NEW_CATEGORY_LABEL}
          </Button>
        }
      />
      <SegmentedControl label='Tipo de categoria' size='sm' className={CATEGORY_KIND_CLASS} segments={CATEGORY_KIND_SEGMENTS} value={kind} onChange={setKind} />
      <ul className={CATEGORY_GRID_CLASS}>
        {list.map(category => (
          <li key={category.categoryId}>
            <button type='button' onClick={() => setSheet({ open: true, category })} className={cn(CATEGORY_ROW_CLASS, 'text-left transition-colors hover:bg-fill-2')}>
              <IconTile icon={iconFor(category.icon)} size='sm' />
              <span className='min-w-0 flex-1'>
                <span className={CATEGORY_NAME_CLASS}>{category.name}</span>
                <span className={CATEGORY_SCOPE_CLASS}>{scopeLabel(category)}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <CategorySheet open={sheet.open} onOpenChange={open => setSheet(current => ({ ...current, open }))} category={sheet.category} kind={kind} />
    </Card>
  );
}

/**
 * Tela de configurações. Espera as categorias (a única consulta da tela; o
 * perfil vem da sessão já carregada).
 *
 * @returns Cartões de configuração
 */
export function SettingsView() {
  const { logout } = useAuth();
  const categories = useCategories();

  if (categories.isPending) return <SettingsPageSkeleton />;

  return (
    <div className={PAGE_STACK_CLASS}>
      <PageHeader
        title={PAGE_TITLE}
        actions={
          <Button variant='destructive' icon={<LogOut className='size-4' />} onClick={() => void logout()}>
            {LOGOUT_LABEL}
          </Button>
        }
      />
      <AppearanceCard />
      <div className={ACCOUNT_GRID_CLASS}>
        <ProfileCard />
        <PasswordCard />
      </div>
      <CategoriesCard />
      <BackupCard />
    </div>
  );
}
