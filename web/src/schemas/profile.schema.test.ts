/**
 * Testes dos schemas de perfil, senha e entrada.
 *
 * @module schemas/profile.schema.test
 */
import { describe, expect, it } from 'vitest';
import { signInSchema, signUpSchema } from './auth.schema';
import { changePasswordSchema, profileSchema } from './profile.schema';

/**
 * Primeira mensagem de erro do schema para os valores, ou `null` se forem válidos.
 *
 * @param schema - Schema com `validate`
 * @param values - Valores
 * @returns Mensagem ou `null`
 */
async function firstError(schema: { validate: (values: unknown) => Promise<unknown> }, values: unknown): Promise<string | null> {
  try {
    await schema.validate(values);
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

describe('changePasswordSchema', () => {
  it('aceita a troca com confirmação igual', async () => {
    expect(await firstError(changePasswordSchema, { currentPassword: 'antiga123', newPassword: 'nova-senha', confirmPassword: 'nova-senha' })).toBeNull();
  });

  it('recusa confirmação diferente', async () => {
    expect(await firstError(changePasswordSchema, { currentPassword: 'antiga123', newPassword: 'nova-senha', confirmPassword: 'outra-senha' })).toBe('As senhas não conferem.');
  });

  it('recusa nova senha igual à atual', async () => {
    expect(await firstError(changePasswordSchema, { currentPassword: 'mesma-senha', newPassword: 'mesma-senha', confirmPassword: 'mesma-senha' })).toBe('A nova senha precisa ser diferente da atual.');
  });

  it('exige pelo menos 8 caracteres na nova senha', async () => {
    expect(await firstError(changePasswordSchema, { currentPassword: 'antiga123', newPassword: 'curta', confirmPassword: 'curta' })).toBe('A nova senha precisa ter pelo menos 8 caracteres.');
  });
});

describe('profileSchema', () => {
  it('recusa nome com menos de 2 caracteres depois de aparar', async () => {
    expect(await firstError(profileSchema, { name: '  a ' })).toBe('O nome precisa ter pelo menos 2 caracteres.');
  });
});

describe('signInSchema e signUpSchema', () => {
  it('o login aceita qualquer senha não vazia', async () => {
    expect(await firstError(signInSchema, { name: '', email: 'ana@exemplo.com', password: 'x' })).toBeNull();
  });

  it('o login recusa e-mail inválido', async () => {
    expect(await firstError(signInSchema, { name: '', email: 'ana', password: 'x' })).toBe('Informe um e-mail válido.');
  });

  it('o cadastro exige senha de 8 caracteres', async () => {
    expect(await firstError(signUpSchema, { name: 'Ana', email: 'ana@exemplo.com', password: 'curta' })).toBe('A senha precisa ter pelo menos 8 caracteres.');
  });
});
