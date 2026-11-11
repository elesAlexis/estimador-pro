import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { toDateKey } from '../shared/calendarDate';
import { addBusinessDays, calculateSprintDates, isValidDuration } from './schedule';
import { decorateRemoteFields } from '../application/gitlab/remoteFields';

describe('isValidDuration', () => {
  it('acepta solo enteros mayores que cero', () => {
    assert.equal(isValidDuration(3), true);
    assert.equal(isValidDuration('2'), true);
    for (const value of [0, -1, 1.5, 'abc', null, undefined]) {
      assert.equal(isValidDuration(value), false, `duración ${value}`);
    }
  });
});

describe('addBusinessDays', () => {
  const holidaySet = new Set(['2026-03-23']);

  it('salta fines de semana y festivos', () => {
    // Viernes 20 + 1 día hábil: sábado, domingo y lunes 23 (festivo) no cuentan
    assert.equal(toDateKey(addBusinessDays('2026-03-20', 1, holidaySet)), '2026-03-24');
    assert.equal(toDateKey(addBusinessDays('2026-03-20', 1)), '2026-03-23');
  });
});

describe('calculateSprintDates', () => {
  const holidaySet = new Set(['2026-03-23']);
  const sprint = (tasks) => [{ id: 's1', name: 'Sprint', tasks }];

  it('encadena tareas en días hábiles, saltando fines de semana y festivos', () => {
    const [result] = calculateSprintDates(
      sprint([
        { id: 't1', duration: 2 },
        { id: 't2', duration: 1 },
      ]),
      '2026-03-20',
      holidaySet,
    );
    assert.deepEqual(
      result.tasks.map((t) => [t.calculatedStart, t.calculatedEnd]),
      [
        ['2026-03-20', '2026-03-24'],
        ['2026-03-25', '2026-03-25'],
      ],
    );
    assert.equal(result.sprintStart, '2026-03-20');
    assert.equal(result.sprintEnd, '2026-03-25');
  });

  it('continúa la cascada en el siguiente sprint', () => {
    const [first, second] = calculateSprintDates(
      [
        { id: 's1', name: 'Uno', tasks: [{ id: 't1', duration: 1 }] },
        { id: 's2', name: 'Dos', tasks: [{ id: 't2', duration: 1 }] },
      ],
      '2026-03-20',
      holidaySet,
    );
    assert.equal(first.sprintEnd, '2026-03-20');
    assert.equal(second.sprintStart, '2026-03-24');
  });

  it('empieza el siguiente día hábil si el inicio cae en fin de semana', () => {
    const [result] = calculateSprintDates(sprint([{ id: 't1', duration: 1 }]), '2026-03-21', holidaySet);
    assert.equal(result.tasks[0].calculatedStart, '2026-03-24');
  });

  it('deja sin fechas las tareas con duración inválida sin mover las siguientes', () => {
    const [result] = calculateSprintDates(
      sprint([
        { id: 't1', duration: 0 },
        { id: 't2', duration: 1 },
      ]),
      '2026-03-16',
      null,
    );
    assert.equal(result.tasks[0].calculatedStart, null);
    assert.equal(result.tasks[1].calculatedStart, '2026-03-16');
  });

  it('no calcula fechas con una fecha de inicio inválida', () => {
    const [result] = calculateSprintDates(sprint([{ id: 't1', duration: 1 }]), 'no-es-fecha', null);
    assert.equal(result.sprintStart, null);
    assert.equal(result.tasks[0].calculatedEnd, null);
  });
});

/**
 * Las tareas importadas de GitLab conservan sus fechas remotas en vez de
 * recalcularse en cascada. La regla tiene TRES estados según la presencia de la
 * clave `due_date` en el snapshot remoto, no solo según su valor — y dos de
 * ellos no estaban cubiertos. Estos tests los congelan antes del refactor:
 * el proyecto del usuario depende de que la distinción sobreviva.
 */
describe('fechas de tareas importadas', () => {
  const importada = (remote) => [{
    id: 's', tasks: [{
      id: 't', duration: 2, scheduleMode: 'imported',
      plannedStart: '2026-01-01', plannedEnd: '2026-01-05',
      ...(remote ? { remote } : {}),
    }],
  }];
  // Se proyecta primero, igual que hace ProjectContext: así el test cubre la
  // traducción del snapshot de GitLab Y su efecto en el cronograma.
  const fin = (remote) =>
    calculateSprintDates(decorateRemoteFields(importada(remote)), '2026-01-01', new Set())[0].tasks[0].calculatedEnd;

  it('la fecha de entrega de GitLab manda sobre la programada localmente', () => {
    assert.equal(fin({ base: { due_date: '2026-12-25' } }), '2026-12-25');
  });

  it('una entrega borrada en GitLab deja la tarea sin fin, no la recalcula', () => {
    // `due_date: null` significa "GitLab dice que no tiene fecha", distinto de "no hay dato".
    assert.equal(fin({ base: { due_date: null } }), null);
  });

  it('sin la clave due_date en el snapshot, vale la fecha programada local', () => {
    assert.equal(fin({ base: { title: 'x' } }), '2026-01-05');
  });

  it('una tarea importada sin vínculo remoto usa su fecha programada', () => {
    assert.equal(fin(undefined), '2026-01-05');
  });

  it('el inicio importado sale de plannedStart', () => {
    const [sprint] = calculateSprintDates(decorateRemoteFields(importada({ base: { due_date: '2026-12-25' } })), '2026-01-01', new Set());
    assert.equal(sprint.tasks[0].calculatedStart, '2026-01-01');
  });
});
