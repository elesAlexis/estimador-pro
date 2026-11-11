/** Solo configuración pública. Ninguna credencial forma parte del proyecto. */
export function publicIntegration(value = {}) {
  return {
    provider: value.provider === 'gitlab' ? 'gitlab' : null,
    url: typeof value.url === 'string' ? value.url : '',
    repo: typeof value.repo === 'string' ? value.repo : '',
    clientId: typeof value.clientId === 'string' ? value.clientId : '',
  };
}

export const gitlabTarget = (server, projectId) => `${server.replace(/\/$/, '')}/projects/${projectId}`;

/**
 * Normaliza la URL del servidor y rechaza lo que no sirve como destino: solo
 * HTTPS, sin credenciales embebidas, sin parámetros ni fragmento. Es una regla
 * de negocio de la integración, no un detalle de transporte.
 */
export function gitlabOrigin(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
    throw new Error('Usa la URL HTTPS de GitLab, sin credenciales ni parámetros.');
  }
  return url.href.replace(/\/$/, '');
}
