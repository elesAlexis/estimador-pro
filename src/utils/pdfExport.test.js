import { it } from 'node:test';
import assert from 'node:assert/strict';
import { createProjectPDF } from './pdfExport';
import { calculateProjectTotals } from '../domain/metrics';

const task = {
  id: 't1', title: 'Entrega del producto', type: 'dev', role: 'Desarrollador', duration: 2,
  priority: 'media', progress: 100, calculatedStart: '2026-12-23', calculatedEnd: '2026-12-24',
  realStart: '2026-12-23', realEnd: '2026-12-24',
};
const info = { name: 'Proyecto personal', client: 'LEGACY_COMPANY', startDate: '2026-12-23', status: 'en_curso' };

it('genera un reporte horizontal sin cliente heredado y con seguimiento', () => {
  const sprints = [{ id: 's1', name: 'Entrega', tasks: [task] }];
  const doc = createProjectPDF(info, sprints, calculateProjectTotals(sprints));
  const content = doc.output();
  assert.ok(doc.internal.pageSize.getWidth() > doc.internal.pageSize.getHeight());
  assert.ok(!content.includes('LEGACY_COMPANY'));
  assert.ok(content.includes('Proyecto personal'));
  assert.ok(content.includes('Sprint completado'));
  assert.ok(content.includes('Completada'));
  assert.ok(content.includes('PROGRAMADO'));
  assert.ok(content.includes('REAL'));
});

it('pagina proyectos extensos sin perder las últimas tareas', () => {
  const tasks = Array.from({ length: 45 }, (_, i) => ({ ...task, id: `t${i}`, title: `Tarea ${i} ` + 'Descripción extensa para verificar el salto de página. '.repeat(2) }));
  const sprints = [{ id: 's1', name: 'Seguimiento de entregas', tasks }];
  const doc = createProjectPDF(info, sprints, calculateProjectTotals(sprints));
  assert.ok(doc.internal.getNumberOfPages() >= 3);
  assert.ok(doc.output().includes('Tarea 44'));
});
