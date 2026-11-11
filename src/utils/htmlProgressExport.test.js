import test from 'node:test';
import assert from 'node:assert/strict';
import { createProgressHtml, escapeHtml, markdownToSafeHtml } from './htmlProgressExport';

test('escapa contenido remoto y conserva markdown básico', () => {
  assert.equal(escapeHtml('<script>"x"</script>'), '&lt;script&gt;&quot;x&quot;&lt;/script&gt;');
  const html = markdownToSafeHtml('**Bien** <img src=x> [malo](javascript:alert(1))');
  assert.match(html, /<strong>Bien<\/strong>/);
  assert.doesNotMatch(html, /<img|javascript:/);
});

test('genera un documento autónomo con el proyecto y sin scripts', () => {
  const report = { project: { name: 'Demo <uno>', manager: 'Ana' }, today: '2026-09-15', start: '2026-09-01', end: '2026-09-30', calendarElapsed: 50,
    totals: { globalProgress: 25, completedSprints: 0, totalSprints: 1, completedTasks: 0, totalTasks: 1, overdueSprints: 0 }, modules: [],
    sprints: [{ number: 1, id: 's1', name: 'Sprint', start: '2026-09-01', end: '2026-09-30', progress: 25, completedTasks: 0, status: { key: 'active', label: 'En curso' }, tasks: [
      { id: 't1', title: 'Tarea', progress: 25, status: { key: 'active', label: 'En curso' }, module: 'Desarrollo', start: '2026-09-01', end: '2026-09-02', duration: 2 },
    ] }],
  };
  const html = createProgressHtml(report, { t1: [{ id: 1, author: 'Ana', body: 'Visible', internal: false }, { id: 2, author: 'Admin', body: 'Secreto interno', internal: true }] });
  assert.match(html, /<!doctype html>/);
  assert.match(html, /Demo &lt;uno&gt;/);
  assert.match(html, /Detalle del trabajo/);
  assert.match(html, />HOY</);
  assert.match(html, /Visible/);
  assert.doesNotMatch(html, /Secreto interno/);
  assert.doesNotMatch(html, /<script/i);
});
