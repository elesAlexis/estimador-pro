import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { exportDisabledReason } from './exportReadiness';

const listo = { hasValidStartDate: true, invalidTaskCount: 0, calendarReady: true, holidaySource: 'api', totalTasks: 3 };

describe('exportDisabledReason', () => {
  it('no informa obstáculos cuando todo está listo', () => {
    assert.equal(exportDisabledReason(listo), '');
  });

  it('informa un solo obstáculo, el primero en orden de importancia', () => {
    assert.match(exportDisabledReason({ ...listo, hasValidStartDate: false, invalidTaskCount: 5 }), /fecha de inicio/);
    assert.match(exportDisabledReason({ ...listo, invalidTaskCount: 5, totalTasks: 0 }), /duraciones pendientes/);
  });

  it('distingue el calendario cargando del calendario caído', () => {
    assert.match(exportDisabledReason({ ...listo, calendarReady: false, holidaySource: 'loading' }), /Espera/);
    assert.match(exportDisabledReason({ ...listo, calendarReady: false, holidaySource: 'error' }), /no está disponible/);
  });

  it('un proyecto sin tareas no se puede exportar', () => {
    assert.match(exportDisabledReason({ ...listo, totalTasks: 0 }), /al menos una tarea/);
  });
});
