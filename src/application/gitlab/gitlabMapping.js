/**
 * Adaptador de GitLab: traduce entre el modelo del estimador y el formato de
 * cable de la API (iid, milestone_id, assignee_ids, state_event, labels).
 *
 * Es el ÚNICO lugar que construye o interpreta payloads de GitLab. El dominio no
 * sabe que GitLab existe; `application/gitlab/gitlabSync.js` orquesta usando
 * estas funciones y `domain/remoteSync.js`.
 */
import { getTaskProgress, getSprintCompletion } from '../../domain/metrics';
import { isValidCalendarDate, parseCalendarDate, toDateKey } from '../../shared/calendarDate';
import { calculateColombianHolidays } from '../../domain/holidays';
import { countBusinessDays } from '../../domain/schedule';
import { descriptionWithMetadata, originMarker, readMetadata, withoutMetadata } from '../../domain/remoteSync';

/**
 * Duración inclusiva del intervalo del issue según el calendario colombiano.
 *
 * Usa a propósito el algoritmo local y NO el calendario inyectado del proyecto:
 * ese puede venir de la API de Nager cuando hay red. Inyectarlo haría que la
 * duración de un issue importado dependiera del estado de la conexión.
 */
export function issueBusinessDays(start, end) {
  if (!start || !end || !isValidCalendarDate(start) || !isValidCalendarDate(end)) return null;
  if (end < start) throw new Error('El fin del issue es anterior a su inicio.');
  const holidays = new Set();
  const desde = parseCalendarDate(start), hasta = parseCalendarDate(end);
  for (let year = desde.getFullYear(); year <= hasta.getFullYear(); year++) {
    for (const holiday of calculateColombianHolidays(year)) holidays.add(holiday.date);
  }
  const days = countBusinessDays(start, end, holidays);
  if (days > 36500) throw new Error('El intervalo del issue supera la duración admitida.');
  return days;
}

export const remoteSnapshot = (kind, item) => kind === 'milestone'
  ? { title: item.title, description: item.description || '', start_date: item.start_date || null, due_date: item.due_date || null, state: item.state }
  : { title: item.title, description: item.description || '', milestone_id: item.milestone?.id || null,
    due_date: item.due_date || null,
    labels: [...(item.labels || [])].sort(), assignee_ids: (item.assignees || []).map(user => user.id).sort((a, b) => a - b), state: item.state };

export function taskPayload(task, milestoneId, remote, markerId = task.id) {
  const labels = (remote?.labels || []).filter(label => !label.startsWith('estimador:tipo:') && !label.startsWith('estimador:prioridad:'));
  labels.push(`estimador:tipo:${task.type}`, `estimador:prioridad:${task.priority}`);
  const metadata = { id: task.id, role: task.role, duration: task.duration, type: task.type, priority: task.priority,
    wbs: task.wbs || task.calculatedWbs || '', progress: getTaskProgress(task), description: task.description || '',
    plannedStart: task.plannedStart || task.calculatedStart || '', plannedEnd: task.plannedEnd || task.calculatedEnd || '',
    realStart: task.realStart || '', realEnd: task.realEnd || '' };
  return { title: task.title || 'Tarea sin nombre', description: descriptionWithMetadata(remote?.description || task.description || '', markerId, metadata),
    due_date: task.plannedEnd || task.calculatedEnd || remote?.due_date || null,
    milestone_id: milestoneId || null, labels: labels.sort(),
    assignee_ids: task.assigneeIds ?? (remote?.assignees || []).map(user => user.id),
    state: getTaskProgress(task) === 100 ? 'closed' : 'opened' };
}

export function sprintPayload(sprint, remote) {
  const starts = sprint.tasks.map(t => t.plannedStart || t.calculatedStart).filter(Boolean).sort();
  const ends = sprint.tasks.map(t => t.plannedEnd || t.calculatedEnd).filter(Boolean).sort();
  const deliveryNote = '> **Estimador Pro:** hito de entrega del producto.';
  const remoteDescription = (remote?.description || '').replace(/\n?> \*\*Estimador Pro:\*\* hito de entrega del producto\.?/gi, '').trim();
  const description = sprint.productDelivery ? `${remoteDescription}\n\n${deliveryNote}`.trim() : remoteDescription;
  return { title: sprint.name, description: descriptionWithMetadata(description, sprint.markerId || sprint.id, { id: sprint.id, productDelivery: Boolean(sprint.productDelivery) }),
    start_date: sprint.plannedStart || starts[0] || null, due_date: sprint.plannedEnd || ends.at(-1) || null,
    state: sprint.tasks.length ? (getSprintCompletion(sprint.tasks).isComplete ? 'closed' : 'active') : remote?.state || 'active' };
}

export const editablePayload = (kind, fields, creating = false) => {
  const { state, ...body } = fields;
  if (body.labels) body.labels = body.labels.join(',');
  if (state && !creating) body.state_event = state === 'closed' ? 'close' : kind === 'milestone' ? 'activate' : 'reopen';
  return body;
};

/** Importar consulta conserva fechas; los elementos sin estimación quedan como borradores. */
export function importGitlabProject(project, milestones, issues, target) {
  const scoped = milestones.filter(m => !m.group_id && (m.project_id == null || Number(m.project_id) === Number(project.id)));
  const groups = new Map(scoped.map(m => {
    const metadata = readMetadata(m.description) || {};
    return [m.id, { id: `gl-s-${project.id}-${m.id}`, name: m.title, tasks: [], productDelivery: metadata.productDelivery === true,
    plannedStart: m.start_date || '', plannedEnd: m.due_date || '',
    remote: { id: String(m.id), target, updatedAt: m.updated_at, base: remoteSnapshot('milestone', m) } }];
  }));
  const unassigned = { id: `gl-unassigned-${project.id}`, name: 'Issues sin milestone de proyecto', tasks: [], remoteGroup: true };
  for (const issue of issues) {
    const metadata = readMetadata(issue.description) || {};
    const validDate = value => typeof value === 'string' && isValidCalendarDate(value) ? value : '';
    const plannedStart = Object.hasOwn(issue, 'start_date') ? validDate(issue.start_date) : validDate(metadata.plannedStart);
    const plannedEnd = Object.hasOwn(issue, 'due_date') ? validDate(issue.due_date) : validDate(metadata.plannedEnd);
    const duration = issueBusinessDays(plannedStart, plannedEnd) ??
      (Number.isInteger(metadata.duration) && metadata.duration > 0 && metadata.duration <= 36500 ? metadata.duration : 0);
    const progress = issue.state === 'closed' ? 100 : Number.isInteger(metadata.progress) && metadata.progress >= 0 && metadata.progress < 100 ? metadata.progress : 0;
    const str = (value, fallback = '') => typeof value === 'string' ? value : fallback;
    const task = { id: `gl-t-${project.id}-${issue.iid}`, title: issue.title, role: str(metadata.role, issue.assignees?.map(u => u.name).join(', ') || 'Sin asignar'),
      duration, progress, type: ['dev', 'review', 'deploy', 'qa'].includes(metadata.type) ? metadata.type : 'dev',
      priority: ['alta', 'media', 'baja'].includes(metadata.priority) ? metadata.priority : 'media',
      description: str(metadata.description, withoutMetadata(issue.description)), wbs: str(metadata.wbs),
      realStart: validDate(metadata.realStart), realEnd: validDate(metadata.realEnd),
      plannedStart, plannedEnd,
      scheduleMode: 'imported', assigneeIds: (issue.assignees || []).map(u => u.id),
      remote: { id: String(issue.iid), target, updatedAt: issue.updated_at, base: remoteSnapshot('issue', issue) } };
    (groups.get(issue.milestone?.id) || unassigned).tasks.push(task);
  }
  return [...groups.values(), ...(unassigned.tasks.length ? [unassigned] : [])];
}

export function importedProjectStart(sprints, fallback) {
  const starts = sprints.flatMap(sprint => [sprint.plannedStart, ...sprint.tasks.map(task => task.plannedStart)])
    .filter(value => typeof value === 'string' && isValidCalendarDate(value)).sort();
  return starts[0] || fallback;
}

/**
 * Operaciones de la API por tipo de elemento. Antes esto se resolvía
 * concatenando nombres (`api[`create${method}`]`), invisible para cualquier
 * búsqueda o renombrado; y la elección entre `iid` e `id` estaba repetida en
 * tres sitios. Ahora vive aquí una sola vez.
 */
export const GITLAB_OPERATIONS = Object.freeze({
  issue: {
    idField: 'iid',
    remoteId: item => String(item.iid),
    fetch: (api, projectId, id, options) => api.issue(projectId, id, options),
    list: (api, projectId, options) => api.issues(projectId, options),
    create: (api, projectId, body, options) => api.createIssue(projectId, body, options),
    update: (api, projectId, id, body, options) => api.updateIssue(projectId, id, body, options),
  },
  milestone: {
    idField: 'id',
    remoteId: item => String(item.id),
    fetch: (api, projectId, id, options) => api.milestone(projectId, id, options),
    list: (api, projectId, options) => api.milestones(projectId, options),
    create: (api, projectId, body, options) => api.createMilestone(projectId, body, options),
    update: (api, projectId, id, body, options) => api.updateMilestone(projectId, id, body, options),
  },
});

export const gitlabOperation = (kind) => {
  const operation = GITLAB_OPERATIONS[kind];
  if (!operation) throw new Error(`Tipo de elemento desconocido para GitLab: ${kind}.`);
  return operation;
};
