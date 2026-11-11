export function issueCommentTarget(remote, server) {
  if (!remote || !server) return null;
  const prefix = server.replace(/\/$/, '') + '/projects/';
  if (!remote.target?.startsWith(prefix)) return null;
  const projectId = remote.target.slice(prefix.length);
  return /^\d+$/.test(projectId) && /^\d+$/.test(remote.id) ? { projectId, iid: remote.id } : null;
}
export function normalizeIssueComments(notes) {
  if (!Array.isArray(notes)) throw new Error('GitLab devolvió comentarios inválidos.');
  return notes.filter(note => !note.system && typeof note.body === 'string').map(note => ({
    id: note.id, body: note.body, author: note.author?.name || note.author?.username || 'Usuario de GitLab',
    createdAt: note.created_at, internal: Boolean(note.internal),
  }));
}

/**
 * Carga los comentarios de varios issues en lotes, sin dejar que un fallo
 * aislado tumbe el resto. Hoy su único consumidor es TaskDetailsPanel, que
 * consulta en vivo los comentarios de una tarea del Cronograma.
 *
 * Es agnóstico de la interfaz a propósito: devuelve tanto el conteo de fallos
 * como el primer error (TaskDetailsPanel muestra su mensaje) para que la
 * pantalla decida cómo informarlo. Una cancelación no cuenta como fallo.
 */
export async function loadIssueComments({ api, targets, signal, batchSize = 4 }) {
  const comments = {};
  const cacheEntries = [];
  let failures = 0;
  let firstError = null;
  for (let index = 0; index < targets.length; index += batchSize) {
    const batch = targets.slice(index, index + batchSize);
    const results = await Promise.allSettled(
      batch.map(item => api.issueNotes(item.projectId, item.iid, { signal })),
    );
    signal?.throwIfAborted();
    results.forEach((result, position) => {
      const item = batch[position];
      if (result.status === 'fulfilled') {
        const normalized = normalizeIssueComments(result.value);
        comments[item.taskId] = normalized;
        if (item.sprintId) cacheEntries.push({ sprintId: item.sprintId, taskId: item.taskId, comments: normalized });
      } else if (result.reason?.name !== 'AbortError') {
        failures += 1;
        firstError = firstError || result.reason;
      }
    });
  }
  return { comments, cacheEntries, failures, firstError };
}
