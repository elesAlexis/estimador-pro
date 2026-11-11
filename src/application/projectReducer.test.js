import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { bindProjectActions, projectActions as actions } from './projectActions';
import { sprintReducer } from './projectReducer';

const reduce = (state, ...list) => list.reduce(sprintReducer, state);

it('confirma fechas en una transición y las conserva al cambiar la duración', () => {
  const initial = reduce([], actions.loadTemplate());
  const sprint = initial[0], task = sprint.tasks[0];
  const updated = reduce(initial, actions.setRealDates(sprint.id, task.id, '2026-12-24', '2026-12-28'));
  assert.equal(updated[0].tasks[0].realStart, '2026-12-24');
  assert.equal(updated[0].tasks[0].realEnd, '2026-12-28');
  const changed = reduce(updated, actions.updateTask(sprint.id, task.id, 'duration', 8));
  assert.equal(changed[0].tasks[0].realEnd, '2026-12-28');
  assert.equal(changed[0].tasks[0].realStart, '2026-12-24');
  assert.equal(reduce(updated, actions.setRealDates(sprint.id, task.id, '2026-12-30', '2026-12-24')), updated);
  assert.equal(reduce(updated, actions.setRealDates(sprint.id, task.id, 'inválida', '2026-12-24')), updated);
});

const twoSprints = () => [
  { id: 's1', name: 'Uno', tasks: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] },
  { id: 's2', name: 'Dos', tasks: [{ id: 'd' }] },
];

describe('sprints', () => {
  it('agrega un sprint con el ID que genera la acción', () => {
    const action = actions.addSprint();
    const [sprint] = reduce([], action);
    assert.match(sprint.id, /^sprint-/);
    assert.equal(sprint.id, action.payload.sprintId);
    assert.deepEqual(sprint.tasks, []);
  });

  it('numera los sprints nuevos sin repetir nombres', () => {
    const state = reduce([], actions.addSprint(), actions.addSprint(), actions.addSprint());
    assert.deepEqual(state.map((s) => s.name), ['Sprint 1', 'Sprint 2', 'Sprint 3']);
  });

  it('renombra y elimina sprints', () => {
    const state = reduce(twoSprints(), actions.renameSprint('s2', 'Cierre'), actions.removeSprint('s1'));
    assert.deepEqual(state.map((s) => s.name), ['Cierre']);
  });

  it('clona un sprint justo después del original con IDs nuevos', () => {
    const state = reduce(twoSprints(), actions.cloneSprint('s1'));
    assert.deepEqual(state.map((s) => s.name), ['Uno', 'Uno (Copia)', 'Dos']);
    const cloneIds = state[1].tasks.map((t) => t.id);
    assert.equal(new Set([...cloneIds, 'a', 'b', 'c']).size, 6);
  });

  it('reordena sprints', () => {
    const state = reduce(twoSprints(), actions.moveSprint(0, 1));
    assert.deepEqual(state.map((s) => s.id), ['s2', 's1']);
  });

  it('ignora cargas con una estructura inválida', () => {
    const initial = twoSprints();
    assert.equal(sprintReducer(initial, actions.loadSprints('x')), initial);
    assert.deepEqual(sprintReducer(initial, actions.loadSprints([])), []);
  });

  it('carga la plantilla como una copia independiente', () => {
    const first = reduce([], actions.loadTemplate());
    first[0].name = 'modificado';
    const second = reduce([], actions.loadTemplate());
    assert.notEqual(second[0].name, 'modificado');
  });
});

describe('tareas', () => {
  it('agrega una tarea en blanco con valores por defecto', () => {
    const [sprint] = reduce([{ id: 's1', name: 'S', tasks: [] }], actions.addTask('s1'));
    assert.equal(sprint.tasks[0].title, 'Nueva Tarea');
    assert.equal(sprint.tasks[0].duration, 1);
  });

  it('agrega una tarea desde plantilla completando los campos faltantes', () => {
    const template = { title: 'Despliegue', role: 'DevOps', duration: 1, type: 'deploy' };
    const [sprint] = reduce([{ id: 's1', name: 'S', tasks: [] }], actions.addTask('s1', template));
    assert.equal(sprint.tasks[0].title, 'Despliegue');
    assert.equal(sprint.tasks[0].priority, 'media');
    assert.equal(sprint.tasks[0].progress, 0);
  });

  it('actualiza y elimina tareas', () => {
    const state = reduce(twoSprints(), actions.updateTask('s1', 'a', 'title', 'Nuevo'), actions.removeTask('s1', 'b'));
    assert.deepEqual(state[0].tasks, [{ id: 'a', title: 'Nuevo' }, { id: 'c' }]);
  });

  it('mueve una tarea dentro del mismo sprint', () => {
    const state = reduce(twoSprints(), actions.moveTask({ taskId: 'a', sourceSprintId: 's1', targetSprintId: 's1', targetIndex: 2 }));
    assert.deepEqual(state[0].tasks.map((t) => t.id), ['b', 'c', 'a']);
  });

  it('mueve una tarea a otro sprint en la posición indicada', () => {
    const state = reduce(twoSprints(), actions.moveTask({ taskId: 'b', sourceSprintId: 's1', targetSprintId: 's2', targetIndex: 0 }));
    assert.deepEqual(state[0].tasks.map((t) => t.id), ['a', 'c']);
    assert.deepEqual(state[1].tasks.map((t) => t.id), ['b', 'd']);
  });

  it('no cambia el estado si la tarea no existe', () => {
    const initial = twoSprints();
    const action = actions.moveTask({ taskId: 'zzz', sourceSprintId: 's1', targetSprintId: 's2', targetIndex: 0 });
    assert.equal(sprintReducer(initial, action), initial);
  });
  it('conserva la tarea si el destino no existe y evita colisiones entre sprints', () => {
    const initial = twoSprints();
    assert.equal(sprintReducer(initial, actions.moveTask({taskId:'a',sourceSprintId:'s1',targetSprintId:'no-existe',targetIndex:0})),initial);
    initial[1].tasks.push({id:'a'});
    const next=sprintReducer(initial,actions.moveTask({taskId:'a',sourceSprintId:'s1',targetSprintId:'s2',targetIndex:0}));
    assert.equal(next[0].tasks.length,2);
    assert.equal(new Set(next[1].tasks.map(t=>t.id)).size,3);
  });
  it('rechaza cambios de identificador e índices de sprint fuera de rango', () => {
    const initial=twoSprints();
    assert.equal(sprintReducer(initial,actions.updateTask('s1','a','id','b')),initial);
    assert.equal(sprintReducer(initial,actions.moveSprint(-1,1)),initial);
    assert.equal(sprintReducer(initial,actions.moveSprint(0,99)),initial);
  });
  it('guarda comentarios de GitLab en una sola transición validada', () => {
    const initial = [{ id: 's1', name: 'Uno', tasks: [{ id: 'a', title: 'Tarea' }] }];
    const comments = [{ id: 8, body: 'Validado', author: 'Ana', createdAt: '2026-09-15T10:00:00Z', internal: false }];
    const next = reduce(initial, actions.cacheIssueComments([{ sprintId: 's1', taskId: 'a', comments }]));
    assert.deepEqual(next[0].tasks[0].remoteComments, comments);
    assert.equal(reduce(initial, actions.cacheIssueComments([{ sprintId: 's1', taskId: 'a', comments: 'inválido' }])), initial);
  });
  it('mantiene un único sprint como entrega del producto', () => {
    const initial = twoSprints();
    const first = reduce(initial, actions.setProductDeliverySprint('s1'));
    assert.equal(first[0].productDelivery, true);
    const moved = reduce(first, actions.setProductDeliverySprint('s2'));
    assert.deepEqual(moved.map(sprint => Boolean(sprint.productDelivery)), [false, true]);
    assert.deepEqual(reduce(moved, actions.setProductDeliverySprint('s2')).map(sprint => Boolean(sprint.productDelivery)), [false, false]);
  });
});

describe('pureza', () => {
  it('la misma acción sobre el mismo estado produce el mismo resultado', () => {
    const initial = twoSprints();
    const action = actions.cloneSprint('s1');
    assert.deepEqual(sprintReducer(initial, action), sprintReducer(initial, action));
    assert.deepEqual(initial, twoSprints()); // no muta la entrada
  });
});

describe('bindProjectActions', () => {
  it('despacha las acciones creadas sin exponer su forma', () => {
    const dispatched = [];
    const bound = bindProjectActions((action) => dispatched.push(action));
    bound.removeTask('s1', 't1');
    assert.deepEqual(dispatched, [actions.removeTask('s1', 't1')]);
  });
});
