/**
 * Validação da tela de entrada — espelha o `LoginDto` e o `RegisterDto` da API.
 *
 * @module schemas/auth.schema
 */
import './locale';
import { type InferType, object, string } from 'yup';

/** Campos comuns: e-mail. */
const email = string().trim().required('Informe o seu e-mail.').email('Informe um e-mail válido.').max(254, 'Use um e-mail mais curto.');

/** Schema do login. O campo `name` fica de fora: só o cadastro usa. */
export const signInSchema = object({
  name: string().default(''),
  email,
  password: string().required('Informe a senha.').max(128, 'A senha pode ter no máximo 128 caracteres.'),
});

/** Valores do login. */
export type SignInFormValues = InferType<typeof signInSchema>;

/** Schema do primeiro cadastro. */
export const signUpSchema = object({
  name: string().trim().default('').required('Informe o seu nome.').min(2, 'O nome precisa ter pelo menos 2 caracteres.').max(120, 'O nome pode ter no máximo 120 caracteres.'),
  email,
  password: string().required('Crie uma senha.').min(8, 'A senha precisa ter pelo menos 8 caracteres.').max(128, 'A senha pode ter no máximo 128 caracteres.'),
});

/** Valores do cadastro (o formulário usa este formato nos dois modos). */
export type SignUpFormValues = InferType<typeof signUpSchema>;
