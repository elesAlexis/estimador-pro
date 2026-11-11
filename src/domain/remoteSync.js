/**
 * Reglas de sincronización con un rastreador externo, sin saber cuál.
 *
 * Dos cosas viven aquí: la fusión a tres vías (qué cambió de este lado, qué del
 * otro, y qué está en conflicto) y los metadatos que el estimador embebe en el
 * campo de descripción para reconocer lo que él mismo creó. Ninguna de las dos
 * nombra un campo de GitLab; el formato de cable se traduce en
 * `application/gitlab/gitlabMapping.js`.
 */
const START = '<!-- estimador:v1 -->';
const END = '<!-- /estimador -->';
export const originMarker = id => `<!-- estimador-id:${encodeURIComponent(id)} -->`;
export const readMetadata = description => {
  const match = (description || '').match(/<!-- estimador:v1 -->\s*```json\s*([\s\S]*?)\s*```\s*<!-- \/estimador -->/);
  if (!match || match[1].length > 20000) return null;
  try { const value = JSON.parse(match[1]); return value && typeof value === 'object' && !Array.isArray(value) ? value : null; } catch { return null; }
};
export const withoutMetadata = value => (value || '').replace(/<!-- estimador:v1 -->[\s\S]*?<!-- \/estimador -->/g, '')
  .replace(/<!-- estimador-id:[^>]* -->/g, '').trim();

export function descriptionWithMetadata(description, id, metadata) {
  return `${withoutMetadata(description)}\n\n${originMarker(id)}\n${START}\n\`\`\`json\n${JSON.stringify(metadata, null, 2)}\n\`\`\`\n${END}`.trim();
}
export function threeWayChanges(base, current, desired, localBase = base) {
  const changes = {}, conflicts = [];
  for (const key of Object.keys(desired)) {
    const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    if (eq(current[key], desired[key])) continue;
    if (localBase && eq(localBase[key], desired[key])) continue; // El campo solo cambió en GitLab.
    changes[key] = desired[key];
    if (base && !eq(base[key], current[key])) conflicts.push(key);
  }
  return { changes, conflicts };
}
