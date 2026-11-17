/**
 * Checagem otimista de sessão antes de renderizar.
 *
 * Sem o cookie do refresh token, a visita a uma tela protegida vai direto
 * para `/entrar` — sem baixar a tela, piscar o esqueleto e só então
 * redirecionar. É só otimização: a autorização de verdade é da API, e um
 * cookie presente mas vencido ainda cai no fluxo normal do `AuthProvider`.
 *
 * @module proxy
 */
import { type NextRequest, NextResponse } from 'next/server';

/** Nome do cookie emitido pela API (`REFRESH_COOKIE`). */
const REFRESH_COOKIE = 'financial_rt';

/**
 * Redireciona visitante sem cookie de sessão para a tela de entrada.
 *
 * @param request - Requisição recebida
 * @returns Redirecionamento ou passagem
 */
export function proxy(request: NextRequest) {
  if (request.cookies.has(REFRESH_COOKIE)) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = '/entrar';
  url.search = '';
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!entrar|api|_next|favicon.ico|.*\\..*).*)'],
};
