import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calendarYearRange } from './calendarRange';

const sprint = (tasks) => [{ id: 's', tasks }];

describe('calendarYearRange', () => {
  it('sin fecha de inicio válida no hay rango que cargar', () => {
    assert.equal(calendarYearRange('', sprint([])), null);
    assert.equal(calendarYearRange('no-es-fecha', sprint([])), null);
  });

  it('un proyecto corto igual reserva algo más de un año de margen', () => {
    // El piso de 370 días evita recargar festivos por cada tarea que se agrega.
    assert.deepEqual(calendarYearRange('2026-01-01', sprint([{ duration: 1 }])), { start: 2026, end: 2027 });
  });

  it('un proyecto largo estira el final proporcionalmente', () => {
    const rango = calendarYearRange('2026-01-01', sprint([{ duration: 500 }]));
    assert.equal(rango.start, 2026);
    assert.ok(rango.end >= 2028, `el rango debería cubrir el doble de la duración, dio ${rango.end}`);
  });

  it('las fechas importadas amplían el rango hacia atrás y hacia adelante', () => {
    const rango = calendarYearRange('2026-01-01', [{ id: 's', plannedStart: '2019-05-01', tasks: [
      { duration: 1, remoteEnd: '2031-08-09' },
    ] }]);
    assert.deepEqual(rango, { start: 2019, end: 2031 });
  });

  it('ignora fechas inválidas en vez de romper el rango', () => {
    const rango = calendarYearRange('2026-01-01', [{ id: 's', plannedStart: 'basura', plannedEnd: null, tasks: [
      { duration: 1, remoteEnd: null, plannedEnd: '' },
    ] }]);
    assert.deepEqual(rango, { start: 2026, end: 2027 });
  });

  it('una duración absurda no produce un rango imposible', () => {
    assert.equal(calendarYearRange('9999-01-01', sprint([{ duration: 36500 }])), null);
  });
});
