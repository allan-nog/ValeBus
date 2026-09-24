import { createHash } from 'node:crypto';
import { config } from '../config/env.js';
import { criarClienteSupabase } from './supabase.js';

export function cookiesDaRequisicao(req) {
  const cookies = Object.create(null);
  for (const item of (req.headers.cookie || '').split(';')) {
    const i = item.indexOf('=');
    if (i < 0) continue;
    try { cookies[item.slice(0, i).trim()] = decodeURIComponent(item.slice(i + 1).trim()); } catch {}
  }
  return cookies;
}
function opcoes() {
  const frontendSeparado = config.nodeEnv === 'production' && config.frontendOrigins.length > 0;
  return {
    httpOnly: true,
    // GitHub Pages e Render usam domínios distintos; a sessão precisa ser enviada à API.
    sameSite: frontendSeparado ? 'none' : 'lax',
    secure: config.nodeEnv === 'production',
    path: '/api'
  };
}
export function removerCookiesSessao(res) {
  for (const nome of ['valebus_access_token', 'valebus_refresh_token']) res.clearCookie(nome, opcoes());
}
export function salvarCookiesSessao(res, session) {
  res.cookie('valebus_access_token', session.access_token, { ...opcoes(), maxAge: session.expires_in * 1000 });
  res.cookie('valebus_refresh_token', session.refresh_token, { ...opcoes(), maxAge: 30 * 86400000 });
}
export function falhaTemporariaAuth(error) {
  return Boolean(error && (!error.status || error.status >= 500 || error.status === 429));
}
export function indisponivel() {
  return Object.assign(new Error('Não foi possível consultar a autenticação. Tente novamente em instantes.'), { status: 503 });
}
// Compartilha a renovação entre requisições concorrentes neste servidor.
// O cache curto atende requisições que ainda chegam com o cookie anterior.
const renovacoes = new Map();
export async function renovarSessao(refreshToken) {
  if (!refreshToken) return null;
  const chave = createHash('sha256').update(refreshToken).digest('hex');
  if (!renovacoes.has(chave)) {
    const promise = (async () => {
      const { data, error } = await criarClienteSupabase().auth.refreshSession({ refresh_token: refreshToken });
      if (falhaTemporariaAuth(error)) throw indisponivel();
      return error ? null : data.session;
    })();
    renovacoes.set(chave, promise);
    promise.then(() => { setTimeout(() => renovacoes.delete(chave), 5000).unref(); }, () => renovacoes.delete(chave));
  }
  return renovacoes.get(chave);
}
