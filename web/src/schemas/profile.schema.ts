/**
 * Validação das configurações da conta — espelha o `UpdateProfileDto` e o
 * `ChangePasswordDto` da API, mais a confirmação da nova senha.
 *
 * @module schemas/profile.schema
 */
import './locale';
import { type InferType, object, ref, string } from 'yup';

/** Schema do perfil. */
export const profileSchema = object({
  name: string().trim().required('Informe o seu nome.').min(2, 'O nome precisa ter pelo menos 2 caracteres.').max(120, 'O nome pode ter no máximo 120 caracteres.'),
});

/** Valores do perfil. */
export type ProfileFormValues = InferType<typeof profileSchema>;

/** Schema da troca de senha. Senhas não são aparadas: espaço também é caractere. */
export const changePasswordSchema = object({
  currentPassword: string().required('Informe a senha atual.'),
  newPassword: string()
    .required('Informe a nova senha.')
    .min(8, 'A nova senha precisa ter pelo menos 8 caracteres.')
    .max(128, 'A nova senha pode ter no máximo 128 caracteres.')
    .notOneOf([ref('currentPassword')], 'A nova senha precisa ser diferente da atual.'),
  confirmPassword: string()
    .required('Repita a nova senha.')
    .oneOf([ref('newPassword')], 'As senhas não conferem.'),
});

/** Valores da troca de senha. */
export type ChangePasswordFormValues = InferType<typeof changePasswordSchema>;
