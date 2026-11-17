/**
 * Testes do cliente HTTP: query string, envelope e renovação em 401.
 *
 * @module lib/api-client.test
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, buildQuery, request } from './api-client';
import { getAccessToken, setAccessToken } from './session';

/**
 * Monta uma resposta JSON falsa.
 *
 * @param status - Status HTTP
 * @param body - Corpo
 * @returns Resposta
 */
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('api-client', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    setAccessToken(null);
  });

  it('monta a query descartando vazios', () => {
    expect(buildQuery({ a: 1, b: '', c: undefined, d: null, e: false })).toBe('?a=1&e=false');
    expect(buildQuery({})).toBe('');
  });

  it('desembrulha o envelope de sucesso', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(200, { success: true, data: { ok: 1 } })));
    await expect(request('/health')).resolves.toEqual({ ok: 1 });
  });

  it('lança ApiError com a mensagem da API', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(400, { success: false, statusCode: 400, error: 'Conta não encontrada.' })));
    await expect(request('/accounts/x')).rejects.toMatchObject({ status: 400, message: 'Conta não encontrada.' });
  });

  it('renova a sessão uma vez em 401 e refaz a chamada', async () => {
    setAccessToken('velho');
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json(401, { success: false, statusCode: 401, error: 'Sessão expirada.' }))
      .mockResolvedValueOnce(json(200, { success: true, data: { accessToken: 'novo', user: {} } }))
      .mockResolvedValueOnce(json(200, { success: true, data: ['ok'] }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(request('/ledgers')).resolves.toEqual(['ok']);
    expect(getAccessToken()).toBe('novo');
    expect(fetchMock.mock.calls[1][0]).toBe('/api/auth/refresh');
    expect((fetchMock.mock.calls[2][1] as RequestInit).headers).toMatchObject({ Authorization: 'Bearer novo' });
  });

  it('traduz falha de rede em ApiError com status 0', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const error = await request('/health').catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(0);
  });
});
