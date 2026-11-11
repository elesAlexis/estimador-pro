/**
 * Las claves de estos catálogos son datos de negocio (las valida
 * projectValidation) y su ORDEN define el orden de los <option> en TaskRow y de
 * la leyenda del Gantt. La fase 2 reconstruye estos objetos mezclando etiquetas
 * del dominio con el tema visual: sin este test, un reordenamiento silencioso de
 * la interfaz pasaría tanto `npm test` como `npm run build`.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TASK_TYPES, PRIORITY_CONFIG, PROJECT_STATUS } from './templateData';

describe('catálogos de tipos y prioridades', () => {
  it('conserva las claves y su orden exacto', () => {
    assert.deepEqual(Object.keys(TASK_TYPES), ['dev', 'review', 'deploy', 'qa']);
    assert.deepEqual(Object.keys(PRIORITY_CONFIG), ['alta', 'media', 'baja']);
  });

  it('conserva las etiquetas visibles', () => {
    assert.deepEqual(Object.values(TASK_TYPES).map(t => t.label),
      ['Desarrollo', 'Revisión', 'Despliegue', 'Pruebas']);
    assert.deepEqual(Object.values(PRIORITY_CONFIG).map(p => p.label), ['Alta', 'Media', 'Baja']);
  });

  it('cada tipo conserva su juego completo de campos visuales', () => {
    for (const [clave, tipo] of Object.entries(TASK_TYPES)) {
      assert.deepEqual(Object.keys(tipo).sort(), ['bgClass', 'color', 'label'], `tipo ${clave}`);
      assert.match(tipo.color, /^#[0-9a-f]{6}$/i, `color de ${clave}`);
    }
    for (const [clave, prioridad] of Object.entries(PRIORITY_CONFIG)) {
      assert.deepEqual(Object.keys(prioridad).sort(), ['bg', 'border', 'color', 'icon', 'label'], `prioridad ${clave}`);
    }
  });

  it('los estados de proyecto conservan sus claves', () => {
    assert.deepEqual(PROJECT_STATUS.map(s => s.value), ['planeacion', 'en_curso', 'en_pausa', 'finalizado']);
  });
});
