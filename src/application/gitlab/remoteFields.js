/**
 * Proyección de los campos que solo existen en el snapshot remoto de GitLab.
 *
 * `remote.base` es una foto del payload de GitLab guardada en localStorage y es
 * la base de la fusión a tres vías: sus nombres de campo NO se pueden renombrar
 * sin invalidar el proyecto de cada usuario. En vez de eso, aquí se traducen a
 * campos neutrales que el dominio sí puede leer.
 *
 * Los campos derivados nunca se persisten: `normalizeSprints` construye cada
 * tarea desde una lista blanca fija, así que `remoteEnd` y `moduleLabel` se
 * descartan al guardar. Se recalculan en cada render a partir de `sprints`, de
 * modo que no pueden quedar rancios después de una sincronización.
 *
 * Este módulo NO importa nada a propósito: lo consume ProjectContext, que está
 * en el bundle inicial, y cualquier import arrastraría el adaptador de GitLab
 * completo a la carga inicial.
 */

/** Campo de GitLab que manda sobre la fecha de fin de una tarea importada. */
export const REMOTE_END_FIELD = 'due_date';

/**
 * Devuelve `{ remoteEnd }` SOLO si el snapshot trae la clave. La presencia de la
 * clave es la información: `due_date: null` significa «GitLab dice que no tiene
 * fecha» y deja la tarea sin fin, mientras que la ausencia de la clave deja
 * mandar a la fecha programada local. Por eso se propaga `{}` y nunca
 * `{ remoteEnd: undefined }`.
 */
export const remoteTaskEnd = (base) =>
  base && Object.hasOwn(base, REMOTE_END_FIELD) ? { remoteEnd: base[REMOTE_END_FIELD] } : {};

/** Etiqueta `módulo: X` de GitLab. Conserva los dos puntos internos del nombre. */
export const remoteTaskModule = (base) => {
  const label = base?.labels?.find((value) => /^m[oó]dulo\s*:/i.test(value));
  const value = label?.split(':').slice(1).join(':').trim();
  return value ? { moduleLabel: value } : {};
};

/** Agrega los campos derivados sin tocar los sprints originales. */
export const decorateRemoteFields = (sprints) =>
  sprints.map((sprint) => ({
    ...sprint,
    tasks: sprint.tasks.map((task) => ({
      ...task,
      ...remoteTaskEnd(task.remote?.base),
      ...remoteTaskModule(task.remote?.base),
    })),
  }));
