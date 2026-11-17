/**
 * Mensagens padrão do Yup em português, aplicadas antes de qualquer schema.
 *
 * Todo arquivo de `schemas/` importa este primeiro. Mensagem de validação é
 * frase: termina com ponto.
 *
 * @module schemas/locale
 */
import { setLocale } from 'yup';

setLocale({
  mixed: {
    required: 'Campo obrigatório.',
    notType: 'Valor inválido.',
    oneOf: 'Escolha uma opção válida.',
  },
  string: {
    email: 'Informe um e-mail válido.',
    min: ({ min }: { min: number }) => `Use pelo menos ${min} caracteres.`,
    max: ({ max }: { max: number }) => `Use no máximo ${max} caracteres.`,
    length: ({ length }: { length: number }) => `Use exatamente ${length} caracteres.`,
  },
  number: {
    min: 'Valor abaixo do permitido.',
    max: 'Valor acima do permitido.',
    integer: 'Use um número inteiro.',
  },
});
