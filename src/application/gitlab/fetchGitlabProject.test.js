import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchGitlabProject } from './fetchGitlabProject';

const api = (registro) => ({
  project: async (repo) => { registro.push(`project:${repo}`); return { id: 7, path_with_namespace: 'grupo/proyecto' }; },
  user: async () => { registro.push('user'); return { username: 'ana' }; },
  issuesWithDates: async (id, fullPath) => { registro.push(`issues:${id}:${fullPath}`); return [{ iid: 1 }]; },
  milestones: async (id) => { registro.push(`milestones:${id}`); return [{ id: 3 }]; },
  members: async (id) => { registro.push(`members:${id}`); return [{ id: 9 }]; },
});

test('resuelve el proyecto antes de pedir lo que depende de su id', async () => {
  const registro = [];
  const resultado = await fetchGitlabProject({ api: api(registro), repo: 'grupo/proyecto' });

  assert.deepEqual(resultado.project, { id: 7, path_with_namespace: 'grupo/proyecto' });
  assert.deepEqual(resultado.issues, [{ iid: 1 }]);
  assert.deepEqual(resultado.milestones, [{ id: 3 }]);
  assert.deepEqual(resultado.members, [{ id: 9 }]);
  // Los issues necesitan la ruta completa, no solo el id.
  assert.ok(registro.includes('issues:7:grupo/proyecto'));
  assert.ok(registro.indexOf('project:grupo/proyecto') < registro.indexOf('issues:7:grupo/proyecto'));
});

test('propaga el fallo del proyecto sin pedir lo demás', async () => {
  const registro = [];
  const roto = { ...api(registro), project: async () => { throw new Error('404'); } };

  await assert.rejects(() => fetchGitlabProject({ api: roto, repo: 'x' }), /404/);
  assert.ok(!registro.some(llamada => llamada.startsWith('issues:')));
});
