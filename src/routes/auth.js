import { Router } from 'express';
import { config } from '../config/env.js';
import { exigirAutenticacao, obterUsuarioAutenticado } from '../middlewares/autenticacao.js';
import { criarClienteSupabase } from '../lib/supabase.js';

export const authRouter = Router();

const COOKIE_ACCESS_TOKEN = 'valebus_access_token';
const COOKIE_REFRESH_TOKEN = 'valebus_refresh_token';

function opcoesCookie(maxAge) {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.nodeEnv === 'production',
    path: '/api',
    maxAge
  };
}

function removerCookiesSessao(res) {
  const opcoes = opcoesCookie(0);
  res.clearCookie(COOKIE_ACCESS_TOKEN, opcoes);
  res.clearCookie(COOKIE_REFRESH_TOKEN, opcoes);
}

function salvarCookiesSessao(res, session) {
  const duracaoAccessToken = Math.max(Number(session.expires_in || 3600) * 1000, 60_000);
  res.cookie(COOKIE_ACCESS_TOKEN, session.access_token, opcoesCookie(duracaoAccessToken));
  res.cookie(COOKIE_REFRESH_TOKEN, session.refresh_token, opcoesCookie(30 * 24 * 60 * 60 * 1000));
}

authRouter.post('/login', async (req, res, next) => {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const senha = typeof req.body?.senha === 'string' ? req.body.senha : '';

    if (!email || !senha) {
      return res.status(400).json({ error: 'Informe e-mail e senha.' });
    }

    const supabase = criarClienteSupabase();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error || !data.session) {
      return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
    }

    const usuario = await obterUsuarioAutenticado({
      get: () => 'Bearer ' + data.session.access_token,
      headers: {}
    });

    if (!usuario || !['gestor', 'motorista'].includes(usuario.papel)) {
      removerCookiesSessao(res);
      return res.status(403).json({ error: 'Esta conta não possui acesso ao ValeBus operacional.' });
    }

    salvarCookiesSessao(res, data.session);
    return res.json({ data: { usuario } });
  } catch (error) {
    return next(error);
  }
});

authRouter.get('/me', exigirAutenticacao, (req, res) => {
  res.json({ data: { usuario: req.usuario } });
});

authRouter.post('/logout', (_req, res) => {
  removerCookiesSessao(res);
  return res.status(204).end();
});
