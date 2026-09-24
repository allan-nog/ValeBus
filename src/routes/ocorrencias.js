import { Router } from 'express';
import { exigirAutenticacao, exigirPapel } from '../middlewares/autenticacao.js';
import { obterSupabase } from '../lib/supabase.js';

export const ocorrenciasRouter = Router();
const CATEGORIAS = new Set(['transito', 'garagem', 'operacional']);
const GRAVIDADES = new Set(['baixa', 'moderada', 'alta']);
const STATUS = new Set(['aberta', 'em_atendimento', 'resolvida']);

function texto(valor, limite = 2000) {
  return typeof valor === 'string' ? valor.trim().slice(0, limite) : '';
}

async function obterMotoristaDoUsuario(supabase, usuarioId) {
  const { data, error } = await supabase
    .from('motoristas')
    .select('id, nome, matricula, linha_habitual, veiculo_habitual, ativo')
    .eq('usuario_id', usuarioId)
    .maybeSingle();
  if (error) throw error;
  return data?.ativo ? data : null;
}

function apresentar(ocorrencia) {
  const motorista = ocorrencia.motorista || {};
  const socorro = Array.isArray(ocorrencia.socorro) ? ocorrencia.socorro[0] : ocorrencia.socorro;
  const resolvida = ocorrencia.status === 'resolvida';
  const gravidade = ocorrencia.gravidade || 'baixa';
  return {
    id: ocorrencia.id,
    categoria: ocorrencia.categoria,
    titulo: ocorrencia.titulo,
    tipoTexto: ocorrencia.titulo,
    problemaTexto: ocorrencia.titulo,
    detalhes: ocorrencia.descricao || '',
    observacao: ocorrencia.descricao || '',
    gravidade,
    condicao: gravidade,
    local: ocorrencia.localizacao_texto || 'Local não informado',
    motorista: motorista.nome || 'Motorista ValeBus',
    matricula: motorista.matricula || 'Não informada',
    linha: motorista.linha_habitual || 'Linha não definida',
    veiculo: motorista.veiculo_habitual || 'Veículo não definido',
    precisaSocorro: Boolean(ocorrencia.precisa_socorro),
    emAndamento: !resolvida,
    status: resolvida ? 'Concluído' : (ocorrencia.status === 'em_atendimento' ? 'Em atendimento' : 'Alerta ativo'),
    statusBadge: resolvida ? 'Atendido / Concluído' : (ocorrencia.precisa_socorro ? 'Socorro solicitado' : 'Alerta registrado'),
    criadoEm: ocorrencia.criada_em,
    hora: new Date(ocorrencia.criada_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    horaChamado: new Date(ocorrencia.criada_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    socorroStatus: socorro?.status || null
  };
}

async function buscarOcorrencia(supabase, id) {
  const { data, error } = await supabase
    .from('ocorrencias')
    .select('id, categoria, titulo, descricao, gravidade, status, localizacao_texto, precisa_socorro, criada_em, motorista:motoristas(nome, matricula, linha_habitual, veiculo_habitual), socorro:solicitacoes_socorro(status, observacao)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

ocorrenciasRouter.use(exigirAutenticacao);

ocorrenciasRouter.get('/', async (req, res, next) => {
  try {
    const supabase = obterSupabase();
    let consulta = supabase
      .from('ocorrencias')
      .select('id, categoria, titulo, descricao, gravidade, status, localizacao_texto, precisa_socorro, criada_em, motorista:motoristas(nome, matricula, linha_habitual, veiculo_habitual), socorro:solicitacoes_socorro(status, observacao)')
      .order('criada_em', { ascending: false });
    if (req.usuario.papel === 'motorista') {
      const motorista = await obterMotoristaDoUsuario(supabase, req.usuario.id);
      if (!motorista) return res.status(403).json({ error: 'Motorista operacional não encontrado.' });
      consulta = consulta.eq('motorista_id', motorista.id);
    }
    const { data, error } = await consulta;
    if (error) throw error;
    return res.json({ data: data.map(apresentar) });
  } catch (error) { next(error); }
});

ocorrenciasRouter.post('/', exigirPapel('motorista'), async (req, res, next) => {
  try {
    const categoria = texto(req.body?.categoria, 30);
    const titulo = texto(req.body?.titulo, 180);
    const descricao = texto(req.body?.descricao, 2000) || null;
    const gravidade = texto(req.body?.gravidade, 20) || 'baixa';
    const localizacaoTexto = texto(req.body?.localizacaoTexto, 500) || null;
    const precisaSocorro = req.body?.precisaSocorro === true;
    if (!CATEGORIAS.has(categoria)) return res.status(400).json({ error: 'Categoria de ocorrência inválida.' });
    if (titulo.length < 3) return res.status(400).json({ error: 'Informe o título da ocorrência.' });
    if (!GRAVIDADES.has(gravidade)) return res.status(400).json({ error: 'Gravidade da ocorrência inválida.' });

    const supabase = obterSupabase();
    const motorista = await obterMotoristaDoUsuario(supabase, req.usuario.id);
    if (!motorista) return res.status(403).json({ error: 'Motorista operacional não encontrado.' });
    const { data: ocorrencia, error } = await supabase
      .from('ocorrencias')
      .insert({ categoria, titulo, descricao, gravidade, localizacao_texto: localizacaoTexto, precisa_socorro: precisaSocorro, motorista_id: motorista.id })
      .select('id')
      .single();
    if (error) throw error;
    if (precisaSocorro) {
      const { error: socorroError } = await supabase
        .from('solicitacoes_socorro')
        .insert({ ocorrencia_id: ocorrencia.id, motorista_id: motorista.id, observacao: descricao });
      if (socorroError) {
        await supabase.from('ocorrencias').delete().eq('id', ocorrencia.id);
        throw socorroError;
      }
    }
    const completo = await buscarOcorrencia(supabase, ocorrencia.id);
    return res.status(201).json({ data: apresentar(completo) });
  } catch (error) { next(error); }
});

ocorrenciasRouter.patch('/:ocorrenciaId/status', exigirPapel('gestor'), async (req, res, next) => {
  try {
    const status = texto(req.body?.status, 30);
    if (!STATUS.has(status)) return res.status(400).json({ error: 'Status de ocorrência inválido.' });
    const supabase = obterSupabase();
    const { data, error } = await supabase
      .from('ocorrencias')
      .update({ status, atendida_por: req.usuario.id, atendida_em: status === 'resolvida' ? new Date().toISOString() : null, resolvida_em: status === 'resolvida' ? new Date().toISOString() : null })
      .eq('id', req.params.ocorrenciaId)
      .select('id')
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Ocorrência não encontrada.' });
    const statusSocorro = status === 'resolvida' ? 'concluido' : (status === 'em_atendimento' ? 'despachado' : 'solicitado');
    const { error: socorroError } = await supabase
      .from('solicitacoes_socorro')
      .update({ status: statusSocorro, atendido_por: req.usuario.id, atendido_em: status === 'aberta' ? null : new Date().toISOString() })
      .eq('ocorrencia_id', data.id);
    if (socorroError) throw socorroError;
    const completo = await buscarOcorrencia(supabase, data.id);
    return res.json({ data: apresentar(completo) });
  } catch (error) { next(error); }
});
