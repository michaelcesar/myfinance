/**
 * Guarda do padrão de esqueletos de carregamento — o mesmo do toca aê.
 *
 * Esqueleto desenhado à mão, longe do componente que imita, fica para trás
 * quando o componente muda, e a tela pula ao carregar. As regras:
 *
 * 1. **Toda página tem `loading.tsx`**, e ele **só compõe**: renderiza o
 *    `*PageSkeleton` da tela, sem `<Skeleton>` cru nem peças do kit.
 * 2. **`loading.tsx` não cobre página filha.** O App Router faz dele o
 *    fallback de toda rota aninhada; abrir a filha piscaria o esqueleto do
 *    pai. A página da pasta mora num grupo de rotas (`(lista)`), irmão das filhas.
 * 3. **O átomo `Skeleton` só aparece dentro de funções `*Skeleton`** (e no
 *    kit). Cada componente de dados exporta o próprio esqueleto, no mesmo
 *    arquivo; a tela usa esse esqueleto enquanto a consulta carrega.
 * 4. **A moldura do cartão vem do `<Card>`.** Dentro de um `*Skeleton`, um
 *    literal com `rounded-card` + `bg-surface` + `shadow-card` é a moldura
 *    copiada à mão.
 *
 * @module test/guards/skeletonStandard.test
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

interface SourceFile {
  rel: string;
  text: string;
}

const ROOT = 'src';
const KIT_FILES = new Set(['components/ui/Skeleton.tsx', 'components/ui/SkeletonKit.tsx']);

function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return listFiles(path);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

const FILES: SourceFile[] = listFiles(ROOT).map(path => ({ rel: relative(ROOT, path).split(sep).join('/'), text: readFileSync(path, 'utf-8') }));
const PAGES = FILES.filter(({ rel }) => rel.startsWith('app/') && rel.endsWith('/page.tsx') && rel !== 'app/page.tsx');
const LOADINGS = FILES.filter(({ rel }) => rel.startsWith('app/') && rel.endsWith('/loading.tsx'));

/** Trechos de cada função de topo do arquivo, com o nome. */
function topLevelFunctions(text: string): { name: string; body: string }[] {
  const matches = [...text.matchAll(/^(?:export )?(?:default )?(?:async )?function (\w+)/gm)];
  return matches.map((match, index) => ({
    name: match[1],
    body: text.slice(match.index ?? 0, matches[index + 1]?.index ?? text.length),
  }));
}

describe('padrão de esqueletos', () => {
  it('varreu um conjunto plausível', () => {
    expect(PAGES.length).toBeGreaterThan(8);
  });

  it('toda página tem o seu loading.tsx', () => {
    const missing = PAGES.filter(({ rel }) => !LOADINGS.some(loading => dirname(loading.rel) === dirname(rel))).map(({ rel }) => rel);
    expect(missing).toEqual([]);
  });

  it('loading.tsx só compõe o *PageSkeleton da tela', () => {
    const offenders = LOADINGS.filter(({ text }) => /<Skeleton\b/.test(text) || /components\/ui\/(Skeleton|SkeletonKit)['"]/.test(text) || !/<\w+PageSkeleton\b/.test(text)).map(({ rel }) => rel);
    expect(offenders).toEqual([]);
  });

  it('loading.tsx não cobre página filha', () => {
    const offenders = LOADINGS.filter(loading => {
      const folder = dirname(loading.rel);
      return PAGES.some(page => page.rel.startsWith(`${folder}/`) && dirname(page.rel) !== folder);
    }).map(({ rel }) => rel);
    expect(offenders).toEqual([]);
  });

  it('o átomo Skeleton só aparece dentro de funções *Skeleton', () => {
    const offenders = FILES.filter(({ rel }) => !KIT_FILES.has(rel)).flatMap(({ rel, text }) =>
      topLevelFunctions(text)
        .filter(({ name, body }) => !name.endsWith('Skeleton') && /<Skeleton\b/.test(body))
        .map(({ name }) => `${rel}: ${name}`)
    );
    expect(offenders).toEqual([]);
  });

  it('esqueleto não monta a moldura do cartão à mão', () => {
    const offenders = FILES.flatMap(({ rel, text }) =>
      topLevelFunctions(text)
        .filter(({ name }) => name.endsWith('Skeleton'))
        .filter(({ body }) => [...body.matchAll(/'([^'\n]*)'/g)].some(([, literal]) => ['rounded-card', 'bg-surface', 'shadow-card'].every(token => literal.split(/\s+/).includes(token))))
        .map(({ name }) => `${rel}: ${name}`)
    );
    expect(offenders).toEqual([]);
  });
});
