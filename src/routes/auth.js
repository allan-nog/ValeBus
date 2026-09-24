import { Router } from 'express';
import { exigirAutenticacao, obterUsuarioAutenticado, obterTokenDaRequisicao } from '../middlewares/autenticacao.js';
import { criarClienteSupabase, obterSupabase } from '../lib/supabase.js';
import { cookiesDaRequisicao, renovarSessao, falhaTemporariaAuth, indisponivel, salvarCookiesSessao, removerCookiesSessao } from '../lib/sessao.js';

export const authRouter = Router();
authRouter.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });

authRouter.post('/login', async (req, res, next) => {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const senha = typeof req.body?.senha === 'string' ? req.body.senha : '';
    if (!email || !senha) return res.status(400).json({ error: 'Informe e-mail e senha.' });
    const { data, error } = await criarClienteSupabase().auth.signInWithPassword({ email, password: senha });
    if (error?.status === 429) return res.status(429).json({ error: 'Muitas tentativas. Aguarde antes de tentar novamente.' });
    if (falhaTemporariaAuth(error)) throw indisponivel();
    if (error?.code === 'email_not_confirmed') return res.status(403).json({ error: 'Confirme o e-mail da conta antes de entrar.' });
    if (error?.code === 'user_banned') return res.status(403).json({ error: 'Conta suspensa. Entre em contato com o gestor.' });
    if (error && error.code !== 'invalid_credentials') throw indisponivel();
    if (error || !data.session) return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
    const usuario = await obterUsuarioAutenticado({ get: () => 'Bearer ' + data.session.access_token, headers: {} });
    if (!usuario || !['gestor', 'motorista'].includes(usuario.papel)) {
      removerCookiesSessao(res);
      return res.status(403).json({ error: 'Conta sem perfil operacional ativo. Entre em contato com o gestor.' });
    }
    salvarCookiesSessao(res, data.session);
    return res.json({ data: { usuario } });
  } catch (error) { next(error); }
});
authRouter.get('/me', exigirAutenticacao, (req, res) => res.json({ data: { usuario: req.usuario } }));
authRouter.post('/logout', async (req, res, next) => {
  try {
    const refresh = cookiesDaRequisicao(req).valebus_refresh_token;
    const session = refresh ? await renovarSessao(refresh) : null;
    const token = session?.access_token || obterTokenDaRequisicao(req);
    if (token) {
      const { error } = await obterSupabase().auth.admin.signOut(token, 'local');
      if (falhaTemporariaAuth(error)) throw indisponivel();
    }
    removerCookiesSessao(res);
    return res.status(204).end();
  } catch (error) { next(error); }
});
