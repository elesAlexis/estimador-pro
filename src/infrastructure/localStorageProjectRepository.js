import { getBrowserStorage } from './browserStorage';

/** Un fallo nunca equivale a ausencia de datos. */
export function createLocalStorageProjectRepository(storage = getBrowserStorage()) {
  const read = key => {
    let raw = null;
    try {
      if (!storage) throw new Error('Almacenamiento no disponible');
      raw = storage.getItem(key);
      return raw === null ? { status: 'empty', raw } : { status: 'ok', data: JSON.parse(raw), raw };
    } catch (error) {
      return { status: 'error', kind: raw === null ? 'unavailable' : 'invalid-json', message: error.message, raw };
    }
  };
  const write = (key, value) => {
    try {
      if (!storage) throw new Error('Almacenamiento no disponible');
      storage.setItem(key, JSON.stringify(value));
      return { ok: true };
    } catch (error) {
      return { ok: false, message: error.message };
    }
  };
  return {
    loadProjectInfo: () => read('ep_projectInfo'),
    loadSprints: () => read('ep_sprints'),
    saveProjectInfo: info => write('ep_projectInfo', info),
    saveSprints: sprints => write('ep_sprints', sprints),
    archiveRecovery: raw => write(`ep_recovery_${globalThis.crypto.randomUUID()}`, raw),
  };
}
