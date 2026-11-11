/**
 * Caracterización de los dos constructores de payload con un solo consumidor y
 * sin cobertura directa. Congelan la salida exacta antes de mover el módulo a
 * infraestructura: si el refactor cambia un byte del cuerpo enviado a GitLab,
 * estos tests fallan.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { taskPayload, editablePayload, gitlabOperation } from './gitlabMapping';
import { readMetadata } from '../../domain/remoteSync';

const tarea = {
  id: 't-1', title: 'Diseñar API', role: 'Backend', duration: 3, type: 'dev', priority: 'alta',
  description: 'Detalle', wbs: '1.2', progress: 50, plannedStart: '2026-03-02', plannedEnd: '2026-03-04',
  realStart: '', realEnd: '', assigneeIds: [7],
};

test('taskPayload arma el cuerpo completo de un issue nuevo', () => {
  const payload = taskPayload(tarea, 42, null, 'task:s-1:t-1');

  assert.equal(payload.title, 'Diseñar API');
  assert.equal(payload.due_date, '2026-03-04');
  assert.equal(payload.milestone_id, 42);
  assert.deepEqual(payload.labels, ['estimador:prioridad:alta', 'estimador:tipo:dev']);
  assert.deepEqual(payload.assignee_ids, [7]);
  assert.equal(payload.state, 'opened');

  assert.match(payload.description, /^Detalle\n\n<!-- estimador-id:task%3As-1%3At-1 -->\n/);
  assert.deepEqual(readMetadata(payload.description), {
    id: 't-1', role: 'Backend', duration: 3, type: 'dev', priority: 'alta', wbs: '1.2', progress: 50,
    description: 'Detalle', plannedStart: '2026-03-02', plannedEnd: '2026-03-04', realStart: '', realEnd: '',
  });
});

test('taskPayload conserva las etiquetas ajenas del issue y hereda sus responsables', () => {
  const remoto = {
    description: 'Texto previo',
    labels: ['estimador:tipo:qa', 'módulo: Pagos'],
    assignees: [{ id: 9 }],
    due_date: '2026-01-01',
  };
  const payload = taskPayload({ ...tarea, progress: 100, assigneeIds: undefined }, null, remoto, 'task:s-1:t-1');

  // Reemplaza las etiquetas propias del estimador y respeta las demás.
  assert.deepEqual(payload.labels, ['estimador:prioridad:alta', 'estimador:tipo:dev', 'módulo: Pagos']);
  // Sin asignación local, mantiene la de GitLab en vez de vaciarla.
  assert.deepEqual(payload.assignee_ids, [9]);
  assert.equal(payload.milestone_id, null);
  assert.equal(payload.state, 'closed');
  // La descripción se reescribe sobre la remota, no sobre la local.
  assert.match(payload.description, /^Texto previo\n\n/);
  assert.equal(readMetadata(payload.description).progress, 100);
});

test('editablePayload traduce el estado al verbo de GitLab y aplana las etiquetas', () => {
  assert.deepEqual(editablePayload('issue', { title: 'A', labels: ['x', 'y'], state: 'closed' }, false),
    { title: 'A', labels: 'x,y', state_event: 'close' });
  assert.deepEqual(editablePayload('issue', { state: 'opened' }, false), { state_event: 'reopen' });
  assert.deepEqual(editablePayload('milestone', { state: 'active' }, false), { state_event: 'activate' });
});

test('editablePayload omite el estado al crear: cerrar es una segunda operación', () => {
  assert.deepEqual(editablePayload('issue', { title: 'A', state: 'closed', labels: ['b', 'a'] }, true),
    { title: 'A', labels: 'b,a' });
});

test('un tipo de elemento desconocido falla con un mensaje claro', () => {
  // Antes el despacho por reflexión daba «api[undefined] is not a function».
  assert.throws(() => gitlabOperation('epic'), /Tipo de elemento desconocido para GitLab: epic/);
  assert.equal(gitlabOperation('issue').idField, 'iid');
  assert.equal(gitlabOperation('milestone').idField, 'id');
});

test('cada operación apunta al método correcto de la API', async () => {
  const llamadas = [];
  const api = new Proxy({}, { get: (_, nombre) => (...args) => { llamadas.push([nombre, args[0]]); return {}; } });
  for (const kind of ['issue', 'milestone']) {
    const op = gitlabOperation(kind);
    op.fetch(api, 1, '5', {}); op.list(api, 1, {}); op.create(api, 1, {}, {}); op.update(api, 1, '5', {}, {});
  }
  assert.deepEqual(llamadas.map(([nombre]) => nombre), [
    'issue', 'issues', 'createIssue', 'updateIssue',
    'milestone', 'milestones', 'createMilestone', 'updateMilestone',
  ]);
});
