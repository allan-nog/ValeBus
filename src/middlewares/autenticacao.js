import { obterSupabase } from '../lib/supabase.js';
import { cookiesDaRequisicao, renovarSessao, salvarCookiesSessao, removerCookiesSessao, falhaTemporariaAuth, indisponivel } from '../lib/sessao.js';

export function obterTokenDaRequisicao(req) {
  const autorizacao = req.get('authorization') || '';
  if (autorizacao.startsWith('Bearer ')) return autorizacao.slice(7).trim();

  return cookiesDaRequisicao(req).valebus_access_token || null;
}

export async function obterUsuarioAutenticado(req) {
  const token = obterTokenDaRequisicao(req);
  if (!token) return null;

  const supabase = obterSupabase();
  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (falhaTemporariaAuth(authError)) throw indisponivel();
  if (authError || !authData.user) return null;

  const { data: perfil, error: perfilError } = await supabase
    .from('perfis')
    .select('id, nome, papel, ativo')
    .eq('id', authData.user.id)
    .maybeSingle();

  if (perfilError) throw perfilError;
  if (!perfil?.ativo) return null;

  let dadosMotorista = null;
  if (perfil.papel === 'motorista') {
    const { data, error } = await supabase
      .from('motoristas')
      .select('matricula, linha_habitual, veiculo_habitual, ativo')
      .eq('usuario_id', perfil.id)
      .maybeSingle();
    if (error) throw error;
    if (!data?.ativo) return null;
    dadosMotorista = data;
  }

  return {
    id: perfil.id,
    nome: perfil.nome,
    papel: perfil.papel,
    email: authData.user.email || null,
    matricula: dadosMotorista?.matricula || null,
    linha: dadosMotorista?.linha_habitual || null,
    veiculo: dadosMotorista?.veiculo_habitual || null
  };
}

export async function exigirAutenticacao(req, res, next) {
  try {
    let usuario = await obterUsuarioAutenticado(req);
    if (!usuario && !req.get('authorization')) {
      const session = await renovarSessao(cookiesDaRequisicao(req).valebus_refresh_token);
      if (session) {
        usuario = await obterUsuarioAutenticado({ get: () => 'Bearer ' + session.access_token, headers: {} });
        if (usuario) salvarCookiesSessao(res, session);
      }
    }
    if (!usuario) {
      removerCookiesSessao(res);
      return res.status(401).json({ error: 'Sessão inválida, expirada ou sem permissão.' });
    }

    req.usuario = usuario;
    return next();
  } catch (error) {
    return next(error);
  }
}


export function exigirPapel(...papeisPermitidos) {
  return (req, res, next) => {
    if (!req.usuario || !papeisPermitidos.includes(req.usuario.papel)) {
      return res.status(403).json({ error: 'Você não possui permissão para esta operação.' });
    }
    return next();
  };
}
