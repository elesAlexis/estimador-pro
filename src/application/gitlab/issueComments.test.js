/**
 * El caso de uso de comentarios no tenía cobertura: vivía dentro de un
 * useEffect. Se prueba el lote, la cancelación y el aislamiento de fallos.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadIssueComments, issueCommentTarget, normalizeIssueComments } from './issueComments';

const nota = (id) => ({ id, body: `nota ${id}`, author: { name: 'Ana' }, created_at: '2026-01-01T00:00:00Z' });
const objetivos = (cantidad) => Array.from({ length: cantidad }, (_, i) => ({ projectId: '1', iid: String(i + 1), taskId: `t-${i + 1}`, sprintId: 's-1' }));

test('consulta en lotes de cuatro como máximo', async () => {
  let enVuelo = 0, pico = 0;
  const api = { issueNotes: async () => { pico = Math.max(pico, ++enVuelo); await Promise.resolve(); enVuelo--; return [nota(1)]; } };

  const { comments } = await loadIssueComments({ api, targets: objetivos(9) });

  assert.ok(pico <= 4, `se lanzaron ${pico} consultas a la vez`);
  assert.equal(Object.keys(comments).length, 9);
});

test('un issue que falla no impide cargar los demás del lote', async () => {
  const api = { issueNotes: async (_, iid) => { if (iid === '2') throw new Error('403'); return [nota(Number(iid))]; } };

  const { comments, failures, firstError, cacheEntries } = await loadIssueComments({ api, targets: objetivos(4) });

  assert.equal(failures, 1);
  assert.equal(firstError.message, '403');
  assert.deepEqual(Object.keys(comments).sort(), ['t-1', 't-3', 't-4']);
  assert.equal(cacheEntries.length, 3, 'solo se cachea lo que sí cargó');
});

test('una cancelación no cuenta como fallo y detiene la carga', async () => {
  const controller = new AbortController();
  const api = { issueNotes: async () => { controller.abort(); const error = new Error('cancelado'); error.name = 'AbortError'; throw error; } };

  await assert.rejects(
    () => loadIssueComments({ api, targets: objetivos(8), signal: controller.signal }),
    (error) => error.name === 'AbortError',
  );
});

test('los lotes siguientes no se consultan tras cancelar', async () => {
  const controller = new AbortController();
  let consultas = 0;
  const api = { issueNotes: async () => { consultas++; controller.abort(); return [nota(1)]; } };

  await loadIssueComments({ api, targets: objetivos(8), signal: controller.signal }).catch(() => {});

  assert.equal(consultas, 4, 'solo se consultó el primer lote');
});

test('las entradas de caché traen la forma que espera el reducer', async () => {
  const api = { issueNotes: async () => [nota(7), { id: 8, system: true, body: 'x' }] };

  const { cacheEntries } = await loadIssueComments({ api, targets: [{ projectId: '1', iid: '1', taskId: 't-1', sprintId: 's-1' }] });

  assert.deepEqual(Object.keys(cacheEntries[0]).sort(), ['comments', 'sprintId', 'taskId']);
  assert.equal(cacheEntries[0].comments.length, 1, 'las notas del sistema se descartan');
});

test('sin sprintId no se genera entrada de caché (detalle de una sola tarea)', async () => {
  const api = { issueNotes: async () => [nota(1)] };

  const { comments, cacheEntries } = await loadIssueComments({ api, targets: [{ projectId: '1', iid: '1', taskId: 't-1' }] });

  assert.equal(comments['t-1'].length, 1);
  assert.deepEqual(cacheEntries, []);
});

test('issueCommentTarget solo acepta destinos del servidor actual', () => {
  const server = 'https://gitlab.example.com';
  assert.deepEqual(issueCommentTarget({ id: '7', target: `${server}/projects/42` }, server), { projectId: '42', iid: '7' });
  assert.equal(issueCommentTarget({ id: '7', target: 'https://otro.com/projects/42' }, server), null);
  assert.equal(issueCommentTarget({ id: 'x', target: `${server}/projects/42` }, server), null);
});

test('normalizeIssueComments rechaza una respuesta que no sea lista', () => {
  assert.throws(() => normalizeIssueComments({}), /comentarios inválidos/);
});
