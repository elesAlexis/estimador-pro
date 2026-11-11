/**
 * El registro de vínculos es la red que evita duplicar issues cuando una
 * escritura remota termina pero el guardado local no. No tenía test propio: su
 * cobertura viajaba dentro de application/gitlabSync.test.js.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createGitlabJournal } from './gitlabJournal';

const almacenFalso = (inicial = {}) => {
  const datos = new Map(Object.entries(inicial));
  return {
    getItem: (clave) => (datos.has(clave) ? datos.get(clave) : null),
    setItem: (clave, valor) => datos.set(clave, valor),
    removeItem: (clave) => datos.delete(clave),
    volcado: () => Object.fromEntries(datos),
  };
};

const destino = 'https://gitlab.example.com/projects/1';
const vinculo = { id: '11', target: destino, updatedAt: '2026-03-01T00:00:00Z', base: { title: 'A' } };

test('restore devuelve los sprints intactos cuando no hay nada registrado', () => {
  const journal = createGitlabJournal(almacenFalso());
  const sprints = [{ id: 's-1', tasks: [{ id: 't-1' }] }];

  const resultado = journal.restore(sprints, destino);

  assert.equal(resultado[0].remote, undefined);
  assert.equal(resultado[0].tasks[0].remote, undefined);
});

test('un issue registrado se recupera en el sprint y la tarea correctos', () => {
  const almacen = almacenFalso();
  const journal = createGitlabJournal(almacen);

  journal.record({ target: destino, kind: 'issue', sprintId: 's-1', localId: 't-1' }, vinculo);
  const resultado = journal.restore([{ id: 's-1', tasks: [{ id: 't-1' }, { id: 't-2' }] }], destino);

  assert.deepEqual(resultado[0].tasks[0].remote, vinculo);
  assert.equal(resultado[0].tasks[1].remote, undefined, 'no contamina las demás tareas');
  assert.equal(resultado[0].remote, undefined, 'un issue no vincula el milestone del sprint');
});

test('un milestone registrado se recupera en el sprint', () => {
  const journal = createGitlabJournal(almacenFalso());

  journal.record({ target: destino, kind: 'milestone', sprintId: 's-1', localId: 's-1' }, vinculo);
  const resultado = journal.restore([{ id: 's-1', tasks: [] }], destino);

  assert.deepEqual(resultado[0].remote, vinculo);
});

test('el vínculo ya presente en el proyecto gana sobre el registrado', () => {
  const journal = createGitlabJournal(almacenFalso());
  const enMemoria = { ...vinculo, id: '99' };

  journal.record({ target: destino, kind: 'issue', sprintId: 's-1', localId: 't-1' }, vinculo);
  const resultado = journal.restore([{ id: 's-1', tasks: [{ id: 't-1', remote: enMemoria }] }], destino);

  assert.deepEqual(resultado[0].tasks[0].remote, enMemoria);
});

test('los vínculos de otro destino no se aplican', () => {
  const journal = createGitlabJournal(almacenFalso());

  journal.record({ target: destino, kind: 'issue', sprintId: 's-1', localId: 't-1' }, vinculo);
  const resultado = journal.restore([{ id: 's-1', tasks: [{ id: 't-1' }] }], 'https://otro.example.com/projects/1');

  assert.equal(resultado[0].tasks[0].remote, undefined);
});

test('tareas con el mismo id en sprints distintos no se confunden', () => {
  const journal = createGitlabJournal(almacenFalso());

  journal.record({ target: destino, kind: 'issue', sprintId: 's-1', localId: 't-1' }, vinculo);
  const resultado = journal.restore([
    { id: 's-1', tasks: [{ id: 't-1' }] },
    { id: 's-2', tasks: [{ id: 't-1' }] },
  ], destino);

  assert.deepEqual(resultado[0].tasks[0].remote, vinculo);
  assert.equal(resultado[1].tasks[0].remote, undefined);
});

test('un registro corrupto se denuncia en vez de perderse en silencio', () => {
  const journal = createGitlabJournal(almacenFalso({ ep_gitlab_bindings_v1: '["no","es","un","objeto"]' }));

  assert.throws(() => journal.restore([], destino), /No se pudo leer el registro de sincronización/);
});

test('clear borra el registro completo', () => {
  const almacen = almacenFalso();
  const journal = createGitlabJournal(almacen);

  journal.record({ target: destino, kind: 'issue', sprintId: 's-1', localId: 't-1' }, vinculo);
  journal.clear();

  assert.deepEqual(almacen.volcado(), {});
  assert.equal(journal.restore([{ id: 's-1', tasks: [{ id: 't-1' }] }], destino)[0].tasks[0].remote, undefined);
});

/**
 * En modo privado el navegador puede lanzar SecurityError al tocar
 * localStorage. Antes eso reventaba dentro de la sincronización; ahora el
 * registro se degrada y lo anuncia.
 */
test('sin almacenamiento disponible el registro se degrada en vez de reventar', () => {
  const journal = createGitlabJournal(null);
  const sprints = [{ id: 's-1', tasks: [{ id: 't-1' }] }];

  assert.equal(journal.available, false);
  assert.doesNotThrow(() => journal.record({ target: destino, kind: 'issue', sprintId: 's-1', localId: 't-1' }, vinculo));
  assert.doesNotThrow(() => journal.clear());
  assert.deepEqual(journal.restore(sprints, destino), sprints, 'devuelve los sprints intactos');
});

test('con almacenamiento disponible lo anuncia', () => {
  assert.equal(createGitlabJournal(almacenFalso()).available, true);
});
