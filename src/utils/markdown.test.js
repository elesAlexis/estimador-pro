import test from 'node:test';
import assert from 'node:assert/strict';
import { markdownBlocks, safeMarkdownLink } from './markdown';
import { issueCommentTarget, normalizeIssueComments } from '../application/gitlab/issueComments';
import { normalizeProject } from '../application/projectValidation';
test('interpreta el ejemplo con encabezado y tareas completadas', () => {
  const blocks = markdownBlocks('**Sprint 1 - Login y Home**\n\nHome con cards.\n\n### Tareas\n\n- [x] Estilos\n- [x] Permisos\n- [ ] Login');
  assert.equal(blocks[2].type, 'heading');
  assert.deepEqual(blocks[3].items.map(item => item.checked), [true, true, false]);
});
test('preserva código y HTML como texto y bloquea enlaces ejecutables', () => {
  assert.equal(markdownBlocks('```js\n<script>alert(1)</script>\n```')[0].text, '<script>alert(1)</script>');
  assert.equal(safeMarkdownLink('javascript:alert(1)'), null);
  assert.equal(safeMarkdownLink('data:text/html,test'), null);
  assert.equal(safeMarkdownLink('https://example.com/issue/1'), 'https://example.com/issue/1');
});
test('comentarios excluyen eventos del sistema y preservan autor, fecha y cuerpo', () => {
  const result = normalizeIssueComments([{ id: 1, system: true, body: 'closed' },
    { id: 2, system: false, body: 'Verificado\n- Pruebas', author: { name: 'Ana' }, created_at: '2026-09-01T12:00:00Z' }]);
  assert.equal(result.length, 1); assert.equal(result[0].author, 'Ana'); assert.equal(result[0].body, 'Verificado\n- Pruebas');
});
test('solo consulta comentarios del servidor vinculado al issue', () => {
  const remote = { target: 'https://gitlab.example/projects/83', id: '4' };
  assert.deepEqual(issueCommentTarget(remote, 'https://gitlab.example'), { projectId: '83', iid: '4' });
  assert.equal(issueCommentTarget(remote, 'https://otro.example'), null);
});
test('observaciones locales sobreviven a la normalización sin alterar la descripción', () => {
  const result = normalizeProject({ sprints: [{ id: 's', tasks: [{ id: 't', description: '**Issue**', observations: 'Nota local' }] }] });
  assert.equal(result.sprints[0].tasks[0].observations, 'Nota local');
  assert.equal(result.sprints[0].tasks[0].description, '**Issue**');
});
