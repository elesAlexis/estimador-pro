import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareGitlabSync, executeGitlabSync } from './gitlabSync';
import { issueBusinessDays, importGitlabProject, importedProjectStart, remoteSnapshot, sprintPayload } from './gitlabMapping';
import { descriptionWithMetadata, threeWayChanges, readMetadata } from '../../domain/remoteSync';
import { calculateProgress } from '../../domain/metrics';
import { normalizeProject } from '../projectValidation';
import { calculateSprintDates } from '../../domain/schedule';
import { decorateRemoteFields } from './remoteFields';
import { sprintReducer } from '../projectReducer';
import { projectActions } from '../projectActions';
import { createGitlabJournal } from '../../infrastructure/gitlabJournal';
const target = 'https://gitlab.example.com/projects/1';
test('calcula tres días para el issue del 26 al 28 de agosto de 2026', () => {
  const sprints = importGitlabProject({ id: 1 }, [], [{ iid: 1, title: 'Login', state: 'opened',
    start_date: '2026-08-26', due_date: '2026-08-28' }], target);
  assert.equal(sprints[0].tasks[0].duration, 3);
  const task = calculateSprintDates(sprints, '2026-09-14')[0].tasks[0];
  assert.equal(task.calculatedStart, '2026-08-26'); assert.equal(task.calculatedEnd, '2026-08-28');
});
test('el intervalo excluye fines de semana y festivos sin desplazar fechas', () => {
  assert.equal(issueBusinessDays('2026-12-24', '2026-12-28'), 2);
  assert.equal(issueBusinessDays('2026-08-29', '2026-08-30'), 0);
  assert.equal(issueBusinessDays('', '2026-08-28'), null);
  assert.throws(() => issueBusinessDays('2026-08-28', '2026-08-26'), /anterior/);
});
test('las fechas del issue prevalecen sobre metadata y no necesitan duración ni calendario cargado', () => {
  const issues = [{ id: 1, iid: 1, title: 'Entrega', state: 'closed', start_date: '2026-12-24', due_date: '2026-12-25',
    description: descriptionWithMetadata('', '1', { plannedStart: '2026-01-01', plannedEnd: '2026-01-02' }) }];
  const sprints = importGitlabProject({ id: 1 }, [], issues, target);
  const task = calculateSprintDates(sprints, '')[0].tasks[0];
  assert.equal(task.calculatedStart, '2026-12-24');
  assert.equal(task.calculatedEnd, '2026-12-25');
  assert.equal(task.duration, 1);
  assert.equal(importedProjectStart(sprints, '2026-09-14'), '2026-12-24');
  assert.equal(calculateProgress([task]), 100);
});
test('una entrega eliminada en GitLab no reaparece desde metadata antigua', () => {
  const sprints = importGitlabProject({ id: 1 }, [], [{ id: 1, iid: 1, title: 'Sin fecha', state: 'opened', due_date: null,
    description: descriptionWithMetadata('', '1', { plannedEnd: '2026-01-02' }) }], target);
  const task = calculateSprintDates(sprints, '2026-09-14')[0].tasks[0];
  assert.equal(task.calculatedStart, null); assert.equal(task.calculatedEnd, null);
});
test('respaldos ya importados recuperan la entrega nativa guardada sin inventar inicio', () => {
  const task = calculateSprintDates(decorateRemoteFields([{ id: 's', tasks: [{ id: 't', duration: 0, scheduleMode: 'imported',
    plannedEnd: '2026-01-01', remote: { base: { due_date: '2026-12-25' } } }] }]), '')[0].tasks[0];
  assert.equal(task.calculatedEnd, '2026-12-25'); assert.equal(task.calculatedStart, null);
});
const task = { id: 't1', title: 'Tarea', duration: 2, type: 'dev', priority: 'media', role: 'QA', progress: 100, calculatedStart: '2026-12-24', calculatedEnd: '2026-12-28' };
const initial = () => [{ id: 's1', name: 'Sprint 1', tasks: [{ ...task }] }];
function mockApi() {
  const data = { milestones: [], issues: [] }, writes = [];
  let next = 10, failIssue = false;
  const copy = item => structuredClone(item);
  const create = kind => async (pid, body) => {
    if (kind === 'issues' && failIssue) throw new Error('Fallo de red');
    const item = { ...body, id: ++next, iid: next, project_id: 1, state: kind === 'issues' ? 'opened' : 'active', updated_at: 'v1' };
    if (kind === 'issues') { item.labels = body.labels?.split(',') || []; item.assignees = (body.assignee_ids || []).map(id => ({ id })); item.milestone = body.milestone_id ? { id: body.milestone_id } : null; }
    data[kind].push(item); writes.push({ method: 'create', kind }); return copy(item);
  };
  const update = kind => async (pid, id, body) => {
    const item = data[kind].find(item => String(item.id) === String(id));
    Object.assign(item, body);
    if (body.state_event) item.state = body.state_event === 'close' ? 'closed' : kind === 'issues' ? 'opened' : 'active';
    if (body.labels !== undefined) item.labels = body.labels ? body.labels.split(',') : [];
    if (body.assignee_ids !== undefined) item.assignees = body.assignee_ids.map(id => ({ id }));
    if (body.milestone_id !== undefined) item.milestone = body.milestone_id ? { id: body.milestone_id } : null;
    item.updated_at += 'x'; writes.push({ method: 'update', kind }); return copy(item);
  };
  return { data, writes, fail: value => { failIssue = value; }, api: {
    issues: async () => copy(data.issues), milestones: async () => copy(data.milestones),
    issue: async (pid, id) => copy(data.issues.find(item => String(item.iid) === String(id))),
    milestone: async (pid, id) => copy(data.milestones.find(item => String(item.id) === String(id))),
    createIssue: create('issues'), createMilestone: create('milestones'), updateIssue: update('issues'), updateMilestone: update('milestones'),
  } };
}
const recordState = state => (entry, remote) => { state.sprints = sprintReducer(state.sprints, projectActions.recordRemote(entry, remote)); };

test('fallo parcial conserva milestone y un reintento crea solo el issue pendiente', async () => {
  const mock = mockApi(), state = { sprints: initial() }; mock.fail(true);
  const run = () => executeGitlabSync({ api: mock.api, projectId: 1, entries: prepareGitlabSync(state.sprints, mock.data, target), record: recordState(state) });
  await assert.rejects(run(), /Fallo/); assert.ok(state.sprints[0].remote);
  mock.fail(false); await run();
  assert.equal(mock.data.milestones.length, 1); assert.equal(mock.data.issues.length, 1);
  assert.equal(mock.data.issues[0].milestone.id, mock.data.milestones[0].id);
  assert.equal(mock.data.issues[0].state, 'closed'); assert.equal(mock.data.milestones[0].state, 'closed');
  assert.equal(readMetadata(mock.data.issues[0].description).progress, 100);
  const entries = prepareGitlabSync(state.sprints, mock.data, target);
  assert.ok(entries.every(entry => entry.mode === 'none'));
});

test('detiene la operación si el recurso cambió después de la vista previa', async () => {
  const mock = mockApi(), state = { sprints: initial() };
  await executeGitlabSync({ api: mock.api, projectId: 1, entries: prepareGitlabSync(state.sprints, mock.data, target), record: recordState(state) });
  const entries = prepareGitlabSync(state.sprints, mock.data, target);
  mock.data.issues[0].title = 'Cambio de un compañero';
  const before = mock.writes.length;
  await assert.rejects(executeGitlabSync({ api: mock.api, projectId: 1, entries, record: recordState(state) }), /cambió/);
  assert.equal(mock.writes.length, before);
});

test('conservar un conflicto remoto sigue conservándolo en sincronizaciones posteriores', async () => {
  const mock = mockApi(), state = { sprints: initial() };
  await executeGitlabSync({ api: mock.api, projectId: 1, entries: prepareGitlabSync(state.sprints, mock.data, target), record: recordState(state) });
  state.sprints[0].tasks[0].title = 'Cambio local';
  mock.data.issues[0].title = 'Cambio remoto';
  const entries = prepareGitlabSync(state.sprints, mock.data, target), issue = entries.find(entry => entry.kind === 'issue');
  assert.ok(issue.conflicts.includes('title'));
  await executeGitlabSync({ api: mock.api, projectId: 1, entries, choices: { [issue.key + ':title']: 'remote' }, record: recordState(state) });
  assert.equal(mock.data.issues[0].title, 'Cambio remoto');
  assert.equal(prepareGitlabSync(state.sprints, mock.data, target).find(entry => entry.kind === 'issue').changes.title, undefined);
});

test('reconoce creaciones de respuesta perdida y evita crear un duplicado', async () => {
  const mock = mockApi();
  const entries = prepareGitlabSync(initial(), mock.data, target);
  await assert.rejects(executeGitlabSync({ api: mock.api, projectId: 1, entries, record: () => { throw new Error('Cuota'); } }), /Cuota/);
  assert.equal(mock.data.milestones.length, 1);
  const retry = prepareGitlabSync(initial(), mock.data, target);
  assert.ok(retry[0].remoteId); assert.notEqual(retry[0].mode, 'create');
});

test('clonar desvincula IDs y los marcadores diferencian IDs de tarea repetidos entre sprints', () => {
  const source = initial(); source[0].remote = { id: '1', target }; source[0].tasks[0].remote = { id: '2', target };
  const cloned = sprintReducer(source, { type: 'CLONE_SPRINT', payload: { sprintId: 's1', newSprintId: 's2', taskIdPrefix: 'copy' } });
  assert.equal(cloned[1].remote, undefined); assert.equal(cloned[1].tasks[0].remote, undefined);
  const two = [...initial(), { ...initial()[0], id: 's2' }];
  const entries = prepareGitlabSync(two, { milestones: [], issues: [] }, target).filter(entry => entry.kind === 'issue');
  assert.notEqual(entries[0].markerId, entries[1].markerId);
});

test('importar conserva fechas nativas, grupo milestone y borradores sin programar', () => {
  const project = { id: 1 };
  const milestones = [{ id: 7, project_id: 1, title: 'Entrega', start_date: '2026-12-01', due_date: '2026-12-31', state: 'active' }];
  const issues = [{ id: 1, iid: 2, title: 'Existente', state: 'closed', due_date: '2026-12-25', milestone: { id: 7 }, assignees: [{ id: 9, name: 'Ana' }] },
    { id: 2, iid: 3, title: 'De grupo', state: 'opened', milestone: { id: 99 }, labels: [], assignees: [] }];
  const imported = normalizeProject({ sprints: importGitlabProject(project, milestones, issues, target) }).sprints;
  assert.equal(imported[0].tasks[0].progress, 100); assert.equal(imported[0].tasks[0].duration, 0);
  assert.equal(imported[0].tasks[0].plannedEnd, '2026-12-25'); assert.deepEqual(imported[0].tasks[0].assigneeIds, [9]);
  const calculated = calculateSprintDates(imported, '2026-01-01');
  assert.equal(calculated[0].tasks[0].calculatedStart, null); assert.equal(calculated[0].sprintStart, '2026-12-01');
  const entries = prepareGitlabSync(imported, { milestones, issues }, target);
  assert.equal(entries.find(entry => entry.localId === 'gl-t-1-3').payload.milestone_id, 99);
});

test('sincroniza e importa el hito de entrega del producto en el milestone', () => {
  const payload = sprintPayload({ id: 's1', name: 'Entrega', productDelivery: true, tasks: [] }, {});
  assert.equal(readMetadata(payload.description).productDelivery, true);
  assert.match(payload.description, /hito de entrega del producto/);
  const milestones = [{ id: 7, project_id: 1, title: 'Entrega', state: 'active', description: payload.description }];
  const imported = importGitlabProject({ id: 1 }, milestones, [], target);
  assert.equal(imported[0].productDelivery, true);
});

test('recalcular fechas importadas exige la acción explícita y respeta Navidad', () => {
  const source = [{ id: 's1', tasks: [{ ...task, scheduleMode: 'imported', plannedStart: '2026-12-25', plannedEnd: '2026-12-26' }] }];
  const holidays = new Set(['2026-12-25']);
  assert.equal(calculateSprintDates(source, '2026-12-24', holidays)[0].tasks[0].calculatedStart, '2026-12-25');
  const next = sprintReducer(source, projectActions.recalculateImported());
  assert.equal(calculateSprintDates(next, '2026-12-24', holidays)[0].tasks[0].calculatedEnd, '2026-12-28');
});

test('rechaza destinos distintos y vínculos heredados no verificables', () => {
  const source = initial(); source[0].remote = { id: '1', target: 'https://otro.example/projects/1' };
  assert.throws(() => prepareGitlabSync(source, { milestones: [], issues: [] }, target), /otro destino/);
  delete source[0].remote; source[0].externalId = '123';
  assert.throws(() => prepareGitlabSync(source, { milestones: [], issues: [] }, target), /prototipo/);
});
test('la comparación distingue cambios remotos, locales y conflictos', () => {
  assert.deepEqual(threeWayChanges({ title: 'A' }, { title: 'B' }, { title: 'A' }), { changes: {}, conflicts: [] });
  assert.deepEqual(threeWayChanges({ title: 'A' }, { title: 'A' }, { title: 'B' }), { changes: { title: 'B' }, conflicts: [] });
  assert.deepEqual(threeWayChanges({ title: 'A' }, { title: 'B' }, { title: 'C' }), { changes: { title: 'C' }, conflicts: ['title'] });
});

test('registro inmediato recupera vínculos cuando se interrumpe el guardado local', () => {
  const map = new Map(), storage = { getItem: key => map.get(key), setItem: (key, value) => map.set(key, value), removeItem: key => map.delete(key) };
  const journal = createGitlabJournal(storage);
  const entry = { target, kind: 'issue', sprintId: 's1', localId: 't1' }, remote = { id: '44', target, base: remoteSnapshot('issue', { title: 'Tarea', state: 'opened' }) };
  journal.record(entry, remote);
  assert.equal(journal.restore(initial(), target)[0].tasks[0].remote.id, '44');
  assert.equal(journal.restore(initial(), 'https://other.example/projects/1')[0].tasks[0].remote, undefined);
  journal.clear(); assert.equal(map.size, 0);
});
