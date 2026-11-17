/**
 * Configuração do Next.js.
 *
 * O front fala com a API só por `/api/*`, reescrito aqui para `API_URL`. Do
 * ponto de vista do navegador, front e API têm a mesma origem: o cookie
 * `httpOnly` do refresh token é de primeira parte e `SameSite=Strict`
 * funciona sem CORS (`ADR-002` do web).
 *
 * `output: 'standalone'` gera em `.next/standalone` um `server.js` com só as
 * dependências que o servidor usa — é o que a imagem Docker roda, sem
 * `node_modules` completo nem pnpm no runtime.
 *
 * Os rewrites são resolvidos no BUILD: `API_URL` precisa estar definido quando
 * `next build` roda (na imagem, `--build-arg API_URL=http://api:3001`), não
 * quando o servidor sobe.
 *
 * @module next.config
 */
import type { NextConfig } from 'next';

const apiUrl = process.env.API_URL ?? 'http://localhost:3001';

const nextConfig: NextConfig = {
  output: 'standalone',
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
  /**
   * Proxy transparente para a API.
   *
   * @returns Regra `/api/:path*` → `API_URL/:path*`
   */
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${apiUrl}/:path*` }];
  },
};

export default nextConfig;
