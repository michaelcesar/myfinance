/**
 * Guardas executáveis do sistema de design em `src/`.
 *
 * Todo valor visual vem dos tokens de `app/globals.css`. Estas checagens
 * reprovam o que escapa do sistema dentro de `.ts`/`.tsx`:
 *
 * 1. Cor literal (`#0a84ff`, `rgb(...)`, `hsl(...)`) — use utilidade ou `var(--color-*)`.
 *    Exceção: o `themeColor` do `app/layout.tsx`, que vai para uma meta tag
 *    lida pelo navegador antes de qualquer CSS.
 * 2. Tamanho de texto ou raio em pixel avulso (`text-[13px]`, `rounded-[8px]`) —
 *    use a escala (`text-footnote`, `rounded-md`).
 * 3. Camada numérica (`z-50`, `z-[60]`) — use `z-(--z-sheet)`.
 *
 * Os testes ficam fora: podem descrever valores literais.
 *
 * @module test/guards/tokens.test
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const COLOR_EXCEPTIONS = [join('src', 'app', 'layout.tsx')];

function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return listFiles(path);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

function findMatches(files: string[], pattern: RegExp): string[] {
  return files.flatMap(path =>
    readFileSync(path, 'utf-8')
      .split('\n')
      .flatMap((line, index) => (pattern.test(line) ? [`${path}:${index + 1}: ${line.trim()}`] : []))
  );
}

describe('guarda de tokens — src/', () => {
  const files = listFiles('src');

  it('encontrou arquivos para checar', () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it('nenhuma cor literal fora dos tokens', () => {
    const checked = files.filter(path => !COLOR_EXCEPTIONS.includes(path));
    expect(findMatches(checked, /['"`\s(]#[0-9a-fA-F]{3,8}\b|\b(rgba?|hsla?)\(/)).toEqual([]);
  });

  it('nenhum tamanho de texto ou raio em pixel avulso', () => {
    expect(findMatches(files, /\b(text|rounded)-\[\d+(\.\d+)?px\]/)).toEqual([]);
  });

  it('nenhuma camada numérica fora das variáveis `--z-*`', () => {
    expect(findMatches(files, /\bz-(\d+|\[\d+\])(?![\w-])/)).toEqual([]);
  });
});
