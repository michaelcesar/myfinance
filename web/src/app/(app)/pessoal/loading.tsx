/**
 * Esqueleto de carregamento da rota `/pessoal`.
 *
 * Só compõe o `PersonalPageSkeleton` da tela — o mesmo que a tela mostra
 * enquanto os livros carregam.
 *
 * @module app/(app)/pessoal/loading
 */
import { PersonalPageSkeleton } from './PersonalView';

/**
 * Fallback da rota enquanto o segmento carrega.
 *
 * @returns Livro pessoal em esqueleto
 */
export default function Loading() {
  return <PersonalPageSkeleton />;
}
