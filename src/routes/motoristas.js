import { Router } from 'express';
import { exigirAutenticacao, exigirPapel } from '../middlewares/autenticacao.js';
import { obterSupabase } from '../lib/supabase.js';

export const motoristasRouter = Router();

const STATUS_VALIDOS = new Set(['ativo', 'viagem', 'folga', 'inativo']);

function texto(valor) {
  return typeof valor === 'string' ? valor.trim() : '';
}

function cpfNormalizado(valor) {
  const cpf = texto(valor).replace(/\D/g, '');
  return cpf || null;
}

function erroDeCadastro(mensagem, campo) {
  const erro = new Error(mensagem);
  erro.status = 400;
  erro.campo = campo;
  return erro;
}

function validarDados(body, { senhaObrigatoria = true } = {}) {
  const nome = texto(body.nome);
  const matricula = texto(body.matricula).toUpperCase();
  const email = texto(body.email).toLowerCase();
  const senha = typeof body.senha === 'string' ? body.senha : '';
  const cnhValidade = texto(body.cnhValidade);
  const status = texto(body.status) || 'ativo';

  if (nome.length < 3) throw erroDeCadastro('Informe o nome completo do motorista.', 'nome');
  if (!/^[A-Z0-9-]{3,12}$/.test(matricula)) throw erroDeCadastro('Matrícula operacional inválida.', 'matricula');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw erroDeCadastro('Informe um e-mail válido.', 'email');
  if (senhaObrigatoria && senha.length < 8) throw erroDeCadastro('A senha inicial deve ter pelo menos 8 caracteres.', 'senha');
  if (!senhaObrigatoria && senha && senha.length < 8) throw erroDeCadastro('A nova senha deve ter pelo menos 8 caracteres.', 'senha');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(cnhValidade)) throw erroDeCadastro('Informe a validade da CNH.', 'cnhValidade');
  if (!STATUS_VALIDOS.has(status)) throw erroDeCadastro('Status operacional inválido.', 'status');

  const cpf = cpfNormalizado(body.cpf);
  if (cpf && cpf.length !== 11) throw erroDeCadastro('CPF inválido.', 'cpf');

  return {
    nome,
    matricula,
    email,
    senha,
    cpf,
    telefone: texto(body.telefone) || null,
    cnh: texto(body.cnh).replace(/\D/g, '') || null,
    categoria_cnh: texto(body.cnhCat) || 'D',
    cnh_validade: cnhValidade,
    linha_habitual: texto(body.linha) || null,
    veiculo_habitual: texto(body.veiculo) || null,
    turno: texto(body.turno) || null,
    status_operacional: status,
    ativo: status !== 'inativo'
  };
}

function apresentarMotorista(motorista) {
  return {
    id: motorista.id,
    nome: motorista.nome,
    matricula: motorista.matricula,
    email: motorista.email,
    cpf: motorista.cpf,
    telefone: motorista.telefone,
    cnh: motorista.cnh,
    cnhCat: motorista.categoria_cnh,
    cnhValidade: motorista.cnh_validade,
    linha: motorista.linha_habitual || 'Não definida',
    veiculo: motorista.veiculo_habitual || 'Não definido',
    turno: motorista.turno || 'Não definido',
    status: motorista.status_operacional || (motorista.ativo ? 'ativo' : 'inativo'),
    ativo: motorista.ativo
  };
}

motoristasRouter.use(exigirAutenticacao, exigirPapel('gestor'));

motoristasRouter.get('/', async (_req, res, next) => {
  try {
    const { data, error } = await obterSupabase()
      .from('motoristas')
      .select('id, nome, matricula, email, cpf, telefone, cnh, categoria_cnh, cnh_validade, linha_habitual, veiculo_habitual, turno, status_operacional, ativo')
      .order('nome');
    if (error) throw error;
    return res.json({ data: data.map(apresentarMotorista) });
  } catch (error) {
    return next(error);
  }
});

motoristasRouter.post('/', async (req, res, next) => {
  let usuarioCriadoId = null;
  try {
    const dados = validarDados(req.body || {});
    const supabase = obterSupabase();

    for (const [coluna, valor] of [['matricula', dados.matricula], ['email', dados.email], ['cpf', dados.cpf]]) {
      if (!valor) continue;
      const { data, error } = await supabase.from('motoristas').select('id').eq(coluna, valor).maybeSingle();
      if (error) throw error;
      if (data) return res.status(409).json({ error: 'Já existe motorista com este ' + coluna + '.', campo: coluna });
    }

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: dados.email,
      password: dados.senha,
      email_confirm: true,
      user_metadata: { nome: dados.nome }
    });
    if (authError || !authData.user) {
      return res.status(409).json({ error: 'Não foi possível criar a conta. Verifique se o e-mail já está em uso.', campo: 'email' });
    }
    usuarioCriadoId = authData.user.id;

    const { error: perfilError } = await supabase.from('perfis').insert({
      id: usuarioCriadoId,
      nome: dados.nome,
      papel: 'motorista',
      ativo: dados.ativo
    });
    if (perfilError) throw perfilError;

    const dadosMotorista = { ...dados, usuario_id: usuarioCriadoId };
    delete dadosMotorista.senha;
    const { data: motorista, error: motoristaError } = await supabase
      .from('motoristas')
      .insert(dadosMotorista)
      .select('id, nome, matricula, email, cpf, telefone, cnh, categoria_cnh, cnh_validade, linha_habitual, veiculo_habitual, turno, status_operacional, ativo')
      .single();
    if (motoristaError) throw motoristaError;

    return res.status(201).json({ data: apresentarMotorista(motorista) });
  } catch (error) {
    if (usuarioCriadoId) {
      const supabase = obterSupabase();
      await supabase.from('perfis').delete().eq('id', usuarioCriadoId);
      await supabase.auth.admin.deleteUser(usuarioCriadoId);
    }
    if (error.status) return res.status(error.status).json({ error: error.message, campo: error.campo });
    return next(error);
  }
});


async function obterMotoristaPorId(supabase, id) {
  const { data, error } = await supabase
    .from('motoristas')
    .select('id, usuario_id, email')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function verificarDuplicidades(supabase, dados, idAtual = null) {
  for (const [coluna, valor] of [['matricula', dados.matricula], ['cpf', dados.cpf]]) {
    if (!valor) continue;
    const { data, error } = await supabase.from('motoristas').select('id').eq(coluna, valor).maybeSingle();
    if (error) throw error;
    if (data && data.id !== idAtual) {
      const erro = new Error('Já existe motorista com este ' + coluna + '.');
      erro.status = 409;
      erro.campo = coluna;
      throw erro;
    }
  }
}

motoristasRouter.patch('/:motoristaId', async (req, res, next) => {
  try {
    const supabase = obterSupabase();
    const existente = await obterMotoristaPorId(supabase, req.params.motoristaId);
    if (!existente) return res.status(404).json({ error: 'Motorista não encontrado.' });

    const dados = validarDados(req.body || {}, { senhaObrigatoria: false });
    if (dados.email !== existente.email) {
      return res.status(400).json({ error: 'A alteração de e-mail será disponibilizada em uma etapa posterior.', campo: 'email' });
    }
    await verificarDuplicidades(supabase, dados, existente.id);

    const dadosMotorista = { ...dados };
    delete dadosMotorista.senha;
    const { data: motorista, error: motoristaError } = await supabase
      .from('motoristas')
      .update(dadosMotorista)
      .eq('id', existente.id)
      .select('id, nome, matricula, email, cpf, telefone, cnh, categoria_cnh, cnh_validade, linha_habitual, veiculo_habitual, turno, status_operacional, ativo')
      .single();
    if (motoristaError) throw motoristaError;

    const { error: perfilError } = await supabase
      .from('perfis')
      .update({ nome: dados.nome, ativo: dados.ativo })
      .eq('id', existente.usuario_id);
    if (perfilError) throw perfilError;

    const atualizacaoAuth = { user_metadata: { nome: dados.nome } };
    if (dados.senha) atualizacaoAuth.password = dados.senha;
    const { error: authError } = await supabase.auth.admin.updateUserById(existente.usuario_id, atualizacaoAuth);
    if (authError) throw authError;

    return res.json({ data: apresentarMotorista(motorista) });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message, campo: error.campo });
    return next(error);
  }
});

// Exclusão permanente: não apaga viagens nem solicitações de socorro.
// O esquema atual impede remover motoristas ligados a esses históricos.
motoristasRouter.delete('/:motoristaId', async (req, res, next) => {
  try {
    const id = req.params.motoristaId;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return res.status(400).json({ error: 'Identificador de motorista inválido.' });
    }
    const supabase = obterSupabase();
    const existente = await obterMotoristaPorId(supabase, id);
    if (!existente) return res.status(404).json({ error: 'Motorista não encontrado.' });
    for (const tabela of ['viagens', 'solicitacoes_socorro']) {
      const { count, error } = await supabase.from(tabela).select('id', { count: 'exact', head: true }).eq('motorista_id', id);
      if (error) throw error;
      if (count) return res.status(409).json({ error: 'Este motorista possui viagens ou socorros vinculados. A exclusão exige migrar esses vínculos para preservar o histórico; nenhum dado foi apagado.' });
    }
    if (existente.usuario_id) {
      const { data: perfil, error } = await supabase.from('perfis').select('papel').eq('id', existente.usuario_id).maybeSingle();
      if (error) throw error;
      if (perfil?.papel !== 'motorista') return res.status(409).json({ error: 'O vínculo de perfil deste cadastro precisa ser revisado antes da exclusão.' });
      // O FK remove perfis em cascata e deixa usuario_id nulo. Se a remoção
      // seguinte falhar, repetir DELETE conclui a limpeza desse cadastro.
      const { error: authError } = await supabase.auth.admin.deleteUser(existente.usuario_id);
      if (authError) return res.status(503).json({ error: 'Não foi possível excluir a conta no Auth. Tente novamente.' });
    }
    const { error } = await supabase.from('motoristas').delete().eq('id', id);
    if (error) return res.status(409).json({ error: 'A conta foi removida, mas o cadastro não pôde ser excluído. Verifique os vínculos e tente novamente.' });
    return res.json({ data: { id } });
  } catch (error) { next(error); }
});
