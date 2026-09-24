import { obterSupabase } from '../lib/supabase.js';

function lerCookies(cabecalho = '') {
  return cabecalho.split(';').reduce((cookies, item) => {
    const separador = item.indexOf('=');
    if (separador < 0) return cookies;

    const nome = item.slice(0, separador).trim();
    const valor = item.slice(separador + 1).trim();
    if (nome) cookies[nome] = decodeURIComponent(valor);
    return cookies;
  }, {});
}

export function obterTokenDaRequisicao(req) {
  const autorizacao = req.get('authorization') || '';
  if (autorizacao.startsWith('Bearer ')) return autorizacao.slice(7).trim();

  return lerCookies(req.headers.cookie).valebus_access_token || null;
}

export async function obterUsuarioAutenticado(req) {
  const token = obterTokenDaRequisicao(req);
  if (!token) return null;

  const supabase = obterSupabase();
  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData.user) return null;

  const { data: perfil, error: perfilError } = await supabase
    .from('perfis')
    .select('id, nome, papel, ativo')
    .eq('id', authData.user.id)
    .maybeSingle();

  if (perfilError) throw perfilError;
  if (!perfil?.ativo) return null;

  return {
    id: perfil.id,
    nome: perfil.nome,
    papel: perfil.papel,
    email: authData.user.email || null
  };
}

export async function exigirAutenticacao(req, res, next) {
  try {
    const usuario = await obterUsuarioAutenticado(req);
    if (!usuario) {
      return res.status(401).json({ error: 'Sessão inválida, expirada ou sem permissão.' });
    }

    req.usuario = usuario;
    return next();
  } catch (error) {
    return next(error);
  }
}
