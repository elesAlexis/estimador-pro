import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildProgressReport, buildReportTimeline, getTaskModule, reportBarPlacement } from './progressReport';
import { decorateRemoteFields } from '../application/gitlab/remoteFields';

const totals = { totalDays: 5, totalTasks: 2, totalSprints: 1, globalProgress: 50, roleDistribution: {}, typeDistribution: {} };
const sprints = decorateRemoteFields([{ id: 's1', name: 'Sprint 1', tasks: [
  { id: 't1', title: 'Lista', type: 'dev', duration: 2, progress: 100, calculatedStart: '2026-09-14', calculatedEnd: '2026-09-15', remote: { base: { labels: ['módulo:Ventas'] } } },
  { id: 't2', title: 'Pendiente', type: 'qa', duration: 3, progress: 0, calculatedStart: '2026-09-16', calculatedEnd: '2026-09-18' },
] }]);

test('resume avance por sprint, tarea y módulo', () => {
  const report = buildProgressReport({ name: 'Demo', startDate: '2026-09-14' }, sprints, totals, new Date(2026, 8, 17));
  assert.equal(report.totals.completedTasks, 1);
  assert.equal(report.sprints[0].status.key, 'active');
  assert.deepEqual(report.modules.map(item => [item.name, item.progress]), [['Pruebas', 0], ['Ventas', 100]]);
  assert.equal(report.calendarElapsed, 80);
});

test('marca un sprint vencido y reconoce etiquetas modulo sin tilde', () => {
  const late = decorateRemoteFields([{ ...sprints[0], tasks: [{ ...sprints[0].tasks[1], remote: { base: { labels: ['modulo:Catálogo'] } } }] }]);
  const report = buildProgressReport({ startDate: '2026-09-14' }, late, { ...totals, totalTasks: 1 }, new Date(2026, 8, 21));
  assert.equal(report.sprints[0].status.key, 'overdue');
  assert.equal(getTaskModule(late[0].tasks[0]), 'Catálogo');
});

test('calcula barras dentro del rango del reporte', () => {
  assert.deepEqual(reportBarPlacement({ start: '2026-09-01', end: '2026-09-10' }, '2026-09-03', '2026-09-05'), { left: 20, width: 30 });
});

test('agrupa el cronograma por mes y ubica hoy dentro de su día', () => {
  const timeline = buildReportTimeline({ start: '2026-08-26', end: '2026-10-04', today: '2026-09-15' });
  assert.deepEqual(timeline.months.map(month => month.label), ['AGO 2026', 'SEPT 2026', 'OCT 2026']);
  assert.equal(timeline.totalDays, 40);
  assert.equal(timeline.today, 51.25);
});

test('limita los indicadores del producto al sprint de entrega y mantiene el cronograma completo', () => {
  const extended = [{ ...sprints[0], productDelivery: true }, { id: 's2', name: 'Estabilización', tasks: [
    { id: 't3', title: 'Soporte', type: 'qa', duration: 10, progress: 0, calculatedStart: '2026-09-21', calculatedEnd: '2026-10-02' },
  ] }];
  const scopedTotals = { ...totals, globalProgress: 50, estimatedEndDate: '2026-09-18', productDeliverySprintId: 's1' };
  const report = buildProgressReport({ startDate: '2026-09-14' }, extended, scopedTotals, new Date(2026, 8, 17));
  assert.equal(report.end, '2026-10-02');
  assert.equal(report.productEnd, '2026-09-18');
  assert.equal(report.totals.scopeTasks, 2);
  assert.equal(report.totals.completedTasks, 1);
  assert.equal(report.modules.some(module => module.name === 'Pruebas' && module.tasks === 1), true);
});

/**
 * El "módulo" de una tarea se deduce hoy de las etiquetas de GitLab, con varias
 * variantes ortográficas aceptadas. Se congela antes de mover esa deducción
 * fuera del dominio: `módulo:Ventas:B2B` debe seguir dando `Ventas:B2B`, que es
 * lo primero que se rompe al "simplificar" el split.
 */
describe('deducción del módulo de una tarea', () => {
  const conEtiqueta = (etiqueta, type = 'dev') =>
    decorateRemoteFields([{ tasks: [{ type, remote: { base: { labels: [etiqueta] } } }] }])[0].tasks[0];

  it('acepta la etiqueta con y sin tilde, con mayúscula y con espacios', () => {
    assert.equal(getTaskModule(conEtiqueta('módulo: Pagos')), 'Pagos');
    assert.equal(getTaskModule(conEtiqueta('modulo:Ventas')), 'Ventas');
    assert.equal(getTaskModule(conEtiqueta('Módulo : Cobros')), 'Cobros');
  });

  it('conserva los dos puntos internos del nombre del módulo', () => {
    assert.equal(getTaskModule(conEtiqueta('módulo:Ventas:B2B')), 'Ventas:B2B');
  });

  it('sin módulo utilizable cae en la etiqueta del tipo de tarea', () => {
    assert.equal(getTaskModule(conEtiqueta('módulo:', 'qa')), 'Pruebas');
    assert.equal(getTaskModule(conEtiqueta('bug', 'qa')), 'Pruebas');
    assert.equal(getTaskModule(decorateRemoteFields([{ tasks: [{ type: 'review', remote: { base: { labels: [] } } }] }])[0].tasks[0]), 'Revisión');
    assert.equal(getTaskModule({ type: 'deploy' }), 'Despliegue');
  });

  it('un tipo desconocido queda como «Sin módulo»', () => {
    assert.equal(getTaskModule({ type: 'zzz' }), 'Sin módulo');
  });
});
