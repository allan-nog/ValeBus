import { Router } from 'express';
import { exigirAutenticacao, exigirPapel } from '../middlewares/autenticacao.js';
import { obterSupabase } from '../lib/supabase.js';
import { chaveDaLinha } from '../lib/linhas-catalogo.js';

export const viagensRouter = Router();

async function obterMotorista(supabase, usuarioId) {
  const { data, error } = await supabase
    .from('motoristas')
    .select('id, nome, matricula, linha_habitual, veiculo_habitual, ativo')
    .eq('usuario_id', usuarioId)
    .maybeSingle();
  if (error) throw error;
  return data?.ativo ? data : null;
}

async function obterViagemAtiva(supabase, motoristaId) {
  const { data, error } = await supabase
    .from('viagens')
    .select('id, status, iniciada_em, encerrada_em, linha:linhas(id, nome, codigo), veiculo:veiculos(id, nome, prefixo)')
    .eq('motorista_id', motoristaId)
    .eq('status', 'em_andamento')
    .maybeSingle();
  if (error) throw error;
  return data;
}

function apresentar(viagem) {
  if (!viagem) return null;
  return {
    id: viagem.id,
    status: viagem.status,
    iniciadaEm: viagem.iniciada_em,
    encerradaEm: viagem.encerrada_em,
    linha: viagem.linha?.nome || null,
    linhaId: viagem.linha?.id || null,
    linhaChave: chaveDaLinha(viagem.linha),
    veiculo: viagem.veiculo?.nome || null,
    veiculoId: viagem.veiculo?.id || null,
    prefixo: viagem.veiculo?.prefixo || null
  };
}

async function obterLinhaEVeiculo(supabase, linhaChave, veiculoId) {
  // Cadastro habitual é sugestão. A operação usa a escolha explícita do motorista.
  const { data: linhas, error: linhaError } = await supabase.from('linhas')
    .select('id, nome, codigo').eq('ativo', true).eq('publica', true);
  if (linhaError) throw linhaError;
  const correspondentes = (linhas || []).filter(linha => chaveDaLinha(linha) === linhaChave);
  const linha = correspondentes.length === 1 ? correspondentes[0] : null;
  if (!linha) {
    const erro = new Error('A linha escolhida não está disponível para operação pública. Volte ao login e escolha uma linha disponível.');
    erro.status = 409;
    throw erro;
  }
  if (!chaveDaLinha(linha)) {
    const erro = new Error('A linha cadastrada ainda não corresponde a um trajeto validado do mapa. Revise seu código no catálogo.');
    erro.status = 409;
    throw erro;
  }
  const { data: veiculo, error: veiculoError } = await supabase
    .from('veiculos').select('id, nome').eq('id', veiculoId).eq('ativo', true).maybeSingle();
  if (veiculoError) throw veiculoError;
  if (!veiculo) {
    const erro = new Error('O ônibus escolhido não está disponível. Volte ao login e escolha um veículo ativo.');
    erro.status = 409;
    throw erro;
  }
  return { linha, veiculo };
}

// Consulta pública sem contas, dados de motoristas ou GPS de suporte.
viagensRouter.get('/publicas', async (_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  try {
    const { data, error } = await obterSupabase().from('viagens')
      .select('id, iniciada_em, linha:linhas!inner(codigo, nome, ativo, publica), veiculo:veiculos!inner(id, nome, prefixo, ativo)')
      .eq('status', 'em_andamento').eq('linha.ativo', true)
      .eq('linha.publica', true).eq('veiculo.ativo', true)
      .order('iniciada_em');
    if (error) throw error;
    const viagens = (data || []).flatMap(item => {
      const linhaChave = chaveDaLinha(item.linha);
      if (!linhaChave || !Number.isFinite(Date.parse(item.iniciada_em))) return [];
      return [{ id: item.id, iniciadaEm: item.iniciada_em, linhaChave,
        veiculo: item.veiculo.nome, prefixo: item.veiculo.prefixo,
        modoPosicao: 'trajeto_automatico' }];
    });
    return res.json({ data: viagens, agora: new Date().toISOString() });
  } catch (error) { next(error); }
});

viagensRouter.use(exigirAutenticacao, exigirPapel('motorista'));

viagensRouter.get('/opcoes', async (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  try {
    const supabase = obterSupabase();
    const motorista = await obterMotorista(supabase, req.usuario.id);
    if (!motorista) return res.status(403).json({ error: 'Motorista operacional não encontrado.' });
    const [linhas, veiculos, viagemAtiva] = await Promise.all([
      supabase.from('linhas').select('id, codigo, nome').eq('ativo', true).eq('publica', true).order('nome'),
      supabase.from('veiculos').select('id, nome, prefixo').eq('ativo', true).order('prefixo'),
      obterViagemAtiva(supabase, motorista.id)
    ]);
    if (linhas.error) throw linhas.error;
    if (veiculos.error) throw veiculos.error;
    const catalogo = (linhas.data || []).map(l => ({ ...l, chave: chaveDaLinha(l) })).filter(l => l.chave);
    // Chaves ambíguas não oferecem uma escolha que o início da viagem rejeitaria.
    const disponiveis = catalogo.filter(l => catalogo.filter(outro => outro.chave === l.chave).length === 1);
    return res.json({ data: { linhas: disponiveis, veiculos: veiculos.data || [],
      sugestao: { linhaChave: chaveDaLinha({ nome: motorista.linha_habitual }),
        veiculoId: (veiculos.data || []).find(v => v.nome === motorista.veiculo_habitual)?.id || null },
      viagemAtiva: apresentar(viagemAtiva) } });
  } catch (error) { next(error); }
});

viagensRouter.get('/ativa', async (req, res, next) => {
  try {
    const supabase = obterSupabase();
    const motorista = await obterMotorista(supabase, req.usuario.id);
    if (!motorista) return res.status(403).json({ error: 'Motorista operacional não encontrado.' });
    return res.json({ data: apresentar(await obterViagemAtiva(supabase, motorista.id)) });
  } catch (error) { next(error); }
});

viagensRouter.post('/iniciar', async (req, res, next) => {
  try {
    const linhaChave = req.body?.linhaChave;
    const veiculoId = req.body?.veiculoId;
    if (typeof linhaChave !== 'string' || chaveDaLinha({ codigo: linhaChave }) !== linhaChave) {
      return res.status(400).json({ error: 'Selecione uma linha válida do catálogo.' });
    }
    if (typeof veiculoId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(veiculoId)) {
      return res.status(400).json({ error: 'Escolha o ônibus da operação no login antes de iniciar a rota.' });
    }
    const supabase = obterSupabase();
    const motorista = await obterMotorista(supabase, req.usuario.id);
    if (!motorista) return res.status(403).json({ error: 'Motorista operacional não encontrado.' });
    const ativa = await obterViagemAtiva(supabase, motorista.id);
    if (ativa) return res.status(409).json({ error: 'Já existe uma viagem em andamento para este motorista.', data: apresentar(ativa) });
    const { linha, veiculo } = await obterLinhaEVeiculo(supabase, linhaChave, veiculoId);
    const { data, error } = await supabase
      .from('viagens')
      .insert({ motorista_id: motorista.id, linha_id: linha.id, veiculo_id: veiculo.id, status: 'em_andamento', iniciada_em: new Date().toISOString() })
      .select('id, status, iniciada_em, encerrada_em, linha:linhas(id, nome, codigo), veiculo:veiculos(id, nome, prefixo)')
      .single();
    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'O motorista ou veículo já possui uma viagem em andamento.' });
      throw error;
    }
    return res.status(201).json({ data: apresentar(data) });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message, data: error.data });
    next(error);
  }
});

viagensRouter.post('/posicao-garagem', async (req, res, next) => {
  try {
    const latitude = req.body?.latitude;
    const longitude = req.body?.longitude;
    const velocidade = req.body?.velocidadeKmh === undefined || req.body?.velocidadeKmh === null
      ? null : Number(req.body.velocidadeKmh);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      return res.status(400).json({ error: 'Latitude e longitude válidas são obrigatórias.' });
    }
    if (velocidade !== null && (!Number.isFinite(velocidade) || velocidade < 0 || velocidade > 200)) {
      return res.status(400).json({ error: 'Velocidade inválida.' });
    }
    const supabase = obterSupabase();
    const motorista = await obterMotorista(supabase, req.usuario.id);
    if (!motorista) return res.status(403).json({ error: 'Motorista operacional não encontrado.' });
    const viagem = await obterViagemAtiva(supabase, motorista.id);
    if (!viagem?.veiculo?.id) return res.status(409).json({ error: 'Inicie uma viagem antes de enviar a posição para a garagem.' });
    const { data, error } = await supabase
      .from('posicoes_veiculo')
      .insert({ viagem_id: viagem.id, veiculo_id: viagem.veiculo.id, latitude, longitude, velocidade_kmh: velocidade })
      .select('id, viagem_id, veiculo_id, latitude, longitude, velocidade_kmh, registrado_em')
      .single();
    if (error) throw error;
    return res.status(201).json({ data: {
      id: data.id,
      viagemId: data.viagem_id,
      veiculoId: data.veiculo_id,
      latitude: data.latitude,
      longitude: data.longitude,
      velocidadeKmh: data.velocidade_kmh,
      registradoEm: data.registrado_em
    } });
  } catch (error) { next(error); }
});

viagensRouter.post('/encerrar', async (req, res, next) => {
  try {
    const supabase = obterSupabase();
    const motorista = await obterMotorista(supabase, req.usuario.id);
    if (!motorista) return res.status(403).json({ error: 'Motorista operacional não encontrado.' });
    const ativa = await obterViagemAtiva(supabase, motorista.id);
    if (!ativa) return res.status(409).json({ error: 'Não há viagem em andamento para encerrar.' });
    const { data, error } = await supabase
      .from('viagens')
      .update({ status: 'encerrada', encerrada_em: new Date().toISOString() })
      .eq('id', ativa.id)
      .eq('motorista_id', motorista.id)
      .eq('status', 'em_andamento')
      .select('id, status, iniciada_em, encerrada_em, linha:linhas(id, nome, codigo), veiculo:veiculos(id, nome, prefixo)')
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(409).json({ error: 'A viagem já foi encerrada. Atualize a tela.' });
    return res.json({ data: apresentar(data) });
  } catch (error) { next(error); }
});
