import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { toDateKey } from '../../shared/calendarDate';
import {
  buildGanttTimeline,
  getBarPlacement,
  getDayColumn,
  getDayKind,
  groupDatesByMonth,
  getTaskRanges,
  getScheduleComparison,
} from './ganttTimeline';

const sprints = (tasks) => [{ id: 's1', tasks }];

it('distingue fechas confirmadas, retraso, adelanto y cambios solo de inicio', () => {
  const plan = { calculatedStart: '2026-12-24', calculatedEnd: '2026-12-28' };
  assert.equal(getScheduleComparison(plan).differs, false);
  assert.equal(getScheduleComparison({ ...plan, realStart: '2026-12-24', realEnd: '2026-12-28' }).differs, false);
  assert.match(getScheduleComparison({ ...plan, realStart: '2026-12-24', realEnd: '2026-12-30' }).label, /2 días calendario después/);
  assert.match(getScheduleComparison({ ...plan, realStart: '2026-12-24', realEnd: '2026-12-26' }).label, /2 días calendario antes/);
  assert.deepEqual(getScheduleComparison({ ...plan, realStart: '2026-12-25', realEnd: '2026-12-28' }),
    { differs: true, label: 'Inicio diferente; fin según lo programado' });
});

describe('getTaskRanges', () => {
  it('no presenta las fechas programadas como fechas reales', () => {
    const task = { calculatedStart: '2026-12-24', calculatedEnd: '2026-12-28' };
    assert.deepEqual(getTaskRanges(task), { planned: { start: task.calculatedStart, end: task.calculatedEnd }, actual: null });
    assert.equal(getTaskRanges({ ...task, realStart: '2026-12-24' }).actual, null);
  });
  it('muestra solo rangos reales completos y válidos', () => {
    assert.deepEqual(getTaskRanges({ realStart: '2026-12-24', realEnd: '2026-12-28' }).actual,
      { start: '2026-12-24', end: '2026-12-28' });
    assert.equal(getTaskRanges({ realStart: '2026-12-28', realEnd: '2026-12-24' }).actual, null);
    assert.equal(getTaskRanges({ realStart: 'inválida', realEnd: '2026-12-24' }).actual, null);
    assert.deepEqual(getTaskRanges({ duration: 0 }), { planned: null, actual: null });
  });
});

describe('buildGanttTimeline', () => {
  it('muestra desde 2 días antes del inicio hasta 7 días después del fin', () => {
    const { dates, minDate, totalDays } = buildGanttTimeline(
      sprints([{ calculatedStart: '2026-03-16', calculatedEnd: '2026-03-20' }]),
      '2026-03-16',
    );
    assert.equal(toDateKey(dates[0]), '2026-03-14');
    assert.equal(toDateKey(dates[dates.length - 1]), '2026-03-27');
    assert.equal(totalDays, 14);
    assert.equal(toDateKey(minDate), '2026-03-14');
  });

  it('amplía el rango con las fechas reales', () => {
    const { dates } = buildGanttTimeline(
      sprints([{ calculatedStart: '2026-03-16', calculatedEnd: '2026-03-20', realStart: '2026-03-10', realEnd: '2026-04-01' }]),
      '2026-03-16',
    );
    assert.equal(toDateKey(dates[0]), '2026-03-08');
    assert.equal(toDateKey(dates[dates.length - 1]), '2026-04-08');
  });

  it('queda vacío sin sprints o con una fecha de inicio inválida', () => {
    assert.equal(buildGanttTimeline([], '2026-03-16').totalDays, 0);
    assert.equal(buildGanttTimeline(sprints([]), 'no-es-fecha').totalDays, 0);
  });
});

describe('groupDatesByMonth', () => {
  it('agrupa días consecutivos por mes', () => {
    const { dates } = buildGanttTimeline(
      sprints([{ calculatedStart: '2026-03-16', calculatedEnd: '2026-04-01' }]),
      '2026-03-16',
    );
    const months = groupDatesByMonth(dates);
    assert.equal(months.length, 2);
    assert.match(months[0].name, /marzo/);
    assert.match(months[1].name, /abril/);
    assert.equal(months[0].span + months[1].span, dates.length);
    assert.equal(months[1].span, 8); // 1 al 8 de abril
  });
});

describe('getDayColumn / getBarPlacement', () => {
  const minDate = new Date(2026, 2, 14);

  it('ubica cada fecha en su columna (1 = primer día visible)', () => {
    assert.equal(getDayColumn(minDate, '2026-03-14'), 1);
    assert.equal(getDayColumn(minDate, '2026-03-16'), 3);
    assert.equal(getDayColumn(minDate, null), 1);
  });

  it('calcula la columna inicial y el ancho de una barra', () => {
    assert.deepEqual(getBarPlacement(minDate, '2026-03-16', '2026-03-20'), { startCol: 3, span: 5 });
    assert.deepEqual(getBarPlacement(minDate, '2026-03-20', '2026-03-16'), { startCol: 7, span: 1 });
  });
});

describe('getDayKind', () => {
  const holidaySet = new Set(['2026-03-23']);

  it('distingue festivos, fines de semana y días hábiles', () => {
    assert.equal(getDayKind(new Date(2026, 2, 23), holidaySet), 'holiday');
    assert.equal(getDayKind(new Date(2026, 2, 21), holidaySet), 'weekend');
    assert.equal(getDayKind(new Date(2026, 2, 24), holidaySet), 'workday');
  });
});
