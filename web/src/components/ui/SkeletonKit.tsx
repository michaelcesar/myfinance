/**
 * Peças de esqueleto que espelham as peças reais da interface — o padrão do
 * toca aê: **mesma caixa, conteúdo trocado**.
 *
 * Cada peça repete o contêiner e as classes de texto do componente real
 * (importadas como constantes dele: `PAGE_TITLE_CLASS`, `FIELD_LABEL_CLASS`,
 * `BUTTON_SHAPES`…) e troca só o texto por uma barra. A altura de cada linha
 * vem de `1lh` — a altura de linha da própria classe de texto —, então o
 * título de `text-display leading-[1.1]` ocupa exatamente o que o título real
 * ocupa, sem número mágico, e a tela não pula quando o conteúdo chega.
 *
 * Texto fixo (título, subtítulo, rótulo de botão) vai em `text`: o esqueleto
 * desenha o texto real invisível com uma barra de `0.7em` por linha
 * (`box-decoration-break: clone`), então a largura e a quebra de linha são as
 * da tela em qualquer largura — sem estimar. Dado que ainda não chegou (nome,
 * valor) usa `width` e `lines`.
 *
 * Em volta, use sempre as peças reais de layout (`Card`, as mesmas grades e
 * `gap`s da tela, `PAGE_STACK_CLASS`). O esqueleto de um componente de dados
 * mora no mesmo arquivo dele (`AccountCardSkeleton` em `AccountsPanel.tsx`…)
 * e o `loading.tsx` da rota só compõe. Guarda: `test/guards/skeletonStandard`.
 *
 * @module components/ui/SkeletonKit
 */
import type { CSSProperties, ReactNode } from 'react';
import { PAGE_ACTIONS_CLASS, PAGE_HEADER_CLASS, PAGE_SUBTITLE_CLASS, PAGE_TITLE_CLASS } from '@/components/layout/PageHeader';
import { cn } from '@/lib/cn';
import { BUTTON_SHAPES, BUTTON_SIZES, type ButtonSize } from './Button';
import { SECTION_HEADER_CLASS, SECTION_SUBTITLE_CLASS, SECTION_TITLE_CLASS } from './Card';
import { CONTROL_SHAPE_CLASS, FIELD_CLASS, FIELD_LABEL_CLASS, FIELD_MESSAGE_CLASS } from './Field';
import { ICON_TILE_SHAPES } from './IconTile';
import { Skeleton } from './Skeleton';

/** Largura em px (número) ou CSS (texto). */
type Width = string | number;

/**
 * Converte a largura para CSS.
 *
 * @param width - Largura
 * @returns Valor CSS
 */
function toCss(width: Width): string {
  return typeof width === 'number' ? `${width}px` : width;
}

/**
 * Linhas por largura de tela: um parágrafo que quebra em 2 linhas no celular
 * e cabe em 1 no desktop é `{ base: 2, md: 1 }`. Breakpoints omitidos herdam
 * o anterior.
 */
export type SkeletonLines = number | { base: number; md?: number; lg?: number };

const SHOW = { base: 'flex', md: 'md:flex', lg: 'lg:flex' } as const;
const HIDE = { base: 'hidden', md: 'md:hidden', lg: 'lg:hidden' } as const;

/**
 * Resolve as linhas em cada breakpoint.
 *
 * @param lines - Linhas pedidas
 * @returns Linhas no `base`, `md` e `lg`
 */
function resolveLines(lines: SkeletonLines): { base: number; md: number; lg: number } {
  if (typeof lines === 'number') return { base: lines, md: lines, lg: lines };
  const md = lines.md ?? lines.base;
  return { base: lines.base, md, lg: lines.lg ?? md };
}

/**
 * Diz se as classes já definem largura. O `cn` do projeto só junta classes
 * (não resolve conflito), então o `w-full` padrão sai quando quem chama pede
 * outra largura (`w-auto` numa fileira de itens, por exemplo).
 *
 * @param className - Classes recebidas
 * @returns `true` quando há `w-*`, `basis-*` ou `flex-1`
 */
function setsWidth(className?: string): boolean {
  return /(^|\s)(w-|basis-|flex-1)/.test(className ?? '');
}

/** Propriedades do `SkeletonText`. */
export interface SkeletonTextProps {
  /** As MESMAS classes de texto do elemento real (tamanho, `leading-*`, margens). */
  className?: string;
  /** Largura da barra de uma linha só. */
  width?: Width;
  /** Quantas linhas o texto real ocupa (número ou por breakpoint). */
  lines?: SkeletonLines;
  /** `center` quando o texto real é centralizado; `end` quando alinhado à direita. */
  align?: 'start' | 'center' | 'end';
  /** Texto fixo da tela: desenha a barra sobre o texto real invisível (largura e quebra exatas). */
  text?: string;
}

/** Barra de `0.7em` por linha do texto invisível, com cantos em cada linha. */
const TEXT_BAR_CLASS =
  'animate-pulse rounded-xs bg-[linear-gradient(var(--color-fill),var(--color-fill))] bg-[length:100%_0.7em] bg-center bg-no-repeat text-transparent select-none [box-decoration-break:clone] [-webkit-box-decoration-break:clone]';

/**
 * Linha(s) de texto em esqueleto, com a altura de linha da classe recebida.
 * Cada linha é uma caixa de `1lh` com a barra de `0.7em` centrada; num
 * parágrafo de várias linhas a última é mais curta, como texto de verdade.
 *
 * @example
 * <SkeletonText className={PAGE_TITLE_CLASS} width={220} />
 * <SkeletonText className='text-footnote' lines={{ base: 2, md: 1 }} />
 */
export function SkeletonText({ className, width = '60%', lines = 1, align = 'start', text }: SkeletonTextProps) {
  if (text !== undefined) {
    return (
      <div className={cn(align === 'center' && 'text-center', align === 'end' && 'text-right', className)} aria-hidden>
        <span className={TEXT_BAR_CLASS}>{text}</span>
      </div>
    );
  }
  const counts = resolveLines(lines);
  const total = Math.max(counts.base, counts.md, counts.lg);
  const widthAt = (index: number, count: number): string => (count === 1 ? toCss(width) : index === count - 1 ? '55%' : '100%');
  return (
    <div className={cn('flex flex-col', !setsWidth(className) && 'w-full', className)} aria-hidden>
      {Array.from({ length: total }).map((_, index) => {
        const visibility = (['base', 'md', 'lg'] as const).map(breakpoint => (index < counts[breakpoint] ? SHOW[breakpoint] : HIDE[breakpoint]));
        const widths = { '--sk-w': widthAt(index, counts.base), '--sk-w-md': widthAt(index, counts.md), '--sk-w-lg': widthAt(index, counts.lg) } as CSSProperties;
        return (
          <div key={index} className={cn('h-[1lh] items-center', align === 'center' && 'justify-center', align === 'end' && 'justify-end', visibility)}>
            <Skeleton className='h-[0.7em] w-(--sk-w) rounded-xs md:w-(--sk-w-md) lg:w-(--sk-w-lg)' style={widths} />
          </div>
        );
      })}
    </div>
  );
}

/** Propriedades do `PageHeaderSkeleton`. */
export interface PageHeaderSkeletonProps {
  /** Título da tela (o mesmo texto do `PageHeader`, compartilhado por constante). */
  title?: string;
  /** Subtítulo da tela, quando é texto fixo. */
  subtitle?: string;
  titleWidth?: Width;
  /** Linhas do subtítulo na tela real (0 = sem subtítulo). */
  subtitleLines?: SkeletonLines;
  /** Sobretítulo pequeno acima do título (a saudação da visão geral, o rótulo do livro). */
  eyebrow?: boolean;
  /** Esqueletos das ações à direita (`PeriodPickerSkeleton`, `ButtonSkeleton`…). */
  actions?: ReactNode;
}

/**
 * Esqueleto do `PageHeader`: mesmo contêiner, título grande e subtítulo.
 *
 * @example
 * <PageHeaderSkeleton title={PAGE_TITLE} subtitle={PAGE_SUBTITLE} actions={<ButtonSkeleton label='Nova empresa' icon />} />
 */
export function PageHeaderSkeleton({ title, subtitle, titleWidth = 220, subtitleLines = 1, eyebrow = false, actions }: PageHeaderSkeletonProps) {
  return (
    <div className={PAGE_HEADER_CLASS} aria-hidden>
      <div className={cn('min-w-0', title === undefined && 'flex-1')}>
        {eyebrow && <SkeletonText className='mb-2 text-footnote' width={120} />}
        <SkeletonText className={PAGE_TITLE_CLASS} text={title} width={titleWidth} />
        {subtitle !== undefined ? (
          <SkeletonText className={PAGE_SUBTITLE_CLASS} text={subtitle} />
        ) : (
          subtitleLines !== 0 && <SkeletonText className={PAGE_SUBTITLE_CLASS} lines={subtitleLines} width='min(100%, 420px)' />
        )}
      </div>
      {actions && <div className={PAGE_ACTIONS_CLASS}>{actions}</div>}
    </div>
  );
}

/** Propriedades do `SectionHeaderSkeleton`. */
export interface SectionHeaderSkeletonProps {
  /** Título fixo da seção (mesmo texto do `SectionHeader`). */
  title?: string;
  titleWidth?: Width;
  /** Subtítulo fixo da seção; `true` quando existe mas não é fixo. */
  subtitle?: string | boolean;
  /** Texto da ação à direita (link "Empresas"); `true` quando existe mas não é fixo. */
  action?: string | boolean;
  className?: string;
}

/**
 * Esqueleto do `SectionHeader`.
 *
 * @example
 * <SectionHeaderSkeleton title='Seus livros' subtitle='Patrimônio e resultado do período' action='Empresas' />
 */
export function SectionHeaderSkeleton({ title, titleWidth = 140, subtitle = false, action = false, className }: SectionHeaderSkeletonProps) {
  return (
    <div className={cn(SECTION_HEADER_CLASS, className)} aria-hidden>
      <div className='min-w-0 flex-1'>
        <SkeletonText className={SECTION_TITLE_CLASS} text={title} width={titleWidth} />
        {subtitle !== false && <SkeletonText className={SECTION_SUBTITLE_CLASS} text={typeof subtitle === 'string' ? subtitle : undefined} width='min(100%, 260px)' />}
      </div>
      {action !== false && <SkeletonText className='w-auto shrink-0 text-body font-medium' text={typeof action === 'string' ? action : undefined} width={64} />}
    </div>
  );
}

/** Propriedades do `FieldSkeleton`. */
export interface FieldSkeletonProps {
  /** Rótulo fixo do campo real (barra com a largura exata); `true` para um rótulo de largura `labelWidth`. */
  label?: string | boolean;
  labelWidth?: Width;
  /** Dica fixa do campo real; `true` para uma dica de largura estimada. */
  hint?: string | boolean;
  /** Classes da caixa quando não é um controle de uma linha (ex.: `h-[88px]` num `TextArea`). */
  controlClassName?: string;
  className?: string;
}

/**
 * Esqueleto de campo: rótulo, caixa do controle e dica — o `Field` real.
 *
 * @example
 * <FieldSkeleton label='Descrição' hint='Opcional.' />
 */
export function FieldSkeleton({ label = true, labelWidth = 96, hint = false, controlClassName, className }: FieldSkeletonProps) {
  return (
    <div className={cn(FIELD_CLASS, className)} aria-hidden>
      {label !== false && <SkeletonText className={FIELD_LABEL_CLASS} text={typeof label === 'string' ? label : undefined} width={labelWidth} />}
      <Skeleton className={cn('w-full', CONTROL_SHAPE_CLASS, controlClassName)} />
      {hint !== false && <SkeletonText className={FIELD_MESSAGE_CLASS} text={typeof hint === 'string' ? hint : undefined} width='50%' />}
    </div>
  );
}

/** Propriedades do `ButtonSkeleton`. */
export interface ButtonSkeletonProps {
  size?: ButtonSize;
  /** Rótulo do botão real: o esqueleto fica com a largura exata dele. */
  label?: string;
  /** O botão real tem ícone antes do rótulo. */
  icon?: boolean;
  width?: Width;
  fullWidth?: boolean;
  className?: string;
}

/**
 * Esqueleto de botão, com a altura e o raio do tamanho real.
 *
 * @example
 * <ButtonSkeleton label='Nova empresa' icon />
 */
export function ButtonSkeleton({ size = 'md', label, icon = false, width = 140, fullWidth = false, className }: ButtonSkeletonProps) {
  if (label !== undefined) {
    return (
      <div
        className={cn(
          'inline-flex shrink-0 animate-pulse items-center justify-center bg-fill font-semibold tracking-[-0.01em] whitespace-nowrap text-transparent select-none',
          BUTTON_SIZES[size],
          fullWidth && 'w-full',
          className
        )}
        aria-hidden
      >
        {icon && <span className='size-4 shrink-0' />}
        {label}
      </div>
    );
  }
  return <Skeleton className={cn(BUTTON_SHAPES[size], fullWidth ? 'w-full' : 'w-(--sk-btn-w)', className)} style={fullWidth ? undefined : ({ '--sk-btn-w': toCss(width) } as CSSProperties)} />;
}

/**
 * Esqueleto do `IconTile`, no mesmo tamanho e raio.
 *
 * @example
 * <IconTileSkeleton size='lg' />
 */
export function IconTileSkeleton({ size = 'md', className }: { size?: keyof typeof ICON_TILE_SHAPES; className?: string }) {
  return <Skeleton className={cn('shrink-0', ICON_TILE_SHAPES[size], className)} />;
}
