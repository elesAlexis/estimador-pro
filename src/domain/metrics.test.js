import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateProgress,
  calculateProjectTotals,
  getTaskDuration,
  getTaskProgress,
  sumDurations,
  getSprintCompletion,
} from './metrics';

it('un sprint requiere todas las tareas completas, incluso si el avance redondea a 100', () => {
  const tasks = [{ duration: 100, progress: 100 }, { duration: 1, progress: 99 }];
  assert.equal(calculateProgress(tasks), 100);
  assert.deepEqual(getSprintCompletion(tasks), { completed: 1, isComplete: false });
  assert.deepEqual(getSprintCompletion([]), { completed: 0, isComplete: false });
  assert.equal(getSprintCompletion([{ progress: 100, duration: 0 }]).isComplete, true);
  assert.equal(getSprintCompletion([{ progress: 100 }, { progress: 100 }]).isComplete, true);
});

describe('getTaskDuration', () => {
  it('cuenta solo enteros mayores que cero', () => {
    assert.equal(getTaskDuration({ duration: 3 }), 3);
    assert.equal(getTaskDuration({ duration: '2' }), 2);
    for (const duration of [0, -1, 1.5, 'abc', undefined, null]) {
      assert.equal(getTaskDuration({ duration }), 0, `duración ${duration}`);
    }
  });
});

describe('getTaskProgress', () => {
  it('acota el avance entre 0 y 100', () => {
    assert.equal(getTaskProgress({ progress: 40 }), 40);
    assert.equal(getTaskProgress({ progress: '75' }), 75);
    assert.equal(getTaskProgress({ progress: 150 }), 100);
    assert.equal(getTaskProgress({ progress: -5 }), 0);
    assert.equal(getTaskProgress({}), 0);
  });
});

describe('calculateProgress', () => {
  it('pondera el avance por duración', () => {
    const tasks = [
      { duration: 1, progress: 100 },
      { duration: 3, progress: 0 },
    ];
    assert.equal(calculateProgress(tasks), 25);
  });

  it('ignora tareas con duración inválida', () => {
    const tasks = [
      { duration: 2, progress: 50 },
      { duration: 0, progress: 100 },
    ];
    assert.equal(calculateProgress(tasks), 50);
  });

  it('devuelve 0 sin días contables', () => {
    assert.equal(calculateProgress([]), 0);
    assert.equal(calculateProgress([{ duration: 0, progress: 100 }]), 0);
  });
});

describe('calculateProjectTotals', () => {
  const sprints = [
    {
      id: 's1',
      tasks: [
        { role: 'QA', type: 'qa', duration: 2, progress: 100, calculatedEnd: '2026-03-17' },
        { role: 'Backend', type: 'dev', duration: 3, progress: 0, calculatedEnd: '2026-03-20' },
      ],
    },
    {
      id: 's2',
      tasks: [
        { role: 'QA', type: 'qa', duration: 1, progress: 0, calculatedEnd: '2026-03-23' },
        { role: 'Backend', type: 'dev', duration: 0, progress: 100, calculatedEnd: null },
      ],
    },
  ];

  it('suma días, tareas y sprints con las mismas reglas del dominio', () => {
    const totals = calculateProjectTotals(sprints);
    assert.equal(totals.totalDays, 6);
    assert.equal(totals.totalTasks, 4);
    assert.equal(totals.totalSprints, 2);
    assert.equal(totals.globalProgress, 33); // 2 de 6 días completados
    assert.equal(totals.globalProgress, calculateProgress(sprints.flatMap((s) => s.tasks)));
    assert.equal(totals.operationalProgress, totals.globalProgress);
  });

  it('agrupa por rol y tipo, y toma la fecha de fin más tardía', () => {
    const totals = calculateProjectTotals(sprints);
    assert.deepEqual(totals.roleDistribution, { QA: 3, Backend: 3 });
    assert.deepEqual(totals.typeDistribution, { qa: 3, dev: 3 });
    assert.equal(totals.estimatedEndDate, '2026-03-23');
    assert.equal(totals.operationalEstimatedEndDate, '2026-03-23');
  });

  it('calcula el progreso del producto hasta el sprint marcado y conserva el total operativo', () => {
    const scoped = [{ ...sprints[0], productDelivery: true }, sprints[1]];
    const totals = calculateProjectTotals(scoped);
    assert.equal(totals.productDeliverySprintId, 's1');
    assert.equal(totals.productSprints, 1);
    assert.equal(totals.productTasks, 2);
    assert.equal(totals.productDays, 5);
    assert.equal(totals.postDeliverySprints, 1);
    assert.equal(totals.globalProgress, 40);
    assert.equal(totals.operationalProgress, 33);
    assert.equal(totals.estimatedEndDate, '2026-03-20');
    assert.equal(totals.operationalEstimatedEndDate, '2026-03-23');
  });

  it('funciona con un proyecto vacío', () => {
    assert.deepEqual(calculateProjectTotals([]), {
      totalDays: 0,
      totalTasks: 0,
      totalSprints: 0,
      roleDistribution: {},
      typeDistribution: {},
      estimatedEndDate: null,
      operationalEstimatedEndDate: null,
      globalProgress: 0,
      operationalProgress: 0,
      productDays: 0,
      productTasks: 0,
      productSprints: 0,
      postDeliverySprints: 0,
      productDeliverySprintId: null,
      productDeliverySprintName: '',
    });
  });

  it('sumDurations coincide con el total del proyecto', () => {
    assert.equal(sumDurations(sprints.flatMap((s) => s.tasks)), calculateProjectTotals(sprints).totalDays);
  });
});
