import { createDefaultProjectInfo } from '../domain/project';
import { normalizeProject } from './projectValidation';

export function readProject(repository, fallback = createDefaultProjectInfo()) {
  const info = repository.loadProjectInfo();
  const sprints = repository.loadSprints();
  const raw = { ep_projectInfo: info.raw, ep_sprints: sprints.raw };
  try {
    if (info.status === 'error' || sprints.status === 'error') throw new Error('No se pudieron leer todos los datos guardados.');
    return { project: normalizeProject({ projectInfo: info.status === 'ok' ? info.data : fallback, sprints: sprints.status === 'ok' ? sprints.data : [] }, fallback), recovery: null, raw };
  } catch (error) {
    return { project: { projectInfo: fallback, sprints: [] }, recovery: { raw, message: error.message }, raw };
  }
}

/** Nunca reemplaza ediciones en memoria durante la recuperación de una lectura. */
export function retryProjectRecovery(repository, project, initialProject, previousRecovery) {
  const loaded = readProject(repository, initialProject.projectInfo);
  const raw = {
    ep_projectInfo: loaded.raw.ep_projectInfo ?? previousRecovery?.raw.ep_projectInfo ?? null,
    ep_sprints: loaded.raw.ep_sprints ?? previousRecovery?.raw.ep_sprints ?? null,
  };
  if (loaded.recovery) return { recovery: { ...loaded.recovery, raw } };
  if (project === initialProject) return { recoveredProject: loaded.project, recovery: null };
  return { recovery: { raw, message: 'El almacenamiento vuelve a estar disponible. Descarga tus ediciones e importa un respaldo para decidir qué proyecto conservar.' } };
}

export function archiveBeforeRecoveryImport(repository, recovery, downloaded) {
  const info = repository.loadProjectInfo();
  const sprints = repository.loadSprints();
  if ([info, sprints].some(result => result.status === 'error' && result.kind === 'unavailable')) {
    throw new Error('Restablece el acceso al almacenamiento y pulsa Reintentar antes de importar. Todavía no se pueden preservar todos los originales.');
  }
  const currentRaw = { ep_projectInfo: info.raw, ep_sprints: sprints.raw };
  const sameOriginal = JSON.stringify(currentRaw) === JSON.stringify(recovery.raw);
  const archived = repository.archiveRecovery({ original: recovery.raw, beforeImport: currentRaw });
  if (!archived.ok && (!downloaded || !sameOriginal)) throw new Error('Descarga primero los datos originales para recuperarlos. Si cambiaron, pulsa Reintentar para actualizar la copia. No se pudo guardar una copia local.');
}

export function persistProjectUnlessBlocked(repository, project, blocked) {
  return blocked ? { ok: false, blocked: true } : saveProject(repository, project);
}

/** Solo se declara éxito si ambas partes se guardan. */
export function saveProject(repository, project) {
  const info = repository.saveProjectInfo(project.projectInfo);
  const sprints = repository.saveSprints(project.sprints);
  return info.ok && sprints.ok ? { ok: true } : { ok: false, message: [info, sprints].filter(r => !r.ok).map(r => r.message).join('. ') };
}
