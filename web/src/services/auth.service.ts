/**
 * Chamadas de autenticação e perfil.
 *
 * @module services/auth.service
 */
import { request, type SessionPayload } from '@/lib/api-client';
import type { User } from '@/types/entities';

/** Credenciais de login. */
export interface LoginInput {
  email: string;
  password: string;
}

/** Dados de cadastro. */
export interface RegisterInput extends LoginInput {
  name: string;
}

export const authService = {
  /** Informa se a tela de entrada deve oferecer "Criar conta". */
  signupStatus: () => request<{ signupOpen: boolean }>('/auth/signup-status', { skipRefresh: true }),
  /** Abre a sessão; o refresh token chega em cookie `httpOnly`. */
  login: (input: LoginInput) => request<SessionPayload>('/auth/login', { method: 'POST', body: input, skipRefresh: true }),
  /** Cria a conta e já abre a sessão. */
  register: (input: RegisterInput) => request<SessionPayload>('/auth/register', { method: 'POST', body: input, skipRefresh: true }),
  /** Revoga o refresh token e apaga o cookie. */
  logout: () => request<null>('/auth/logout', { method: 'POST', skipRefresh: true }),
  /** Atualiza o nome do usuário. */
  updateProfile: (name: string) => request<User>('/users/me', { method: 'PATCH', body: { name } }),
  /** Troca a senha; encerra as demais sessões. */
  changePassword: (currentPassword: string, newPassword: string) => request<null>('/auth/password', { method: 'PATCH', body: { currentPassword, newPassword } }),
};
