/**
 * Reglas de la integración: qué URL de servidor se acepta, qué configuración es
 * pública y cómo se identifica un destino remoto. El módulo no tenía cobertura;
 * las aserciones de `gitlabOrigin` vienen de gitlabOAuth.test.js, de donde se
 * mudó la función.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { gitlabOrigin, gitlabTarget, publicIntegration } from './integration';

test('rechaza servidores inseguros o con credenciales', () => {
  for (const url of ['http://gitlab.example.com', 'https://user:pass@gitlab.example.com', 'https://gitlab.example.com?token=x']) {
    assert.throws(() => gitlabOrigin(url));
  }
  assert.equal(gitlabOrigin('https://gitlab.example.com/gitlab/'), 'https://gitlab.example.com/gitlab');
});

test('gitlabOrigin también rechaza un fragmento y una URL sin forma', () => {
  assert.throws(() => gitlabOrigin('https://gitlab.example.com#x'));
  assert.throws(() => gitlabOrigin('no-es-una-url'));
});

test('gitlabTarget normaliza la barra final del servidor', () => {
  assert.equal(gitlabTarget('https://gitlab.example.com/', 42), 'https://gitlab.example.com/projects/42');
  assert.equal(gitlabTarget('https://gitlab.example.com', 42), 'https://gitlab.example.com/projects/42');
});

test('publicIntegration deja fuera cualquier campo que no sea configuración pública', () => {
  const resultado = publicIntegration({
    provider: 'gitlab', url: 'https://gitlab.example.com', repo: 'grupo/proyecto', clientId: 'abc',
    accessToken: 'SECRETO', refreshToken: 'SECRETO',
  });
  assert.deepEqual(resultado, { provider: 'gitlab', url: 'https://gitlab.example.com', repo: 'grupo/proyecto', clientId: 'abc' });
});

test('publicIntegration normaliza entradas inválidas en vez de propagarlas', () => {
  assert.deepEqual(publicIntegration(), { provider: null, url: '', repo: '', clientId: '' });
  assert.deepEqual(publicIntegration({ provider: 'otro', url: 42, repo: null }),
    { provider: null, url: '', repo: '', clientId: '' });
});
