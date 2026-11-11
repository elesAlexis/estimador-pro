import test from 'node:test';
import assert from 'node:assert/strict';
import { createGitlabApi } from './gitlabApi';
const setup = fetchImpl => createGitlabApi({ server: 'https://gitlab.example.com', getToken: async () => 'secret', fetchImpl });
test('completa las fechas Dates de Work Items cuando REST omite el inicio', async () => {
  const api = setup(async (url, options) => {
    if (url.endsWith('/api/graphql')) {
      const body = JSON.parse(options.body);
      assert.deepEqual(body.variables, { path: 'grupo/repo', iid: '7' });
      return new Response(JSON.stringify({ data: { namespace: { workItem: { widgets: [
        { __typename: 'WorkItemWidgetStartAndDueDate', startDate: '2026-08-26', dueDate: '2026-08-28' },
      ] } } } }));
    }
    return new Response(JSON.stringify([{ iid: 7, title: 'Login', due_date: null }]));
  });
  const [issue] = await api.issuesWithDates(1, 'grupo/repo');
  assert.equal(issue.start_date, '2026-08-26'); assert.equal(issue.due_date, '2026-08-28');
});
test('no entrega una importación parcial si la consulta de fechas falla', async () => {
  const api = setup(async url => new Response(JSON.stringify(url.endsWith('/api/graphql')
    ? { errors: [{ message: 'No access' }] } : [{ iid: 7 }])));
  await assert.rejects(api.issuesWithDates(1, 'grupo/repo'), /fechas completas/);
});
test('paginación consulta todas las páginas y codifica rutas de proyecto', async () => {
  const urls = [];
  const api = setup(async (url, options) => {
    urls.push(url); assert.equal(options.headers.Authorization, 'Bearer secret'); assert.equal(options.redirect, 'error');
    const first = urls.length === 1;
    return new Response(JSON.stringify(first ? [{ id: 1 }] : [{ id: 2 }]), { headers: { 'x-next-page': first ? '2' : '' } });
  });
  assert.deepEqual(await api.issues('grupo/proyecto'), [{ id: 1 }, { id: 2 }]);
  assert.match(urls[0], /grupo%2Fproyecto/); assert.match(urls[1], /page=2$/);
});
test('sin cabecera expuesta, la paginación termina al recibir menos de cien elementos', async () => {
  let calls = 0; const api = setup(async () => new Response(JSON.stringify(++calls === 1 ? Array.from({ length: 100 }, (_, id) => ({ id })) : [])));
  assert.equal((await api.milestones(1)).length, 100); assert.equal(calls, 2);
});
test('respuestas inválidas y ciclos de paginación no devuelven resultados parciales', async () => {
  await assert.rejects(setup(async () => new Response('{}')).issues(1), /lista inválida/);
  await assert.rejects(setup(async () => new Response('[]', { headers: { 'x-next-page': '1' } })).issues(1), /Paginación/);
});
test('no expone respuestas remotas potencialmente sensibles en errores', async () => {
  const api = setup(async () => new Response('secret-token-in-body', { status: 403 }));
  await assert.rejects(api.project(1), error => error.status === 403 && !error.message.includes('secret'));
});
