import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { createGitlabSession, createPKCE } from './gitlabOAuth';

const storage = () => {
  const values = new Map();
  return { values, getItem: key => values.get(key), setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
};
function setup(fetchImpl, extra = {}) {
  const saved = storage(); let destination, time = 100000;
  const session = createGitlabSession({ server: 'https://gitlab.example.com', clientId: 'public-id', redirectUri: 'http://localhost:5174/',
    storage: saved, fetchImpl, cryptoApi: webcrypto, now: () => time, navigate: url => { destination = url; }, ...extra });
  return { session, saved, destination: () => new URL(destination), advance: ms => { time += ms; },
    callback: () => 'http://localhost:5174/?code=one-use-code&state=' + new URL(destination).searchParams.get('state') };
}
const tokenResponse = (access = 'secret-access') => new Response(JSON.stringify({ access_token: access, refresh_token: 'secret-refresh', expires_in: 60 }));

test('PKCE usa S256 y valores aleatorios independientes', async () => {
  const a = await createPKCE(webcrypto), b = await createPKCE(webcrypto);
  assert.notEqual(a.verifier, b.verifier); assert.notEqual(a.state, b.state);
  assert.equal(a.challenge, Buffer.from(await webcrypto.subtle.digest('SHA-256', new TextEncoder().encode(a.verifier))).toString('base64url'));
});
test('callback de un solo uso limpia URL y verifier; tokens no se guardan', async () => {
  let exchanges = 0, cleaned = 0;
  const env = setup(async (url, options) => {
    exchanges++; assert.equal(options.redirect, 'error'); assert.equal(options.body.has('client_secret'), false);
    assert.equal(options.body.get('grant_type'), 'authorization_code'); return tokenResponse();
  });
  await env.session.login();
  assert.equal(env.destination().searchParams.get('code_challenge_method'), 'S256');
  assert.equal(env.destination().searchParams.get('scope'), 'api');
  const [a, b] = await Promise.all([env.session.finishCallback(env.callback(), () => cleaned++), env.session.finishCallback(env.callback())]);
  assert.equal(a, true); assert.equal(b, true); assert.equal(exchanges, 1); assert.equal(cleaned, 1);
  assert.equal(env.saved.values.size, 0); assert.equal(await env.session.getToken(), 'secret-access');
  assert.equal(JSON.stringify(env.session.getSnapshot()).includes('secret'), false);
});
test('state incorrecto, autorización rechazada o flujo caducado no intercambian tokens', async () => {
  for (const mode of ['state', 'expired', 'denied']) {
    let calls = 0; const env = setup(async () => { calls++; return tokenResponse(); });
    await env.session.login();
    if (mode === 'expired') env.advance(600001);
    const url = mode === 'state' ? env.callback().replace(/state=.*/, 'state=wrong') : mode === 'denied' ? env.callback().replace('code=one-use-code', 'error=access_denied') : env.callback();
    assert.equal(await env.session.finishCallback(url), false); assert.equal(calls, 0); assert.equal(env.saved.values.size, 0);
  }
});
test('renovación concurrente usa una sola solicitud y rota el token en memoria', async () => {
  let refresh = 0;
  const env = setup(async (url, options) => {
    if (options.body.get('grant_type') === 'refresh_token') { refresh++; return tokenResponse('rotated'); }
    return tokenResponse();
  });
  await env.session.login(); await env.session.finishCallback(env.callback()); env.advance(35000);
  assert.deepEqual(await Promise.all([env.session.getToken(), env.session.getToken()]), ['rotated', 'rotated']); assert.equal(refresh, 1);
});
test('cerrar sesión durante un callback pendiente ignora su respuesta tardía', async () => {
  let resolve; const env = setup(() => new Promise(done => { resolve = done; }));
  await env.session.login(); const callback = env.session.finishCallback(env.callback());
  await env.session.logout(); resolve(tokenResponse());
  assert.equal(await callback, false); assert.equal(env.session.getSnapshot().connected, false);
  await assert.rejects(env.session.getToken(), /Conecta/);
});
test('sesión revocada y almacenamiento bloqueado producen errores controlados', async () => {
  const env = setup(async () => new Response('', { status: 401 }));
  await env.session.login(); assert.equal(await env.session.finishCallback(env.callback()), false);
  assert.match(env.session.getSnapshot().error, /401/);
  const blocked = setup(async () => tokenResponse(), { storage: { setItem() { throw new Error('Bloqueado'); }, removeItem() { throw new Error('Bloqueado'); } } });
  await assert.rejects(blocked.session.login(), /Bloqueado/); await blocked.session.logout();
  assert.equal(blocked.session.getSnapshot().connected, false);
});
test('desconectar revoca la sesión y un fallo de red mantiene el cierre local', async () => {
  let revoked = false;
  const env = setup(async url => { if (url.endsWith('/revoke')) { revoked = true; throw new Error('offline'); } return tokenResponse(); });
  await env.session.login(); await env.session.finishCallback(env.callback()); await env.session.logout();
  assert.equal(revoked, true); assert.equal(env.session.getSnapshot().connected, false);
  assert.match(env.session.getSnapshot().error, /No se pudo confirmar/);
});
