import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateColombianHolidays, getHolidayName, getHolidaysNear, isHoliday } from './holidays';

describe('calculateColombianHolidays', () => {
  it('devuelve los 18 festivos ordenados para cada año', () => {
    for (let year = 2020; year <= 2035; year++) {
      const dates = calculateColombianHolidays(year).map((h) => h.date);
      assert.equal(dates.length, 18, `año ${year}`);
      assert.deepEqual(dates, [...dates].sort(), `orden en ${year}`);
    }
  });

  it('permite que dos festivos coincidan en la misma fecha (2025)', () => {
    // En 2025 San Pedro y San Pablo (29 jun, domingo → lunes 30) coincide con el
    // Sagrado Corazón (Pascua + 71 días = 30 jun): 18 festivos en 17 fechas.
    const holidays = calculateColombianHolidays(2025);
    const onJune30 = holidays.filter((h) => h.date === '2025-06-30').map((h) => h.name);
    assert.deepEqual(onJune30.sort(), ['Sagrado Corazón', 'San Pedro y San Pablo']);
    assert.equal(new Set(holidays.map((h) => h.date)).size, 17);
  });

  it('calcula el calendario oficial de 2026 (Pascua el 5 de abril)', () => {
    const dates = calculateColombianHolidays(2026).map((h) => h.date);
    assert.deepEqual(dates, [
      '2026-01-01', '2026-01-12', '2026-03-23', '2026-04-02', '2026-04-03', '2026-05-01',
      '2026-05-18', '2026-06-08', '2026-06-15', '2026-06-29', '2026-07-20', '2026-08-07',
      '2026-08-17', '2026-10-12', '2026-11-02', '2026-11-16', '2026-12-08', '2026-12-25',
    ]);
  });

  it('mueve al lunes los festivos de Ley Emiliani y deja fijos los demás', () => {
    const holidays = calculateColombianHolidays(2026);
    const byName = Object.fromEntries(holidays.map((h) => [h.name, h.date]));
    assert.equal(byName['Día de los Reyes Magos'], '2026-01-12'); // 6 de enero cae martes
    assert.equal(byName['Navidad'], '2026-12-25'); // fijo aunque caiga viernes
  });
});

describe('isHoliday', () => {
  const holidaySet = new Set(['2026-03-23']);

  it('acepta claves YYYY-MM-DD y objetos Date', () => {
    assert.equal(isHoliday('2026-03-23', holidaySet), true);
    assert.equal(isHoliday(new Date(2026, 2, 23), holidaySet), true);
    assert.equal(isHoliday('2026-03-24', holidaySet), false);
  });

  it('devuelve false sin festivos cargados', () => {
    assert.equal(isHoliday('2026-03-23', new Set()), false);
    assert.equal(isHoliday('2026-03-23', null), false);
  });
});

describe('getHolidayName', () => {
  const holidayList = calculateColombianHolidays(2026);

  it('encuentra el nombre por fecha', () => {
    assert.equal(getHolidayName(new Date(2026, 3, 2), holidayList), 'Jueves Santo');
    assert.equal(getHolidayName('2026-12-25', holidayList), 'Navidad');
  });

  it('devuelve null si la fecha no es festivo', () => {
    assert.equal(getHolidayName('2026-01-02', holidayList), null);
    assert.equal(getHolidayName('2026-01-01', []), null);
  });
});

describe('getHolidaysNear', () => {
  const holidayList = calculateColombianHolidays(2026);

  it('incluye festivos dentro del margen alrededor de la tarea', () => {
    // Tarea del martes 24 al jueves 26 de marzo; el lunes 23 es San José
    const names = getHolidaysNear(holidayList, '2026-03-24', '2026-03-26', 2).map((h) => h.name);
    assert.deepEqual(names, ['Día de San José']);
  });

  it('excluye festivos fuera del margen', () => {
    assert.deepEqual(getHolidaysNear(holidayList, '2026-03-26', '2026-03-27', 2), []);
  });

  it('devuelve vacío sin fechas o sin festivos', () => {
    assert.deepEqual(getHolidaysNear(holidayList, null, '2026-03-26', 2), []);
    assert.deepEqual(getHolidaysNear([], '2026-03-24', '2026-03-26', 2), []);
  });
});
