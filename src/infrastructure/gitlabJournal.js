/** Recupera vínculos si una escritura remota terminó antes de persistir React. Sin credenciales. */
import { getBrowserStorage } from './browserStorage';

const KEY = 'ep_gitlab_bindings_v1';

/**
 * Sin almacenamiento disponible (modo privado, políticas del navegador) el
 * registro se degrada en vez de reventar: `restore` devuelve los sprints tal
 * cual y `record` no hace nada. El vínculo sigue conservándose en memoria por el
 * reducer; lo que se pierde es la recuperación tras recargar, y eso se anuncia
 * con `available`.
 */
const journalNoDisponible = {
  available: false,
  record() {},
  restore(sprints) { return sprints; },
  clear() {},
};

export function createGitlabJournal(storage = getBrowserStorage()) {
  if (!storage) return journalNoDisponible;
  const read = () => {
    const value = JSON.parse(storage.getItem(KEY) || '{}');
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('No se pudo leer el registro de sincronización. Conserva un respaldo antes de continuar.');
    return value;
  };
  const bindingKey = (target, kind, id) => JSON.stringify([target, kind, id]);
  return {
    available: true,
    record(entry, remote) {
      const data = read();
      data[bindingKey(entry.target, entry.kind, entry.kind === 'issue' ? `${entry.sprintId}:${entry.localId}` : entry.localId)] = remote;
      storage.setItem(KEY, JSON.stringify(data));
    },
    restore(sprints, target) {
      const data = read();
      return sprints.map(sprint => ({ ...sprint,
        remote: sprint.remote || data[bindingKey(target, 'milestone', sprint.id)],
        tasks: sprint.tasks.map(task => ({ ...task, remote: task.remote || data[bindingKey(target, 'issue', `${sprint.id}:${task.id}`)] })),
      }));
    },
    clear() { storage.removeItem(KEY); },
  };
}
