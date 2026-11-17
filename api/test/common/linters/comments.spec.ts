/**
 * Guardas executáveis do padrão de comentários em `src/` e `database/`.
 *
 * 1. Nenhum comentário `//` solto: todo comentário é JSDoc. Linhas dentro de
 *    um bloco de docstring não contam (é onde um `@example` mostra `//`), e
 *    URLs são cortadas antes da checagem. Escapes: `TODO: type this` e
 *    diretivas de ferramenta (`eslint-disable`, `@ts-expect-error`).
 * 2. Todo arquivo `.ts` começa com um bloco JSDoc de módulo que termina em
 *    `@module <caminho>`.
 *
 * Escopo: `src/` e `database/`. O `test/` aceita banners `//` de seção.
 *
 * @module test/common/linters/comments.spec
 */
import { execFileSync } from 'child_process';
import { readFileSync } from 'fs';

/** Comentários `//` que precisam continuar `//`: são lidos por ferramentas. */
const ALLOWED = [/TODO: type this/, /eslint-disable/, /@ts-expect-error/, /prettier-ignore/];

function findLooseComments(path: string): string[] {
  const hits: string[] = [];
  let inBlockComment = false;
  readFileSync(path, 'utf-8')
    .split('\n')
    .forEach((line, index) => {
      if (line.includes('/**')) inBlockComment = true;
      const withoutUrls = line.replace(/https?:\/\/\S*/g, '');
      const hasSlashSlash = /^\s*\/\//.test(withoutUrls) || /\s\/\/\s/.test(withoutUrls);
      if (hasSlashSlash && !inBlockComment && !ALLOWED.some(re => re.test(line))) hits.push(`${path}:${index + 1}: ${line.trim()}`);
      if (line.includes('*/')) inBlockComment = false;
    });
  return hits;
}

function lacksModuleBlock(path: string): boolean {
  const content = readFileSync(path, 'utf-8');
  const firstBlock = content.match(/^\/\*\*[\s\S]*?\*\//);
  return !firstBlock || !/@module\s+\S+/.test(firstBlock[0]);
}

describe('guarda de comentários — src/ e database/', () => {
  const files = execFileSync('find', ['src', 'database', '-name', '*.ts'], { cwd: process.cwd(), encoding: 'utf-8' }).trim().split('\n').filter(Boolean);

  it('encontrou arquivos .ts para checar', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it('nenhum arquivo tem comentário `//` solto fora de um bloco JSDoc', () => {
    expect(files.flatMap(findLooseComments)).toEqual([]);
  });

  it('todo arquivo começa com um bloco JSDoc de módulo com `@module`', () => {
    expect(files.filter(lacksModuleBlock)).toEqual([]);
  });
});
