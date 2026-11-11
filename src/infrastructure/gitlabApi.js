import { gitlabOrigin } from '../domain/integration';

/** Transporte independiente de React; nunca sigue redirecciones con credenciales. */
export function createGitlabApi({ server, getToken, fetchImpl = globalThis.fetch }) {
  const base = `${gitlabOrigin(server)}/api/v4`;
  const request = async (path, { method = 'GET', body, signal } = {}) => {
    if (!path.startsWith('/') || path.startsWith('//')) throw new Error('Ruta GitLab inválida.');
    const token = await getToken();
    const res = await fetchImpl(`${base}${path}`, { method, signal, redirect: 'error',
      headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!res.ok) {
      const messages = { 401: 'La sesión no es válida. Vuelve a conectar.', 403: 'No tienes permisos para esta acción.',
        404: 'El recurso no existe o no tienes acceso.', 409: 'El recurso cambió. Actualiza antes de continuar.',
        422: 'GitLab rechazó los campos enviados.', 429: 'GitLab limitó las solicitudes. Espera y vuelve a intentar.' };
      const error = new Error(messages[res.status] || `GitLab no pudo completar la operación (${res.status}).`);
      error.status = res.status;
      throw error;
    }
    return { data: res.status === 204 ? null : await res.json(), headers: res.headers };
  };
  const list = async (path, { signal } = {}) => {
    const result = [], seen = new Set();
    let page = '1';
    while (page) {
      if (seen.has(page) || seen.size >= 10000) throw new Error('Paginación inválida; la lista no está completa.');
      seen.add(page);
      const { data, headers } = await request(`${path}${path.includes('?') ? '&' : '?'}per_page=100&page=${page}`, { signal });
      if (!Array.isArray(data)) throw new Error('GitLab devolvió una lista inválida.');
      result.push(...data);
      const next = headers.get('x-next-page');
      if (next !== null) {
        if (next && !/^\d+$/.test(next)) throw new Error('Paginación inválida.');
        page = next;
      } else page = data.length === 100 ? String(Number(page) + 1) : '';
    }
    return result;
  };
  const get = async (path, options) => (await request(path, options)).data;
  const project = id => `/projects/${encodeURIComponent(id)}`;
  const issueDates = async (fullPath, iid, { signal } = {}) => {
    const token = await getToken();
    const response = await fetchImpl(`${gitlabOrigin(server)}/api/graphql`, {
      method: 'POST', signal, redirect: 'error',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: `query IssueDates($path: ID!, $iid: String!) {
        namespace(fullPath: $path) { workItem(iid: $iid) {
          widgets { __typename ... on WorkItemWidgetStartAndDueDate { startDate dueDate } }
        } }
      }`, variables: { path: fullPath, iid: String(iid) } }),
    });
    if (!response.ok) throw new Error(`No se pudieron consultar las fechas del issue #${iid} (${response.status}).`);
    const result = await response.json();
    if (result.errors?.length || !result.data?.namespace?.workItem) throw new Error(`GitLab no permitió consultar las fechas completas del issue #${iid}. Verifica el acceso y la compatibilidad de Work Items en el servidor.`);
    const widgets = result.data.namespace.workItem.widgets;
    if (!Array.isArray(widgets)) throw new Error(`Fechas inválidas del issue #${iid}.`);
    const dates = widgets.find(widget => widget.__typename === 'WorkItemWidgetStartAndDueDate');
    if (!dates) return {};
    for (const value of [dates.startDate, dates.dueDate]) {
      if (value !== null && (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))) throw new Error(`Fechas inválidas del issue #${iid}.`);
    }
    return { start_date: dates.startDate, due_date: dates.dueDate };
  };
  return {
    issueDates,
    async issuesWithDates(id, fullPath, options = {}) {
      const issues = await list(`${project(id)}/issues?scope=all&state=all`, options);
      const result = [];
      for (const issue of issues) {
        options.signal?.throwIfAborted();
        result.push(Object.hasOwn(issue, 'start_date') ? issue : { ...issue, ...await issueDates(fullPath, issue.iid, options) });
      }
      return result;
    },
    user: options => get('/user', options),
    project: (id, options) => get(project(id), options),
    issues: (id, options) => list(`${project(id)}/issues?scope=all&state=all`, options),
    issueNotes: (id, iid, options) => list(`${project(id)}/issues/${encodeURIComponent(iid)}/notes?sort=asc&order_by=created_at`, options),
    milestones: (id, options) => list(`${project(id)}/milestones`, options),
    releases: (id, options) => list(`${project(id)}/releases`, options),
    tags: (id, options) => list(`${project(id)}/repository/tags`, options),
    members: (id, options) => list(`${project(id)}/members/all`, options),
    groupProjects: (id, options) => list(`/groups/${encodeURIComponent(id)}/projects?include_subgroups=true&with_shared=false&archived=false`, options),
    groupMilestones: (id, options) => list(`/groups/${encodeURIComponent(id)}/milestones`, options),
    subgroups: (id, options) => list(`/groups/${encodeURIComponent(id)}/descendant_groups`, options),
    issue: (id, iid, options) => get(`${project(id)}/issues/${encodeURIComponent(iid)}`, options),
    milestone: (id, mid, options) => get(`${project(id)}/milestones/${encodeURIComponent(mid)}`, options),
    createIssue: (id, body, options = {}) => get(`${project(id)}/issues`, { ...options, method: 'POST', body }),
    updateIssue: (id, iid, body, options = {}) => get(`${project(id)}/issues/${encodeURIComponent(iid)}`, { ...options, method: 'PUT', body }),
    createMilestone: (id, body, options = {}) => get(`${project(id)}/milestones`, { ...options, method: 'POST', body }),
    updateMilestone: (id, mid, body, options = {}) => get(`${project(id)}/milestones/${encodeURIComponent(mid)}`, { ...options, method: 'PUT', body }),
    createRelease: (id, body, options = {}) => get(`${project(id)}/releases`, { ...options, method: 'POST', body }),
    updateRelease: (id, tag, body, options = {}) => get(`${project(id)}/releases/${encodeURIComponent(tag)}`, { ...options, method: 'PUT', body }),
  };
}
