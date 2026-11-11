/**
 * La proyección es lo único que traduce el snapshot de GitLab a campos que el
 * dominio puede leer. Dos invariantes se prueban aquí: que la PRESENCIA de
 * `due_date` se conserva (no solo su valor) y que lo derivado nunca se persiste.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { decorateRemoteFields, remoteTaskEnd, remoteTaskModule } from './remoteFields';
import { normalizeSprints } from '../projectValidation';

const tareaCon = (base) => decorateRemoteFields([{ id: 's', tasks: [{ id: 't', ...(base ? { remote: { base } } : {}) }] }])[0].tasks[0];

test('remoteEnd distingue valor, nulo y ausencia de la clave', () => {
  assert.deepEqual(remoteTaskEnd({ due_date: '2026-12-25' }), { remoteEnd: '2026-12-25' });
  assert.deepEqual(remoteTaskEnd({ due_date: null }), { remoteEnd: null });
  // Sin la clave NO se escribe `remoteEnd: undefined`: la ausencia es la señal.
  assert.deepEqual(remoteTaskEnd({ title: 'x' }), {});
  assert.deepEqual(remoteTaskEnd(undefined), {});
});

test('la tarea proyectada conserva la ausencia como ausencia', () => {
  assert.ok(Object.hasOwn(tareaCon({ due_date: null }), 'remoteEnd'));
  assert.ok(!Object.hasOwn(tareaCon({ title: 'x' }), 'remoteEnd'));
  assert.ok(!Object.hasOwn(tareaCon(undefined), 'remoteEnd'));
});

test('moduleLabel sale de la etiqueta y conserva los dos puntos internos', () => {
  assert.deepEqual(remoteTaskModule({ labels: ['módulo: Pagos'] }), { moduleLabel: 'Pagos' });
  assert.deepEqual(remoteTaskModule({ labels: ['modulo:Ventas'] }), { moduleLabel: 'Ventas' });
  assert.deepEqual(remoteTaskModule({ labels: ['Módulo : Cobros'] }), { moduleLabel: 'Cobros' });
  assert.deepEqual(remoteTaskModule({ labels: ['módulo:Ventas:B2B'] }), { moduleLabel: 'Ventas:B2B' });
  assert.deepEqual(remoteTaskModule({ labels: ['módulo:'] }), {}, 'una etiqueta vacía no proyecta nada');
  assert.deepEqual(remoteTaskModule({ labels: ['bug'] }), {});
  assert.deepEqual(remoteTaskModule(undefined), {});
});

test('decorar no modifica los sprints originales', () => {
  const originales = [{ id: 's', tasks: [{ id: 't', remote: { base: { due_date: '2026-12-25' } } }] }];
  decorateRemoteFields(originales);
  assert.ok(!Object.hasOwn(originales[0].tasks[0], 'remoteEnd'));
});

/**
 * Esta es la garantía de la que depende todo el diseño: si un campo derivado
 * llegara a localStorage, quedaría rancio en cuanto RECORD_REMOTE reemplace el
 * snapshot tras una sincronización.
 */
test('los campos derivados NUNCA sobreviven al guardado', () => {
  const decorados = decorateRemoteFields([{
    id: 's-1', name: 'Sprint 1', tasks: [{
      id: 't-1', title: 'T', duration: 1, progress: 0,
      remote: { id: '11', target: 'https://gitlab.example.com/projects/1', updatedAt: '',
        base: { due_date: '2026-12-25', labels: ['módulo:Pagos'] } },
    }],
  }]);
  assert.equal(decorados[0].tasks[0].remoteEnd, '2026-12-25');
  assert.equal(decorados[0].tasks[0].moduleLabel, 'Pagos');

  const guardado = normalizeSprints(decorados)[0].tasks[0];
  assert.ok(!Object.hasOwn(guardado, 'remoteEnd'), 'normalizeSprints debe descartar remoteEnd');
  assert.ok(!Object.hasOwn(guardado, 'moduleLabel'), 'normalizeSprints debe descartar moduleLabel');
  // El snapshot original sí se conserva: de ahí se vuelve a derivar todo.
  assert.equal(guardado.remote.base.due_date, '2026-12-25');
  assert.deepEqual(guardado.remote.base.labels, ['módulo:Pagos']);
});
