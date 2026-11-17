/**
 * Guarda do texto da interface em `src/`.
 *
 * O dono não quer travessão (—) nem meia-risca (–) em nada que aparece na
 * tela: soa artificial. Use ponto, vírgula ou dois-pontos. Comentários e
 * JSDoc ficam de fora, porque não aparecem para o usuário; hífen dentro de
 * palavra ("pró-labore", "e-mail") é ortografia e continua valendo.
 *
 * @module test/guards/copy.test
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/** Travessão ou meia-risca. */
const DASH = /[–—]/;

/** Linha de comentário (JSDoc, bloco ou linha). */
const COMMENT_LINE = /^\s*(\*|\/\*|\/\/)/;

/**
 * Arquivos de código da interface, sem os testes.
 *
 * @param dir - Pasta inicial
 * @returns Caminhos dos `.ts`/`.tsx`
 */
function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return listFiles(path);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

describe('guarda do texto da interface em src/', () => {
  it('nenhum texto de tela usa travessão ou meia-risca', () => {
    const offenders = listFiles('src').flatMap(path =>
      readFileSync(path, 'utf-8')
        .split('\n')
        .flatMap((line, index) => (DASH.test(line) && !COMMENT_LINE.test(line) ? [`${path}:${index + 1}: ${line.trim()}`] : []))
    );
    expect(offenders).toEqual([]);
  });
});
