/**
 * Devuelve `localStorage` si el navegador permite usarlo, o null si está
 * bloqueado (modo privado, políticas del navegador). Acceder a la propiedad
 * puede lanzar SecurityError, por eso se protege aquí una sola vez.
 */
export function getBrowserStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}
