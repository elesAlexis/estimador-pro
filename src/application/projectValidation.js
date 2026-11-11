import { createDefaultProjectInfo, applyProjectRules } from '../domain/project';
import { isValidCalendarDate } from '../shared/calendarDate';
import { isPriority, isProjectStatus, isTaskType } from '../domain/taskCatalog';

const isObject = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const fail = (path, message) => { throw new Error(`${path}: ${message}`); };
const text = (value, fallback, path) => {
  if (value === undefined) return fallback;
  if (typeof value !== 'string') fail(path, 'debe ser texto');
  return value;
};
const date = (value, fallback, path) => {
  const result = text(value, fallback, path);
  if (result && (!/^\d{4}-\d{2}-\d{2}$/.test(result) || !isValidCalendarDate(result))) fail(path, 'fecha inválida');
  return result;
};
/** `esValida` decide qué opciones existen; los catálogos viven en el dominio. */
const choice = (value, fallback, esValida, path) => {
  const result = text(value, fallback, path);
  if (!esValida(result)) fail(path, 'opción desconocida');
  return result;
};
const number = (value, fallback, path, max) => {
  if (value === undefined) return fallback;
  if (value === '') return 0;
  if ((typeof value !== 'number' && typeof value !== 'string') || (typeof value === 'string' && !/^\d+$/.test(value))) fail(path, 'debe ser un número entero');
  const result = Number(value);
  if (!Number.isSafeInteger(result) || result < 0 || result > max) fail(path, `número fuera de rango (0–${max})`);
  return result;
};
const uniqueId = (value, seen, path) => {
  if (typeof value !== 'string' || !value.trim()) fail(path, 'identificador vacío o inválido');
  if (seen.has(value)) fail(path, `identificador duplicado «${value}»`);
  seen.add(value);
  return value;
};

const idList = (value, path) => {
  if (!Array.isArray(value) || value.some(id => !Number.isSafeInteger(id) || id <= 0)) fail(path, 'identificadores inválidos');
  return [...new Set(value)].sort((a, b) => a - b);
};
const issueComments = (value, path) => {
  if (!Array.isArray(value) || value.length > 5000) fail(path, 'comentarios de GitLab inválidos');
  return value.map((comment, index) => {
    const commentPath = `${path}, comentario ${index + 1}`;
    if (!isObject(comment) || (typeof comment.id !== 'string' && !Number.isSafeInteger(comment.id))) fail(commentPath, 'estructura inválida');
    if (comment.internal !== undefined && typeof comment.internal !== 'boolean') fail(commentPath, 'visibilidad inválida');
    return {
      id: comment.id,
      body: text(comment.body, '', `${commentPath}, contenido`),
      author: text(comment.author, 'Usuario de GitLab', `${commentPath}, autor`),
      createdAt: text(comment.createdAt, '', `${commentPath}, fecha`),
      internal: Boolean(comment.internal),
    };
  });
};
const remoteLink = (value, path) => {
  if (!isObject(value) || !/^\d+$/.test(value.id) || typeof value.target !== 'string' || !value.target.startsWith('https://')) fail(path, 'vínculo GitLab inválido');
  const snapshot = raw => {
    if (!isObject(raw)) fail(path, 'referencia GitLab inválida');
    const result = {};
    for (const field of ['title', 'description', 'state', 'start_date', 'due_date']) {
      if (Object.hasOwn(raw, field)) result[field] = raw[field] === null ? null : text(raw[field], '', `${path}, ${field}`);
    }
    if (Object.hasOwn(raw, 'milestone_id')) {
      if (raw.milestone_id !== null && (!Number.isSafeInteger(raw.milestone_id) || raw.milestone_id <= 0)) fail(path, 'milestone inválido');
      result.milestone_id = raw.milestone_id;
    }
    if (raw.assignee_ids !== undefined) result.assignee_ids = idList(raw.assignee_ids, path);
    if (raw.labels !== undefined) {
      if (!Array.isArray(raw.labels) || raw.labels.some(label => typeof label !== 'string')) fail(path, 'etiquetas inválidas');
      result.labels = [...raw.labels].sort();
    }
    return result;
  };
  return { id: String(value.id), target: value.target, updatedAt: text(value.updatedAt, '', path), base: snapshot(value.base),
    ...(value.localBase ? { localBase: snapshot(value.localBase) } : {}) };
};

/** Frontera de entrada: devuelve únicamente campos conocidos y normalizados. */
export function normalizeSprints(value) {
  if (!Array.isArray(value)) fail('Sprints', 'debe ser una lista');
  const sprintIds = new Set();
  const normalized = value.map((sprint, si) => {
    const path = `Sprint ${si + 1}`;
    if (!isObject(sprint)) fail(path, 'estructura inválida');
    const id = uniqueId(sprint.id, sprintIds, `${path}, id`);
    const name = text(sprint.name, `Sprint ${si + 1}`, `${path}, nombre`);
    if (!Array.isArray(sprint.tasks)) fail(path, 'falta la lista de tareas');
    const taskIds = new Set();
    const tasks = sprint.tasks.map((task, ti) => {
      const p = `${path}, tarea ${ti + 1}`;
      if (!isObject(task)) fail(p, 'estructura inválida');
      const result = {
        id: uniqueId(task.id, taskIds, `${p}, id`),
        title: text(task.title, 'Nueva Tarea', `${p}, título`),
        role: text(task.role, 'Desarrollador', `${p}, responsable`),
        duration: number(task.duration, 0, `${p}, duración`, 36500),
        type: choice(task.type, 'dev', isTaskType, `${p}, tipo`),
        priority: choice(task.priority, 'media', isPriority, `${p}, prioridad`),
        progress: number(task.progress, 0, `${p}, progreso`, 100),
        description: text(task.description, '', `${p}, observaciones`),
        observations: text(task.observations, '', `${p}, notas locales`),
        wbs: text(task.wbs, '', `${p}, WBS`),
        externalId: text(task.externalId, '', `${p}, external ID`),
        externalUrl: text(task.externalUrl, '', `${p}, external URL`),
      };
      if (task.remote !== undefined) result.remote = remoteLink(task.remote, p);
      if (task.remoteComments !== undefined) result.remoteComments = issueComments(task.remoteComments, p);
      if (task.assigneeIds !== undefined) result.assigneeIds = idList(task.assigneeIds, p);
      if (task.scheduleMode !== undefined) result.scheduleMode = choice(task.scheduleMode, 'automatic', (v) => v === 'automatic' || v === 'imported', p);
      for (const field of ['realStart', 'realEnd', 'plannedStart', 'plannedEnd']) {
        if (task[field] !== undefined) result[field] = date(task[field], '', `${p}, ${field}`);
      }
      if (result.realStart && result.realEnd && result.realEnd < result.realStart) fail(p, 'el fin real es anterior al inicio');
      if (result.plannedStart && result.plannedEnd && result.plannedEnd < result.plannedStart) fail(p, 'el fin programado es anterior al inicio');
      return result;
    });
    const externalId = text(sprint.externalId, '', `${path}, external ID`);
    if (sprint.remoteGroup !== undefined && typeof sprint.remoteGroup !== 'boolean') fail(path, 'grupo inválido');
    if (sprint.productDelivery !== undefined && typeof sprint.productDelivery !== 'boolean') fail(path, 'marcador de entrega inválido');
    return { id, name, externalId, tasks,
      ...(sprint.remote !== undefined ? { remote: remoteLink(sprint.remote, path) } : {}),
      ...(sprint.remoteGroup !== undefined ? { remoteGroup: sprint.remoteGroup } : {}),
      ...(sprint.productDelivery !== undefined ? { productDelivery: sprint.productDelivery } : {}),
      ...(sprint.plannedStart !== undefined ? { plannedStart: date(sprint.plannedStart, '', path) } : {}),
      ...(sprint.plannedEnd !== undefined ? { plannedEnd: date(sprint.plannedEnd, '', path) } : {}) };
  });
  if (normalized.filter(sprint => sprint.productDelivery).length > 1) fail('Sprints', 'solo uno puede marcar la entrega del producto');
  return normalized;
}

export function normalizeProject(value, fallback = createDefaultProjectInfo()) {
  if (!isObject(value)) fail('Proyecto', 'estructura inválida');
  const info = value.projectInfo === undefined ? {} : value.projectInfo;
  if (!isObject(info)) fail('Información del proyecto', 'estructura inválida');

  const rawInteg = isObject(info.integration) ? info.integration : {};
  const integration = {
    provider: rawInteg.provider == null ? null : choice(rawInteg.provider, null, (v) => v === 'github' || v === 'gitlab', 'Proyecto, integration provider'),
    url: text(rawInteg.url, '', 'Proyecto, integration url'),
    repo: text(rawInteg.repo, '', 'Proyecto, integration repo'),
    clientId: text(rawInteg.clientId, '', 'Proyecto, Application ID'),
  };

  const projectInfo = applyProjectRules({
    name: text(info.name, fallback.name, 'Proyecto, nombre'),
    client: text(info.client, fallback.client ?? '', 'Proyecto, cliente'),
    manager: text(info.manager, fallback.manager, 'Proyecto, administrador'),
    status: choice(info.status, fallback.status, isProjectStatus, 'Proyecto, estado'),
    startDate: date(info.startDate, fallback.startDate, 'Proyecto, fecha de inicio'),
    integration,
  });
  return { projectInfo, sprints: normalizeSprints(value.sprints) };
}

export const isValidSprintList = value => {
  try { normalizeSprints(value); return true; } catch { return false; }
};
export const sanitizeProjectInfo = (value, fallback) => {
  const source = isObject(value) ? value : {};
  const result = { ...fallback };
  for (const field of ['name', 'client', 'manager', 'status', 'startDate']) {
    if (typeof source[field] === 'string') result[field] = source[field];
  }
  if (isObject(source.integration)) {
    result.integration = { ...fallback.integration };
    for (const field of ['provider', 'url', 'repo', 'clientId']) {
      if (typeof source.integration[field] === 'string' || source.integration[field] === null) {
        result.integration[field] = source.integration[field];
      }
    }
  }
  return applyProjectRules(result);
};
