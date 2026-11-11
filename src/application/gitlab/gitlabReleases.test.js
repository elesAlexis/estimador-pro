import test from 'node:test';
import assert from 'node:assert/strict';
import { saveGitlabRelease } from './gitlabReleases';
test('crea una versión únicamente sobre un tag existente, sin ref ni creación de tag', async () => {
  let payload;
  const api = { tags: async () => [{ name: 'v1' }], releases: async () => [], createRelease: async (id, body) => { payload = body; } };
  const draft = { tag_name: 'v1', name: 'Versión 1', description: 'Notas', milestones: ['Sprint 1'] };
  await saveGitlabRelease({ api, projectId: 1, draft });
  assert.deepEqual(payload, draft); assert.equal(Object.hasOwn(payload, 'ref'), false);
  await assert.rejects(saveGitlabRelease({ api, projectId: 1, draft: { ...draft, tag_name: 'missing' } }), /tag ya no existe/);
});
test('un cambio concurrente de release impide actualizarla', async () => {
  const original = { tag_name: 'v1', name: 'Antes', description: '', milestones: [] };
  const api = { tags: async () => [{ name: 'v1' }], releases: async () => [{ ...original, name: 'Cambio remoto' }],
    updateRelease: () => { throw new Error('No debe escribir'); } };
  await assert.rejects(saveGitlabRelease({ api, projectId: 1, draft: { ...original, milestones: [] }, original }), /versión cambió/);
});
