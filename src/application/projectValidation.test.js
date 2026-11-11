import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isValidSprintList, sanitizeProjectInfo, normalizeProject, normalizeSprints } from './projectValidation';
import { BASE_TEMPLATE } from '../domain/templates';

describe('isValidSprintList', () => {
  it('acepta la plantilla base y la lista vacía', () => {
    assert.equal(isValidSprintList(BASE_TEMPLATE), true);
    assert.equal(isValidSprintList([]), true);
  });

  it('rechaza estructuras que romperían la app', () => {
    const invalid = [
      'x',
      null,
      {},
      [{ id: 's', name: 'S' }],
      [{ id: 's', name: 'S', tasks: [{ title: 't' }] }],
      [{ id: 's', name: 'S', tasks: [null] }],
      [{ id: 1, name: 'S', tasks: [] }],
    ];
    for (const value of invalid) {
      assert.equal(isValidSprintList(value), false, JSON.stringify(value));
    }
  });
});

describe('normalización de respaldos', () => {
  const project = task => ({ sprints: [{ id: 's', name: 'S', tasks: [{ id: 't', ...task }] }] });
  it('completa opcionales y conserva borradores', () => {
    for (const duration of [undefined, '', 0, '0']) {
      const task = normalizeProject(project({duration})).sprints[0].tasks[0];
      assert.equal(task.duration, 0);
      assert.equal(task.priority, 'media');
      assert.equal(task.description, '');
    }
  });
  it('conserva una copia validada de comentarios de GitLab', () => {
    const comments = [{ id: 1, body: 'Hecho', author: 'Ana', createdAt: '2026-09-15T10:00:00Z', internal: true }];
    assert.deepEqual(normalizeProject(project({ remoteComments: comments })).sprints[0].tasks[0].remoteComments, comments);
    assert.throws(() => normalizeProject(project({ remoteComments: [{ id: {}, body: 'x' }] })), /comentario 1/);
  });
  it('valida el marcador de entrega del producto', () => {
    const value = project({}); value.sprints[0].productDelivery = true;
    assert.equal(normalizeProject(value).sprints[0].productDelivery, true);
    value.sprints[0].productDelivery = 'sí';
    assert.throws(() => normalizeProject(value), /marcador de entrega/);
    const duplicated = project({}); duplicated.sprints.push({ ...duplicated.sprints[0], id: 's2' });
    duplicated.sprints.forEach(sprint => { sprint.productDelivery = true; });
    assert.throws(() => normalizeProject(duplicated), /solo uno/);
  });
  it('rechaza tipos, fechas, opciones y números incompatibles con ubicación', () => {
    for (const task of [{title:{}}, {role:[]}, {type:'otro'}, {priority:'urgente'}, {progress:101}, {duration:-1}, {duration:1.5}, {duration:1e15}, {realStart:'2026-02-30'}, {realStart:'2026-10-10',realEnd:'2026-10-01'}]) {
      assert.throws(() => normalizeProject(project(task)), /Sprint 1, tarea 1/);
    }
    assert.throws(() => normalizeProject({...project({}),projectInfo:{startDate:'ayer'}}), /fecha/);
  });
  it('rechaza identificadores vacíos y repetidos sin modificar entrada', () => {
    const value = project({});
    value.sprints[0].tasks.push({id:'t'});
    assert.throws(() => normalizeProject(value), /duplicado/);
    assert.equal(value.sprints[0].tasks.length, 2);
    assert.throws(() => normalizeProject(project({id:' '})), /identificador/);
    assert.throws(() => normalizeProject({sprints:[...project({}).sprints,...project({}).sprints]}), /duplicado/);
  });
});

describe('sanitizeProjectInfo', () => {
  const fallback = { name: 'Base', client: '', startDate: '2026-01-01', manager: '', status: 'planeacion' };

  it('usa el valor por defecto si la entrada no es un objeto', () => {
    assert.deepEqual(sanitizeProjectInfo(123, fallback), fallback);
    assert.deepEqual(sanitizeProjectInfo(null, fallback), fallback);
  });

  it('copia solo campos conocidos de tipo texto', () => {
    const result = sanitizeProjectInfo({ name: 'X', startDate: 5, client: 'Mi Empresa', extra: 1 }, fallback);
    assert.equal(result.name, 'X');
    assert.equal(result.startDate, '2026-01-01');
    assert.equal(result.client, 'Mi Empresa');
    assert.equal('extra' in result, false);
  });
});

/**
 * `remoteLink` no es solo una barrera de seguridad: el ORDEN que impone a
 * `labels` y `assignee_ids` es parte del motor de fusión. `remoteSnapshot`
 * también ordena, y `threeWayChanges` compara con JSON.stringify; si el
 * snapshot guardado volviera desordenado, cada recarga inventaría un cambio y
 * un conflicto falsos. Estos tests fijan ese contrato antes de moverlo.
 */
describe('snapshot remoto persistido', () => {
  const normalizar = (base) => normalizeSprints([{
    id: 's-1', name: 'S', tasks: [{ id: 't-1', title: 'T', duration: 1, progress: 0,
      remote: { id: '11', target: 'https://gitlab.example.com/projects/1', updatedAt: '2026-01-01T00:00:00Z', base } }],
  }])[0].tasks[0].remote.base;

  it('ordena etiquetas y responsables, que es de lo que depende la fusión', () => {
    const base = normalizar({ labels: ['zeta', 'alfa'], assignee_ids: [9, 2, 9] });
    assert.deepEqual(base.labels, ['alfa', 'zeta']);
    assert.deepEqual(base.assignee_ids, [2, 9], 'también deduplica');
  });

  it('conserva due_date nulo y la AUSENCIA de la clave por separado', () => {
    assert.equal(normalizar({ due_date: null }).due_date, null);
    assert.ok(!Object.hasOwn(normalizar({ title: 'x' }), 'due_date'),
      'sin la clave, no debe aparecer: es el tercer estado que lee schedule.js');
  });

  it('descarta campos desconocidos del snapshot', () => {
    assert.ok(!Object.hasOwn(normalizar({ title: 'x', inventado: 'malicioso' }), 'inventado'));
  });

  it('rechaza un milestone_id que no sea un entero positivo', () => {
    assert.throws(() => normalizar({ milestone_id: '12' }), /milestone inválido/);
    assert.equal(normalizar({ milestone_id: null }).milestone_id, null);
  });
});
