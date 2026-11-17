/**
 * Guardas executáveis do padrão de comentários em `src/`.
 *
 * 1. Nenhum comentário `//` solto: todo comentário é JSDoc. Linhas dentro de
 *    um bloco de docstring não contam, URLs são cortadas antes da checagem, e
 *    diretivas de ferramenta (`eslint-disable`, `@ts-expect-error`) ficam `//`.
 * 2. Todo `.ts`/`.tsx` tem um bloco JSDoc de módulo com `@module`, logo no
 *    início (depois de `'use client'`, quando houver).
 *
 * O CSS tem convenção própria (`/* *\/`) e fica fora.
 *
 * @module test/guards/comments.test
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ALLOWED = [/eslint-disable/, /@ts-expect-error/, /prettier-ignore/];

function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return listFiles(path);
    return /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

function findLooseComments(path: string): string[] {
  const hits: string[] = [];
  let inBlock = false;
  readFileSync(path, 'utf-8')
    .split('\n')
    .forEach((line, index) => {
      if (line.includes('/**')) inBlock = true;
      const withoutUrls = line.replace(/https?:\/\/\S*/g, '');
      const loose = /^\s*\/\//.test(withoutUrls) || /\s\/\/\s/.test(withoutUrls);
      if (loose && !inBlock && !ALLOWED.some(re => re.test(line))) hits.push(`${path}:${index + 1}: ${line.trim()}`);
      if (line.includes('*/')) inBlock = false;
    });
  return hits;
}

function lacksModuleBlock(path: string): boolean {
  const content = readFileSync(path, 'utf-8').replace(/^'use client';\s*/, '');
  const block = content.match(/^\/\*\*[\s\S]*?\*\//);
  return !block || !/@module\s+\S+/.test(block[0]);
}

describe('guarda de comentários — src/', () => {
  const files = listFiles('src');

  it('encontrou arquivos para checar', () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it('nenhum comentário `//` solto fora de um bloco JSDoc', () => {
    expect(files.flatMap(findLooseComments)).toEqual([]);
  });

  it('todo arquivo começa com um bloco JSDoc de módulo com `@module`', () => {
    expect(files.filter(lacksModuleBlock)).toEqual([]);
  });
});
