/**
 * Validação das variáveis de ambiente na subida da aplicação.
 *
 * Uma variável obrigatória ausente ou malformada impede o boot — falhar cedo
 * é preferível a descobrir o erro na primeira requisição que precisar dela.
 *
 * @module config/env.validation
 */
import { z } from 'zod';

/**
 * Esquema das variáveis aceitas. Valores numéricos e booleanos chegam como
 * string do processo e são convertidos aqui.
 */
export const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3001),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_NAME: z.string().min(1).default('Finance Manager API'),
  APP_SECRET: z.string().min(32, 'APP_SECRET precisa de pelo menos 32 caracteres.'),
  FRONTEND_DOMAIN: z.url(),
  POSTGRES_URI: z.string().startsWith('postgres'),
  TYPEORM_LOG: z.stringbool().default(false),
  TYPEORM_SYNC: z.stringbool().default(false),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),
  ALLOW_SIGNUP: z.stringbool().default(false),
});

/** Variáveis de ambiente já validadas e convertidas. */
export type Env = z.infer<typeof envSchema>;

/**
 * Valida o objeto de ambiente para o `ConfigModule`.
 *
 * @param config - Variáveis cruas do processo
 * @returns Variáveis convertidas para os tipos do esquema
 * @throws `Error` com a lista de campos inválidos
 *
 * @example
 * ConfigModule.forRoot({ validate: validateEnv });
 */
export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const issues = parsed.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; ');
    throw new Error(`Variáveis de ambiente inválidas: ${issues}`);
  }
  return parsed.data;
}
