import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import fs from 'node:fs';
import vm from 'node:vm';

// Testa as rotas reais com transporte Supabase isolado, sem acessar contas reais.
process.env.SUPABASE_URL = 'https://viagens-test.invalid';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'teste-sem-segredo';
const fetchOriginal = globalThis.fetch;
let viagens = [], indisponivel = false;
const linha = { id: 'linha', codigo: 'anchieta', nome: 'Linha Anchieta', ativo: true, publica: true };
const industrial = { ...linha, id: 'linha-industrial', codigo: 'industrial', nome: 'Linha Industrial' };
let catalogo = [linha, industrial];
const veiculo = { id: '11111111-1111-4111-8111-111111111111', nome: 'Ônibus #01', prefixo: '101', ativo: true };
const outroVeiculo = { id: '22222222-2222-4222-8222-222222222222', nome: 'Ônibus #07', prefixo: '107', ativo: true };
let semSugestao = false;
const criar = (id, extra = {}) => ({ id, iniciada_em: new Date().toISOString(), status: 'em_andamento', motorista_id: 'motorista', linha, veiculo, ...extra });
globalThis.fetch = async (input, options = {}) => {
  const url = new URL(typeof input === 'string' ? input : input.url);
  assert.equal(url.hostname, 'viagens-test.invalid');
  const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  const token = new Headers(options.headers).get('authorization');
  if (url.pathname === '/auth/v1/user') return reply({ id: token === 'Bearer gestor' ? 'gestor' : 'usuario', email: 'teste@example.com' });
  if (url.pathname === '/rest/v1/perfis') return reply({ id: url.searchParams.get('id') === 'eq.gestor' ? 'gestor' : 'usuario', nome: 'Teste', ativo: true, papel: url.searchParams.get('id') === 'eq.gestor' ? 'gestor' : 'motorista' });
  if (url.pathname === '/rest/v1/motoristas') return reply({ id: 'motorista', ativo: true, linha_habitual: semSugestao ? null : linha.nome, veiculo_habitual: semSugestao ? null : veiculo.nome });
  if (url.pathname === '/rest/v1/linhas') {
    assert.equal(url.searchParams.get('ativo'), 'eq.true');
    return reply(catalogo.filter(l => l.ativo && l.publica && (!url.searchParams.has('nome') || 'eq.' + l.nome === url.searchParams.get('nome'))));
  }
  if (url.pathname === '/rest/v1/veiculos') {
    const ativos = [veiculo, outroVeiculo].filter(v => v.ativo);
    return reply(url.searchParams.has('id') ? ativos.find(v => 'eq.' + v.id === url.searchParams.get('id')) || null : ativos);
  }
  if (url.pathname === '/rest/v1/viagens') {
    if (indisponivel) return reply({ message: 'offline' }, 503);
    if (options.method === 'POST') {
      const body = JSON.parse(options.body);
      assert.equal(body.motorista_id, 'motorista');
      const escolhido = [veiculo, outroVeiculo].find(v => v.id === body.veiculo_id);
      assert.ok(escolhido);
      if (viagens.some(v => v.status === 'em_andamento' && v.veiculo.id === escolhido.id)) return reply({ code: '23505', message: 'ocupado' }, 409);
      const escolhida = catalogo.find(l => l.id === body.linha_id);
      assert.ok(escolhida);
      const nova = criar('viagem-nova', { ...body, linha: escolhida, veiculo: escolhido }); viagens.push(nova); return reply(nova, 201);
    }
    if (options.method === 'PATCH') {
      const item = viagens.find(v => 'eq.' + v.id === url.searchParams.get('id') && v.motorista_id === 'motorista' && v.status === 'em_andamento');
      if (item) Object.assign(item, JSON.parse(options.body));
      return reply(item || null);
    }
    if (url.searchParams.has('motorista_id')) return reply(viagens.find(v => v.motorista_id === 'motorista' && v.status === 'em_andamento') || null);
    for (const [key, value] of Object.entries({ status: 'eq.em_andamento', 'linha.ativo': 'eq.true', 'linha.publica': 'eq.true', 'veiculo.ativo': 'eq.true' })) assert.equal(url.searchParams.get(key), value);
    assert.ok(!url.searchParams.get('select').includes('motorista'));
    return reply(viagens.filter(v => v.status === 'em_andamento' && v.linha.ativo && v.linha.publica && v.veiculo.ativo));
  }
  throw new Error('Acesso inesperado (incluindo GPS privado): ' + url.pathname);
};
const { viagensRouter } = await import('../src/routes/viagens.js');
const app = express(); app.use(express.json()); app.use('/api/viagens', viagensRouter);
app.use((error, req, res, next) => res.status(503).json({ error: 'Indisponível' }));
const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
const base = 'http://127.0.0.1:' + server.address().port + '/api/viagens';
const request = (path, options) => fetchOriginal(base + path, options);
const post = body => ({ method: 'POST', headers: { Authorization: 'Bearer motorista', 'Content-Type': 'application/json' }, body: JSON.stringify({ linhaChave: 'anchieta', veiculoId: veiculo.id, ...body }) });
try {
  await test('passageiro sem login acompanha início e encerramento da viagem real', async () => {
    viagens = [];
    assert.deepEqual((await (await request('/publicas')).json()).data, []);
    const inicio = await request('/iniciar', post({ motorista_id: 'outro', veiculo_id: 'outro' }));
    assert.equal(inicio.status, 201);
    assert.equal((await inicio.json()).data.linhaChave, 'anchieta');
    const publica = await request('/publicas');
    assert.equal(publica.headers.get('cache-control'), 'no-store');
    const dados = (await publica.json()).data;
    assert.equal(dados.length, 1); assert.equal(dados[0].modoPosicao, 'trajeto_automatico');
    assert.deepEqual(Object.keys(dados[0]).sort(), ['id', 'iniciadaEm', 'linhaChave', 'veiculo', 'prefixo', 'modoPosicao'].sort());
    assert.equal((await request('/iniciar', post())).status, 409);
    assert.equal((await request('/encerrar', post())).status, 200);
    assert.deepEqual((await (await request('/publicas')).json()).data, []);
  });
  await test('linha e ônibus escolhidos prevalecem sobre sugestão do gestor', async () => {
    viagens = [];
    const resposta = await request('/iniciar', post({ linhaChave: 'industrial', veiculoId: outroVeiculo.id, veiculo_id: 'outro', motorista_id: 'outro' }));
    assert.equal(resposta.status, 201);
    assert.equal((await resposta.json()).data.linhaChave, 'industrial');
    const publica = (await (await request('/publicas')).json()).data;
    assert.equal(publica[0].linhaChave, 'industrial');
    assert.equal(publica[0].veiculo, outroVeiculo.nome);
    assert.equal(publica[0].prefixo, outroVeiculo.prefixo);
    await request('/encerrar', post());
  });
  await test('catálogo do login usa registros reais e permite operar sem sugestões do gestor', async () => {
    viagens = []; semSugestao = true;
    const opcoes = await request('/opcoes', { headers: { Authorization: 'Bearer motorista' } });
    assert.equal(opcoes.status, 200);
    const dados = (await opcoes.json()).data;
    assert.deepEqual(dados.linhas.map(l => l.chave), ['anchieta', 'industrial']);
    assert.deepEqual(dados.veiculos.map(v => v.id), [veiculo.id, outroVeiculo.id]);
    assert.equal(dados.sugestao.veiculoId, null);
    assert.equal(dados.viagemAtiva, null);
    assert.equal((await request('/iniciar', post({ linhaChave: 'industrial', veiculoId: outroVeiculo.id }))).status, 201);
    const ativa = (await (await request('/opcoes', { headers: { Authorization: 'Bearer motorista' } })).json()).data.viagemAtiva;
    assert.equal(ativa.veiculoId, outroVeiculo.id);
    assert.equal(ativa.linhaChave, 'industrial');
    await request('/encerrar', post()); semSugestao = false;
  });
  await test('ônibus não escolhido, inexistente, inativo ou ocupado não cria viagem', async () => {
    viagens = [];
    for (const veiculoId of [undefined, null, '', '01', {}, 'inexistente']) {
      assert.equal((await request('/iniciar', post({ veiculoId }))).status, 400);
    }
    assert.equal((await request('/iniciar', post({ veiculoId: '33333333-3333-4333-8333-333333333333' }))).status, 409);
    outroVeiculo.ativo = false;
    assert.equal((await request('/iniciar', post({ veiculoId: outroVeiculo.id }))).status, 409);
    outroVeiculo.ativo = true;
    viagens = [criar('ocupado', { motorista_id: 'outro' })];
    assert.equal((await request('/iniciar', post())).status, 409);
    viagens = [];
  });
  await test('linha inválida, indisponível ou ambígua não inicia outra linha por padrão', async () => {
    viagens = [];
    for (const linhaChave of [null, '', 'desconhecida', {}, 'toString']) {
      assert.equal((await request('/iniciar', post({ linhaChave }))).status, 400);
    }
    assert.equal((await request('/iniciar', post({ linhaChave: 'fortaleza' }))).status, 409);
    catalogo.push({ ...industrial, id: 'duplicada' });
    assert.equal((await request('/iniciar', post({ linhaChave: 'industrial' }))).status, 409);
    catalogo.pop();
    assert.equal(viagens.length, 0);
  });
  await test('filtro público respeita publicação/atividade, sem exceção hardcoded por linha', async () => {
    viagens = [criar('ok'), criar('segunda'), criar('privada', { linha: { ...linha, publica: false } }), criar('inativa', { linha: { ...linha, ativo: false } }), criar('veiculo-inativo', { veiculo: { ...veiculo, ativo: false } }), criar('fernandes', { linha: { ...linha, codigo: 'fernandes' } }), criar('desconhecida', { linha: { ...linha, codigo: 'nova', nome: 'Nova' } }), criar('encerrada', { status: 'encerrada' })];
    assert.deepEqual((await (await request('/publicas')).json()).data.map(v => v.id), ['ok', 'segunda', 'fernandes']);
  });
  await test('falha de consulta não se transforma em lista vazia de sucesso', async () => {
    indisponivel = true; assert.equal((await request('/publicas')).status, 503); indisponivel = false;
  });
  await test('início continua protegido por sessão e papel', async () => {
    assert.equal((await request('/iniciar', { method: 'POST' })).status, 401);
    assert.equal((await request('/iniciar', { method: 'POST', headers: { Authorization: 'Bearer gestor' } })).status, 403);
  });
  await test('GPS inválido não é convertido para zero', async () => {
    for (const latitude of [null, '', true, 100]) assert.equal((await request('/posicao-garagem', post({ latitude, longitude: -45 }))).status, 400);
  });
  await test('todas as linhas percorrem todos os vértices em 150s e aguardam encerramento no fim', () => {
    const contexto = { window: {} };
    vm.runInNewContext(fs.readFileSync('frontend/js/viagem-automatica.js', 'utf8'), contexto);
    vm.runInNewContext(fs.readFileSync('frontend/js/paradas.js', 'utf8'), contexto);
    const { preparar, posicao, duracaoMs } = contexto.window.ValeBusViagemAutomatica;
    assert.equal(duracaoMs, 150000);
    for (const chave of Object.keys(contexto.window.VALEBUS_PARADAS.paradasPorLinha)) {
    const coords = contexto.window.VALEBUS_PARADAS.obterTrajeto(chave);
    const copia = JSON.stringify(coords);
    const trajeto = preparar(coords, c => ({ x: c[0], y: c[1] }));
    for (let i = 0; i < coords.length; i++) {
      const p = posicao(trajeto, duracaoMs * trajeto.distancias[i] / trajeto.total);
      assert.ok(Math.abs(p.x - coords[i][0]) < 1e-8 && Math.abs(p.y - coords[i][1]) < 1e-8);
    }
    assert.equal(JSON.stringify(posicao(trajeto, duracaoMs)), JSON.stringify(trajeto.pontos.at(-1)));
    assert.equal(JSON.stringify(posicao(trajeto, duracaoMs * 10)), JSON.stringify(trajeto.pontos.at(-1)));
    assert.equal(JSON.stringify(posicao(trajeto, -1000)), JSON.stringify(trajeto.pontos[0]));
    assert.equal(JSON.stringify(coords), copia);
    }
    for (const chave of [undefined, null, '', 'todas', 'desconhecida', 'toString']) {
      assert.equal(contexto.window.VALEBUS_PARADAS.obterTrajeto(chave).length, 0);
    }
    assert.equal(preparar([], c => c), null);
    assert.equal(preparar([null, [0, 1]], c => c), null);
    assert.equal(preparar([[0, 0], [NaN, 1]], c => ({ x: c[0], y: c[1] })), null);
  });
} finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); globalThis.fetch = fetchOriginal; }
