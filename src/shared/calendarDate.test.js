import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getCalendarDayDifference,
  isValidCalendarDate,
  isWeekend,
  parseCalendarDate,
  shiftDateKey,
  toDateKey,
} from './calendarDate';

describe('parseCalendarDate / toDateKey', () => {
  it('conserva el día civil sin corrimiento por zona horaria', () => {
    assert.equal(toDateKey(parseCalendarDate('2026-03-16')), '2026-03-16');
    assert.equal(parseCalendarDate('2026-03-16').getDate(), 16);
  });

  it('rechaza fechas imposibles en vez de normalizarlas', () => {
    assert.equal(isValidCalendarDate('2026-02-30'), false);
    assert.equal(toDateKey('2026-02-30'), '');
    assert.equal(isValidCalendarDate(''), false);
  });
});

describe('shiftDateKey', () => {
  it('desplaza días de calendario cruzando meses y años', () => {
    assert.equal(shiftDateKey('2026-03-30', 3), '2026-04-02');
    assert.equal(shiftDateKey('2026-01-01', -1), '2025-12-31');
  });

  it('devuelve cadena vacía con una fecha inválida', () => {
    assert.equal(shiftDateKey('no-es-fecha', 1), '');
  });
});

describe('getCalendarDayDifference / isWeekend', () => {
  it('cuenta días civiles entre dos fechas', () => {
    assert.equal(getCalendarDayDifference('2026-03-01', '2026-04-01'), 31);
    assert.equal(getCalendarDayDifference('2026-04-01', '2026-03-01'), -31);
  });

  it('reconoce sábados y domingos', () => {
    assert.equal(isWeekend('2026-03-21'), true);
    assert.equal(isWeekend('2026-03-22'), true);
    assert.equal(isWeekend('2026-03-23'), false);
  });
});
