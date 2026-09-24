import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import express from 'express';
import WebSocket from 'ws';

// Chrome instalado, HTML/JS/Leaflet reais e API de teste em memória.
// Não carrega .env nem acessa Supabase. Habilite com VALEBUS_BROWSER_TEST=1.
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(fn, description, timeout = 20000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const result = await fn();
    if (result) return result;
    await pause(100);
  }
  throw new Error('Tempo esgotado: ' + description);
}
async function connect(url, errors) {
  const ws = new WebSocket(url);
  await once(ws, 'open');
  let sequence = 0;
  const pending = new Map();
  ws.on('message', raw => {
    const message = JSON.parse(raw);
    if (message.id) {
      const entry = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) entry?.reject(new Error(JSON.stringify(message.error)));
      else entry?.resolve(message.result);
    }
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
    if (message.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(message.params.type)) {
      errors.push(message.params.args.map(a => a.value || a.description).join(' '));
    }
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence; pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  };
  await send('Runtime.enable');
  await send('Page.enable');
  return { send, evaluate, close: () => ws.close() };
}
const instrument = `
  window.__clockOffset = 0;
  const nowOriginal = Date.now.bind(Date);
  Date.now = () => nowOriginal() + window.__clockOffset;
  let leaflet;
  Object.defineProperty(window, 'L', {
    configurable: true, get() { return leaflet; },
    set(value) {
      leaflet = value;
      value.Map.addInitHook(function () { window.__testMap = this; });
    }
  });
  window.__snapshot = () => {
    const layers = Object.values(window.__testMap?._layers || {});
    const buses = layers.filter(l => l.options?.icon?.options?.html?.includes('bus-marker-container'));
    return {
      buses: buses.map(l => ({ position: [l.getLatLng().lat, l.getLatLng().lng], popup: l.getPopup()?.getContent() })),
      paths: layers.filter(l => l instanceof L.Polyline).map(l => l.getLatLngs().map(p => [p.lat, p.lng])),
      stops: document.querySelectorAll('.ponto-parada-container').length,
      label: document.getElementById('main-header-live-label')?.textContent,
      empty: document.getElementById('mapa-alerta-vazio')?.style.display,
      count: document.getElementById('total-onibus-ativo')?.textContent,
      lines: document.getElementById('total-linhas-ativas')?.textContent,
      active: document.querySelector('#filtros-legenda [aria-selected="true"]')?.dataset.linha,
      action: document.getElementById('btn-acao-texto')?.textContent,
      text: document.body.innerText
    };
  };
`;

await test('fluxo Motorista → Passageiro no Chrome, com abas reais', { skip: process.env.VALEBUS_BROWSER_TEST !== '1', timeout: 180000 }, async t => {
  const app = express();
  app.use(express.json());
  let active = null, sequence = 0, clockOffset = 0, publicCount = 0;
  let unavailable = false, injected = null;
  const now = () => Date.now() + clockOffset;
  const context = { window: {} };
  vm.runInNewContext(await readFile('frontend/js/catalogo-operacional.js', 'utf8'), context);
  const catalog = context.window.VALEBUS_CATALOGO_OPERACIONAL;
  const lines = Object.entries(catalog.linhas).map(([chave, linha]) => ({ id: 'linha-' + chave, chave, nome: linha.nome }));
  const vehicles = catalog.frota.map((v, i) => ({ id: '00000000-0000-4000-8000-' + String(i + 1).padStart(12, '0'), nome: v.veiculo, prefixo: v.prefixo }));
  const chosenBus = vehicles.find(v => v.nome === 'Ônibus #07');
  let catalogUnavailable = true;
  const user = { id: 'usuario-teste', papel: 'motorista', perfil: 'motorista', logado: true, nome: 'Motorista Teste',
    matricula: 'MOT-TESTE', linha: 'Linha Industrial', linhaChave: 'industrial', veiculo: 'Ônibus #04' };
  app.use('/api', (_req, res, next) => {
    res.set('Date', new Date(now()).toUTCString());
    res.set('Cache-Control', 'no-store'); next();
  });
  app.get('/api/auth/me', (_req, res) => res.json({ data: { usuario: user } }));
  app.post('/api/auth/login', (_req, res) => res.json({ data: { usuario: user } }));
  app.get('/api/viagens/opcoes', (_req, res) => {
    if (catalogUnavailable) return res.status(503).json({ error: 'Catálogo temporariamente indisponível.' });
    res.json({ data: { linhas: lines, veiculos: vehicles, viagemAtiva: active,
      sugestao: { linhaChave: 'industrial', veiculoId: vehicles.find(v => v.nome === user.veiculo).id } } });
  });
  app.get('/api/ocorrencias', (_req, res) => res.json({ data: [] }));
  app.get('/api/viagens/ativa', (_req, res) => res.json({ data: active }));
  app.get('/api/viagens/publicas', (_req, res) => {
    publicCount++;
    if (unavailable) return res.status(503).json({ error: 'Falha de teste' });
    res.json({ data: injected || (active ? [active] : []), agora: new Date(now()).toISOString() });
  });
  app.post('/api/viagens/iniciar', (req, res) => {
    if (active) return res.status(409).json({ error: 'Já existe viagem' });
    const line = lines.find(l => l.chave === req.body.linhaChave);
    const vehicle = vehicles.find(v => v.id === req.body.veiculoId);
    if (!line || !vehicle) return res.status(400).json({ error: 'Escolha uma linha e um ônibus válidos.' });
    active = { id: 'viagem-' + ++sequence, linhaChave: line.chave, linhaId: line.id, linha: line.nome,
      iniciadaEm: new Date(now()).toISOString(), veiculo: vehicle.nome, veiculoId: vehicle.id,
      prefixo: vehicle.prefixo, status: 'em_andamento' };
    res.status(201).json({ data: active });
  });
  app.post('/api/viagens/encerrar', (_req, res) => {
    const encerrada = { ...active, status: 'encerrada' }; active = null;
    res.json({ data: encerrada });
  });
  app.use('/frontend', express.static(path.resolve('frontend')));
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = 'http://127.0.0.1:' + server.address().port;
  const profile = await mkdtemp(path.join(tmpdir(), 'valebus-interface-'));
  const chrome = spawn(process.env.CHROME_BIN || '/usr/bin/google-chrome', [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--no-first-run',
    '--disable-background-networking', '--disable-renderer-backgrounding',
    '--disable-background-timer-throttling', '--disable-dev-shm-usage',
    '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank'
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  let chromeLog = '';
  chrome.stderr.on('data', data => { chromeLog += data; });
  const tabs = [], errors = [];
  try {
    const debugPort = await until(async () => {
      try { return (await readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; }
      catch { if (chrome.exitCode !== null) throw new Error(chromeLog); return null; }
    }, 'iniciar Chrome');
    async function tab(page) {
      const target = await (await fetch('http://127.0.0.1:' + debugPort + '/json/new?about:blank', { method: 'PUT' })).json();
      const client = await connect(target.webSocketDebuggerUrl, errors);
      tabs.push(client);
      await client.send('Page.addScriptToEvaluateOnNewDocument', { source: instrument });
      await client.send('Page.navigate', { url: base + '/frontend/' + page });
      await until(() => client.evaluate(page.startsWith('login')
        ? '!!window.ValeBusAPI && !!document.getElementById("form-login-motorista")'
        : '!!window.__testMap && !!window.ValeBusViagemAutomatica'), 'carregar ' + page);
      return client;
    }
    const snapshot = async client => {
      await client.send('Page.bringToFront');
      await pause(80); // requestAnimationFrame retoma quando o usuário volta à aba.
      return client.evaluate('__snapshot()');
    };
    const click = (client, selector) => client.evaluate('document.querySelector(' + JSON.stringify(selector) + ').click()');
    async function refresh(client) {
      const count = publicCount;
      await client.send('Page.bringToFront');
      await client.evaluate("document.dispatchEvent(new Event('visibilitychange'))");
      await until(() => publicCount > count, 'atualizar viagens');
      await pause(100);
    }
    async function reload(client, page) {
      await client.send('Page.navigate', { url: base + '/frontend/' + page });
      await until(() => client.evaluate('!!window.__testMap && !!window.ValeBusViagemAutomatica'), 'recarregar ' + page);
      await pause(150);
    }
    const passenger = await tab('dashboard.html');
    await until(() => publicCount > 0, 'primeira consulta pública');
    await t.test('sem viagem: zero ônibus e aviso, mesmo com dados locais antigos', async () => {
      let state = await snapshot(passenger);
      assert.equal(state.buses.length, 0);
      assert.equal(state.empty, 'flex');
      assert.equal(state.lines, '0');
      assert.match(state.label, /Aguardando/);
      await passenger.evaluate(`localStorage.setItem('valebus_linha_motorista_ativa','anchieta');localStorage.setItem('valebus_linhas_ativas','["Linha Anchieta"]');localStorage.setItem('valebus_alertas','[{"id":"alt-2","linha":"anchieta","titulo":"Aviso antigo"}]')`);
      await reload(passenger, 'dashboard.html');
      state = await snapshot(passenger);
      assert.equal(state.buses.length, 0);
      assert.ok(!state.text.includes('Aviso antigo'));
      assert.equal(await passenger.evaluate("document.querySelector('.proximo-card__tempo').textContent"), '');
    });
    const driver = await tab('login.html');
    await t.test('login recupera falha do catálogo e confirma ônibus diferente da sugestão do gestor', async () => {
      await click(driver, '#btn-login-motorista');
      await driver.evaluate(`document.getElementById('input-motorista-id').value='motorista@teste.local'; document.getElementById('input-motorista-pin').value='SenhaTeste123!';`);
      await click(driver, '#btn-confirmar-motorista');
      await until(() => driver.evaluate("document.getElementById('motorista-erro-texto').textContent.includes('temporariamente')"), 'erro recuperável do catálogo');
      catalogUnavailable = false;
      await click(driver, '#btn-confirmar-motorista');
      await until(() => driver.evaluate("document.getElementById('select-motorista-veiculo').options.length === 9"), 'catálogo disponível');
      assert.equal(await driver.evaluate("document.getElementById('select-motorista-veiculo').value"), vehicles.find(v => v.nome === user.veiculo).id);
      await driver.evaluate("document.getElementById('select-motorista-linha').value='industrial';document.getElementById('select-motorista-veiculo').value=" + JSON.stringify(chosenBus.id));
      await click(driver, '#btn-confirmar-motorista');
      await until(() => driver.evaluate('!!window.__testMap && !!window.ValeBusViagemAutomatica'), 'entrada no painel');
      assert.equal(active, null, 'login não inicia viagem automaticamente');
      const selection = await driver.evaluate('ValeBusAPI.obterOperacaoMotorista()');
      assert.equal(selection.linhaChave, 'industrial');
      assert.equal(selection.veiculoId, chosenBus.id);
      assert.match((await snapshot(driver)).buses[0].popup, /Ônibus #07/);
    });
    await until(() => driver.evaluate("!document.querySelector('#btn-iniciar-rota').disabled"), 'operação do motorista');
    await t.test('motorista parado não se movimenta e não publica viagem', async () => {
      const a = await snapshot(driver); await pause(3100); const b = await snapshot(driver);
      assert.deepEqual(a.buses[0].position, b.buses[0].position);
      assert.equal(active, null);
    });
    await t.test('Iniciar Rota publica exatamente a linha e o ônibus escolhidos no login', async () => {
      await click(driver, '#btn-iniciar-rota');
      await until(() => active?.linhaChave === 'industrial', 'iniciar a linha do login');
      assert.equal(active.veiculoId, chosenBus.id);
      await refresh(passenger);
      const state = await snapshot(passenger);
      assert.equal(state.active, 'industrial');
      assert.equal(state.buses.length, 1);
      assert.match(state.buses[0].popup, /Ônibus #07/);
      await click(driver, '#btn-iniciar-rota');
      await until(() => active === null, 'encerrar primeira viagem');
      await refresh(passenger);
      assert.equal((await snapshot(passenger)).buses.length, 0);
    });
    await t.test('iniciar Anchieta atualiza Passageiro já aberto pelo polling de 5s', async () => {
      await click(driver, '[data-linha="anchieta"].rota-card__btn-trocar');
      await click(driver, '#btn-iniciar-rota');
      await until(() => active?.linhaChave === 'anchieta', 'iniciar Anchieta');
      await until(async () => (await snapshot(passenger)).buses.length === 1, 'passageiro detectar viagem');
      const state = await snapshot(passenger);
      assert.equal(state.active, 'anchieta');
      assert.equal(state.empty, 'none');
      assert.match(state.buses[0].popup, /Ônibus #07/);
      assert.match(state.buses[0].popup, /Linha Anchieta/);
      assert.equal(state.paths.length, 2);
      assert.ok(state.stops > 0);
      assert.deepEqual(state.paths[0], await passenger.evaluate("VALEBUS_PARADAS.obterTrajeto('anchieta')"));
      assert.equal((await snapshot(driver)).action, 'Encerrar Rota');
    });
    let passenger2;
    await t.test('login retoma a viagem ativa sem trocar a linha ou criar outra viagem', async () => {
      const id = active.id;
      const resume = await tab('login.html?operacao=1');
      await until(() => resume.evaluate("document.getElementById('texto-btn-motorista').textContent === 'Retomar viagem'"), 'opção de retomada');
      assert.equal(await resume.evaluate("document.getElementById('select-motorista-veiculo').value"), chosenBus.id);
      assert.equal(await resume.evaluate("document.getElementById('select-motorista-linha').value"), 'anchieta');
      assert.equal(await resume.evaluate("document.getElementById('select-motorista-linha').disabled"), true);
      await click(resume, '#btn-confirmar-motorista');
      await until(() => resume.evaluate("document.getElementById('btn-acao-texto')?.textContent === 'Encerrar Rota'"), 'retomar operação');
      assert.equal(active.id, id);
      await resume.send('Page.navigate', { url: 'about:blank' });
    });
    await t.test('movimento, abertura posterior e recarga mantêm o progresso', async () => {
      const first = (await snapshot(passenger)).buses[0].position;
      clockOffset = 45000;
      await Promise.all([driver, passenger].map(c => c.evaluate('__clockOffset = 45000')));
      await refresh(passenger);
      assert.notDeepEqual((await snapshot(passenger)).buses[0].position, first);
      passenger2 = await tab('dashboard.html');
      await until(async () => (await snapshot(passenger2)).buses.length === 1, 'segunda aba de passageiro');
      const before = (await snapshot(passenger2)).buses[0].position;
      await reload(passenger2, 'dashboard.html');
      await until(async () => (await snapshot(passenger2)).buses.length === 1, 'recarga da viagem');
      const after = (await snapshot(passenger2)).buses[0].position;
      assert.ok(Math.hypot(before[0] - after[0], before[1] - after[1]) < 0.003);
      await reload(driver, 'motorista.html');
      await until(async () => (await snapshot(driver)).action === 'Encerrar Rota', 'restaurar viagem do motorista');
      const driverPosition = (await snapshot(driver)).buses[0].position;
      assert.ok(Math.hypot(after[0] - driverPosition[0], after[1] - driverPosition[1]) < 0.003);
    });
    await t.test('fim aos 150s não reinicia nem encerra sozinho; motorista encerra nas duas abas', async () => {
      clockOffset = 160000;
      await driver.evaluate('__clockOffset = 115000'); // driver recarregado com diferença de 45s
      await passenger.evaluate('__clockOffset = 160000');
      await refresh(passenger);
      await refresh(passenger2);
      const end = await passenger.evaluate("VALEBUS_PARADAS.obterTrajeto('anchieta').at(-1)");
      await until(async () => {
        const pos = (await snapshot(passenger)).buses[0].position;
        return Math.hypot(pos[0] - end[0], pos[1] - end[1]) < 1e-8;
      }, 'fim da geometria');
      await pause(500);
      assert.equal((await snapshot(passenger)).buses.length, 1);
      assert.match((await snapshot(passenger)).buses[0].popup, /Aguardando encerramento/);
      await click(driver, '#btn-iniciar-rota');
      await until(() => active === null, 'encerrar');
      await refresh(passenger); await refresh(passenger2);
      assert.equal((await snapshot(passenger)).buses.length, 0);
      assert.equal((await snapshot(passenger2)).buses.length, 0);
      assert.equal((await snapshot(passenger)).lines, '0');
      assert.equal((await snapshot(passenger)).empty, 'flex');
    });
    await t.test('todas as outras sete linhas usam veículo e geometria correspondentes', async () => {
      clockOffset = 0;
      await reload(driver, 'motorista.html');
      await reload(passenger, 'dashboard.html');
      const keys = await passenger.evaluate('Object.keys(VALEBUS_PARADAS.trajetosPorLinha)');
      for (const key of keys.filter(k => k !== 'anchieta')) {
        await until(() => driver.evaluate("!document.querySelector('#btn-iniciar-rota').disabled"), 'botão disponível');
        await click(driver, '[data-linha="' + key + '"].rota-card__btn-trocar');
        await click(driver, '#btn-iniciar-rota');
        await until(() => active?.linhaChave === key, 'iniciar ' + key);
        await refresh(passenger);
        const state = await snapshot(passenger);
        assert.equal(state.buses.length, 1, key);
        assert.equal(state.active, key);
        assert.match(state.buses[0].popup, /Ônibus #07/);
        assert.deepEqual(state.paths[0], await passenger.evaluate('VALEBUS_PARADAS.obterTrajeto(' + JSON.stringify(key) + ')'));
        assert.ok(state.stops > 0);
        assert.equal(await passenger.evaluate('document.querySelector(\'.proximo-card[data-linha="' + key + '"]\').classList.contains("proximo-card--extra")'), false);
        await click(driver, '#btn-iniciar-rota');
        await until(() => active === null, 'encerrar ' + key);
        await refresh(passenger);
        assert.equal((await snapshot(passenger)).buses.length, 0);
      }
    });
    await t.test('trocar para linha sem viagem não mantém a geometria anterior', async () => {
      await click(passenger, '#filtros-legenda [data-linha="anchieta"]');
      await click(passenger, '.proximo-card[data-linha="industrial"]');
      const state = await snapshot(passenger);
      assert.deepEqual(state.paths[0], await passenger.evaluate("VALEBUS_PARADAS.obterTrajeto('industrial')"));
      assert.equal(state.buses.length, 0);
    });
    await t.test('duplicatas e campos inválidos não geram ônibus extras ou texto quebrado', async () => {
      const value = { id: 'duplicada', linhaChave: 'industrial', iniciadaEm: new Date(now()).toISOString(), veiculo: 'undefined', prefixo: 'null' };
      injected = [value, value, null, { ...value, id: 'sem-linha', linhaChave: 'desconhecida' }, { ...value, id: 'sem-data', iniciadaEm: 'ruim' }];
      await refresh(passenger);
      const state = await snapshot(passenger);
      assert.equal(state.buses.length, 1);
      assert.doesNotMatch(state.buses[0].popup, /undefined|null|NaN/);
      assert.equal(state.lines, '1');
      unavailable = true; await refresh(passenger);
      assert.equal((await snapshot(passenger)).buses.length, 0);
      assert.match((await snapshot(passenger)).label, /indisponíveis/);
      unavailable = false; injected = null; await refresh(passenger);
      assert.match((await snapshot(passenger)).label, /Aguardando/);
    });
    await t.test('formulário principal também permite escolher nova linha e novo ônibus', async () => {
      const login = await tab('login.html');
      await login.evaluate("document.getElementById('input-email').value='motorista@teste.local';document.getElementById('input-senha').value='SenhaTeste123!'");
      await click(login, '#botao-entrar');
      await until(() => login.evaluate("document.getElementById('select-motorista-veiculo').options.length === 9"), 'escolha pelo formulário principal');
      await login.evaluate("document.getElementById('select-motorista-linha').value='porto_sapucai';document.getElementById('select-motorista-veiculo').value=" + JSON.stringify(vehicles[1].id));
      await click(login, '#btn-confirmar-motorista');
      await until(() => login.evaluate("!!window.__testMap && document.getElementById('btn-iniciar-rota')?.disabled === false"), 'nova operação');
      await click(login, '#btn-iniciar-rota');
      await until(() => active?.linhaChave === 'porto_sapucai', 'iniciar nova seleção');
      assert.equal(active.veiculoId, vehicles[1].id);
      await refresh(passenger);
      const state = await snapshot(passenger);
      assert.equal(state.active, 'porto_sapucai');
      assert.match(state.buses[0].popup, /Ônibus #02/);
      await click(login, '#btn-iniciar-rota');
      await until(() => active === null, 'encerrar nova operação');
    });
    assert.deepEqual(errors, [], 'exceções e console.error/warn do aplicativo');
  } finally {
    for (const client of tabs) client.close();
    const stopped = once(chrome, 'exit');
    chrome.kill('SIGTERM');
    await Promise.race([stopped, pause(3000)]);
    server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
    // Processos auxiliares do Chrome podem terminar de gravar após o principal.
    await rm(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  }
});
