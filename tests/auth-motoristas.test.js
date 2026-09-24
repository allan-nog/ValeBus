import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import vm from 'node:vm';
import fs from 'node:fs';

// Nenhuma conexão com Supabase real. Toda chamada externa deve ser interceptada.
process.env.SUPABASE_URL = 'https://valebus-test.invalid';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-only';
const realFetch = globalThis.fetch;
const driverId = '11111111-1111-4111-8111-111111111111';
let scenario;
function reset() { scenario = { role: 'gestor', refresh: 0, revoked: false, active: true, linked: 0, authDeleted: false, rowDeleted: false }; }
reset();
const user = { id: 'user-test', email: 'teste@example.com', aud: 'authenticated', role: 'authenticated' };
const session = () => ({ access_token: 'valid', refresh_token: 'new-refresh', token_type: 'bearer', expires_in: 3600, user });
globalThis.fetch = async (input, init = {}) => {
  const url = new URL(typeof input === 'string' ? input : input.url);
  assert.equal(url.hostname, 'valebus-test.invalid', 'Teste tentou acessar um serviço real');
  const headers = new Headers(init.headers);
  const reply = (body, status = 200, extra = {}) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'x-supabase-api-version': '2024-01-01', ...extra } });
  if (url.pathname === '/auth/v1/token') {
    if (url.searchParams.get('grant_type') === 'refresh_token') {
      scenario.refresh++;
      if (scenario.refreshError) return reply({ code: 'refresh_token_not_found', msg: 'revoked' }, 400);
      return reply(session());
    }
    if (scenario.loginError) return reply({ code: scenario.loginError, msg: 'error' }, scenario.loginStatus || 400);
    return reply(session());
  }
  if (url.pathname === '/auth/v1/user') {
    if (scenario.networkError) return reply({ message: 'outage' }, 503);
    if (headers.get('authorization') !== 'Bearer valid') return reply({ code: 'bad_jwt', msg: 'expired' }, 401);
    return reply(user);
  }
  if (url.pathname === '/auth/v1/logout') { scenario.revoked = true; return new Response(null, { status: 204 }); }
  if (url.pathname.startsWith('/auth/v1/admin/users/')) { scenario.authDeleted = true; return reply({ user }); }
  if (url.pathname === '/rest/v1/perfis') {
    scenario.perfis = (scenario.perfis || 0) + 1;
    return reply({ id: user.id, papel: scenario.targetRole && scenario.perfis > 1 ? scenario.targetRole : scenario.role, nome: 'Teste', ativo: scenario.active });
  }
  if (url.pathname === '/rest/v1/motoristas') {
    if (init.method === 'DELETE') { scenario.rowDeleted = true; return new Response(null, { status: 204 }); }
    return reply({ id: driverId, usuario_id: user.id, email: user.email, ativo: scenario.active, matricula: 'MOT-TEST', linha_habitual: 'Linha Anchieta', veiculo_habitual: 'Ônibus #01' });
  }
  if (['/rest/v1/viagens', '/rest/v1/solicitacoes_socorro'].includes(url.pathname)) {
    return new Response(null, { status: 200, headers: { 'content-range': '0-0/' + scenario.linked } });
  }
  throw new Error('Chamada não prevista: ' + url.pathname);
};
const { authRouter } = await import('../src/routes/auth.js');
const { motoristasRouter } = await import('../src/routes/motoristas.js');
const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);
app.use('/api/gestor/motoristas', motoristasRouter);
app.use((error, req, res, next) => res.status(error.status || 500).json({ error: error.message }));
const server = app.listen(0, '127.0.0.1');
await new Promise(resolve => server.once('listening', resolve));
const base = 'http://127.0.0.1:' + server.address().port;
const request = (path, options = {}) => realFetch(base + path, options);
const cookie = value => ({ cookie: value });
try {
  await test('renova quando o access cookie já expirou e revalida o perfil', async () => {
    reset();
    const r = await request('/api/auth/me', { headers: cookie('valebus_refresh_token=refresh-one') });
    assert.equal(r.status, 200); assert.equal(scenario.refresh, 1);
    assert.match(r.headers.get('set-cookie'), /HttpOnly/);
    assert.equal((await r.json()).data.usuario.papel, 'gestor');
  });
  await test('duas requisições com o mesmo refresh fazem uma única renovação', async () => {
    reset();
    const rs = await Promise.all([1,2].map(() => request('/api/auth/me', { headers: cookie('valebus_access_token=expired; valebus_refresh_token=concurrent') })));
    assert.deepEqual(rs.map(r => r.status), [200,200]); assert.equal(scenario.refresh, 1);
  });
  await test('refresh revogado recebe 401 e cookies removidos', async () => {
    reset(); scenario.refreshError = true;
    const r = await request('/api/auth/me', { headers: cookie('valebus_refresh_token=revoked-token') });
    assert.equal(r.status, 401); assert.match(r.headers.get('set-cookie'), /Expires=Thu, 01 Jan 1970/);
  });
  await test('indisponibilidade não apaga cookies nem afirma senha inválida', async () => {
    reset(); scenario.networkError = true;
    const r = await request('/api/auth/me', { headers: cookie('valebus_access_token=valid') });
    assert.equal(r.status, 503); assert.equal(r.headers.get('set-cookie'), null);
  });
  await test('login diferencia credencial incorreta, confirmação e limite', async () => {
    for (const [code, status, expected] of [['invalid_credentials',400,401],['email_not_confirmed',400,403],['over_request_rate_limit',429,429]]) {
      reset(); scenario.loginError=code; scenario.loginStatus=status;
      const r=await request('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:user.email,senha:'teste-senha'})});
      assert.equal(r.status,expected);
    }
  });
  await test('login válido retorna papel e cria cookies para gestor e motorista', async () => {
    for (const role of ['gestor', 'motorista']) {
      reset(); scenario.role=role;
      const r=await request('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:user.email,senha:'teste-senha'})});
      assert.equal(r.status,200); assert.equal((await r.json()).data.usuario.papel,role);
      assert.match(r.headers.get('set-cookie'),/valebus_refresh_token=/);
    }
  });
  await test('login indisponível retorna 503 sem mensagem de senha inválida', async () => {
    reset(); scenario.loginError='unexpected_failure'; scenario.loginStatus=500;
    const r=await request('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:user.email,senha:'teste-senha'})});
    assert.equal(r.status,503); assert.doesNotMatch((await r.json()).error,/senha inválid/i);
  });
  await test('perfil inativo não é autorizado após renovar', async () => {
    reset(); scenario.active=false;
    const r=await request('/api/auth/me',{headers:cookie('valebus_refresh_token=inactive')});
    assert.equal(r.status,401);
  });
  await test('logout revoga sessão no Supabase e limpa os cookies', async () => {
    reset();
    const r=await request('/api/auth/logout',{method:'POST',headers:cookie('valebus_refresh_token=logout-token')});
    assert.equal(r.status,204); assert.equal(scenario.revoked,true); assert.ok(r.headers.get('set-cookie'));
  });
  await test('visitante e motorista não podem excluir', async () => {
    reset();
    let r=await request('/api/gestor/motoristas/'+driverId,{method:'DELETE'}); assert.equal(r.status,401);
    scenario.role='motorista';
    r=await request('/api/gestor/motoristas/'+driverId,{method:'DELETE',headers:cookie('valebus_access_token=valid')}); assert.equal(r.status,403);
    assert.equal(scenario.authDeleted,false);
  });
  await test('vínculos históricos impedem exclusão antes de remover Auth', async () => {
    reset(); scenario.linked=1;
    const r=await request('/api/gestor/motoristas/'+driverId,{method:'DELETE',headers:cookie('valebus_access_token=valid')});
    assert.equal(r.status,409); assert.equal(scenario.authDeleted,false); assert.equal(scenario.rowDeleted,false);
  });
  // O perfil consultado pela autorização é gestor; o perfil do alvo é motorista.
  await test('exclusão permanente remove Auth e cadastro sem histórico', async () => {
    reset();
    scenario.targetRole='motorista';
    const r=await request('/api/gestor/motoristas/'+driverId,{method:'DELETE',headers:cookie('valebus_access_token=valid')});
    assert.equal(r.status,200); assert.equal(scenario.authDeleted,true); assert.equal(scenario.rowDeleted,true);
  });
  await test('frontend preserva cache de sessão em 503, remove em 401', async () => {
    const storage=new Map([['valebus_usuario','{"nome":"Teste"}']]);
    let status=503;
    const window={};
    const context={window, console, localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},fetch:async()=>({ok:false,status}),setTimeout};
    vm.runInNewContext(fs.readFileSync(new URL('../frontend/js/api.js',import.meta.url),'utf8'),context);
    await assert.rejects(window.ValeBusAPI.obterSessaoAutenticada()); assert.ok(storage.has('valebus_usuario'));
    status=401; assert.equal(await window.ValeBusAPI.obterSessaoAutenticada(),null); assert.equal(storage.has('valebus_usuario'),false);
  });
} finally { server.closeAllConnections(); await new Promise(resolve=>server.close(resolve)); globalThis.fetch=realFetch; }
