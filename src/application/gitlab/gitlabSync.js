import { originMarker, threeWayChanges } from '../../domain/remoteSync';
import { remoteSnapshot, taskPayload, sprintPayload, editablePayload, gitlabOperation } from './gitlabMapping';

/** Preparación de cambios sin escrituras. Cada fila mantiene su versión de referencia. */
export function prepareGitlabSync(sprints, remote, target) {
  const entries = [];
  const add = (kind, local, sprintId, items, desired) => {
    if (local.externalId && !local.remote) throw new Error('Hay vínculos del prototipo anterior sin destino verificable. Importa el proyecto de GitLab para vincularlos de forma segura.');
    const markerId = kind === 'issue' ? `task:${sprintId}:${local.id}` : `sprint:${local.id}`;
    if (local.remote && local.remote.target !== target) throw new Error('Este proyecto contiene vínculos con otro destino. Importa el destino correcto antes de sincronizar.');
    const { idField } = gitlabOperation(kind);
    const found = local.remote ? items.find(item => String(item[idField]) === local.remote.id)
      : items.find(item => (item.description || '').includes(originMarker(markerId)));
    if (local.remote && !found) throw new Error(`No se encuentra en GitLab: ${local.title || local.name}. Actualiza antes de continuar.`);
    const payload = desired(found, markerId);
    if (!payload.title?.trim()) throw new Error('Completa los nombres de los sprints y tareas antes de sincronizar.');
    const current = found ? remoteSnapshot(kind, found) : {};
    const { changes, conflicts } = found ? threeWayChanges(local.remote?.base, current, payload, local.remote?.localBase) : { changes: payload, conflicts: [] };
    if (found && !local.remote) conflicts.push(...Object.keys(changes).filter(field => !conflicts.includes(field)));
    entries.push({ key: `${kind}:${sprintId}:${local.id}`, kind, localId: local.id, sprintId, title: local.title || local.name,
      remoteId: found ? String(found[idField]) : null, updatedAt: found?.updated_at, current,
      payload, changes, conflicts, target, markerId, mode: !found ? 'create' : Object.keys(changes).length ? 'update' : 'none' });
    return found;
  };
  for (const sprint of sprints) {
    let milestone = null;
    if (!sprint.remoteGroup) milestone = add('milestone', sprint, sprint.id, remote.milestones, (found, markerId) => sprintPayload({ ...sprint, markerId }, found));
    for (const task of sprint.tasks) {
      add('issue', task, sprint.id, remote.issues, (found, markerId) => taskPayload(task, sprint.remoteGroup ? found?.milestone?.id : milestone?.id, found, markerId));
      if (!sprint.remoteGroup && !milestone) {
        const entry = entries.at(-1);
        entry.pendingMilestone = true;
        if (entry.mode === 'none') entry.mode = 'update';
      }
    }
  }
  return entries;
}

/** Serializa escrituras y registra cada éxito; un error detiene el resto sin perder los anteriores. */
export async function executeGitlabSync({ api, projectId, entries, choices = {}, record, signal }) {
  const milestones = new Map();
  const results = [];
  for (const entry of entries) {
    signal?.throwIfAborted();
    const changes = { ...entry.changes };
    for (const field of entry.conflicts) {
      const choice = choices[`${entry.key}:${field}`];
      if (!choice) throw new Error(`Resuelve el conflicto de ${entry.title}: ${field}.`);
      if (choice === 'remote') delete changes[field];
    }
    const kind = entry.kind;
    const operation = gitlabOperation(kind);
    let live = null;
    if (entry.remoteId) {
      live = await operation.fetch(api, projectId, entry.remoteId, { signal });
      if (JSON.stringify(remoteSnapshot(kind, live)) !== JSON.stringify(entry.current)) {
        throw new Error(`${entry.title} cambió en GitLab. Actualiza la vista previa.`);
      }
    } else {
      // Incluye creaciones cuyo resultado se perdió antes de guardar el vínculo local.
      const items = await operation.list(api, projectId, { signal });
      live = items.find(item => (item.description || '').includes(originMarker(entry.markerId)));
      if (live) throw new Error(`${entry.title} ya existe en GitLab. Actualiza la vista previa para vincularlo.`);
    }
    if (kind === 'issue' && entry.pendingMilestone) changes.milestone_id = Number(milestones.get(entry.sprintId));
    const body = editablePayload(kind, changes, !entry.remoteId);
    if (!entry.remoteId) {
      live = await operation.create(api, projectId, body, { signal });
    } else if (Object.keys(body).length) {
      live = await operation.update(api, projectId, entry.remoteId, body, { signal });
    }
    const id = operation.remoteId(live);
    if (kind === 'milestone') milestones.set(entry.sprintId, id);
    const save = async item => {
      await record(entry, { id, target: entry.target, updatedAt: item.updated_at, base: remoteSnapshot(kind, item),
        localBase: { ...entry.payload, ...(entry.pendingMilestone ? { milestone_id: Number(milestones.get(entry.sprintId)) } : {}) } });
    };
    await save(live); // Antes de operaciones secundarias: reintentos no duplican la creación.
    if (!entry.remoteId && entry.payload.state === 'closed') {
      live = await operation.update(api, projectId, id, { state_event: 'close' }, { signal });
      await save(live);
    }
    results.push({ title: entry.title, id });
  }
  return results;
}
