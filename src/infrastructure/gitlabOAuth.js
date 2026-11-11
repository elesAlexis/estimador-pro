/** OAuth PKCE para clientes estáticos. Los tokens existen únicamente en memoria. */
import { gitlabOrigin } from '../domain/integration';

const base64url = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const browserFlowStorage = {
  getItem: key => globalThis.sessionStorage.getItem(key),
  setItem: (key, value) => globalThis.sessionStorage.setItem(key, value),
  removeItem: key => globalThis.sessionStorage.removeItem(key),
};
export async function createPKCE(cryptoApi = globalThis.crypto) {
  const verifier = base64url(cryptoApi.getRandomValues(new Uint8Array(48)));
  const challenge = base64url(new Uint8Array(await cryptoApi.subtle.digest('SHA-256', new TextEncoder().encode(verifier))));
  const state = base64url(cryptoApi.getRandomValues(new Uint8Array(32)));
  return { verifier, challenge, state };
}

export function createGitlabSession({ server, clientId, redirectUri, scope = 'api', key = 'estimador.oauth.flow',
  storage = browserFlowStorage, fetchImpl = globalThis.fetch, cryptoApi = globalThis.crypto,
  now = Date.now, navigate = url => globalThis.location.assign(url) }) {
  const listeners = new Set();
  let tokens = null, callbackPromise = null, refreshPromise = null, epoch = 0;
  let snapshot = { connected: false, busy: false, error: '' };
  const emit = patch => { snapshot = { ...snapshot, ...patch }; listeners.forEach(listener => listener()); };
  const config = () => {
    if (!clientId?.trim()) throw new Error('Falta el Application ID registrado en GitLab.');
    const redirect = new URL(redirectUri);
    if (redirect.protocol !== 'https:' && !(redirect.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(redirect.hostname))) {
      throw new Error('La dirección de retorno debe usar HTTPS.');
    }
    return gitlabOrigin(server);
  };
  const exchange = async (fields, requestEpoch) => {
    const res = await fetchImpl(`${config()}/oauth/token`, {
      method: 'POST', redirect: 'error', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, ...fields }),
    });
    if (!res.ok) throw new Error(`GitLab rechazó la sesión (${res.status}). Vuelve a conectar.`);
    const data = await res.json();
    if (!data.access_token || typeof data.access_token !== 'string' || !Number.isFinite(data.expires_in) || data.expires_in <= 0) {
      throw new Error('GitLab devolvió una sesión inválida.');
    }
    if (epoch !== requestEpoch) throw new Error('La sesión cambió durante la conexión.');
    tokens = { access: data.access_token, refresh: data.refresh_token, expires: now() + data.expires_in * 1000 };
    emit({ connected: true, busy: false, error: '' });
    return tokens.access;
  };
  return {
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    getSnapshot: () => snapshot,
    async login() {
      try {
        const origin = config();
        const requestEpoch = epoch;
        const pkce = await createPKCE(cryptoApi);
        if (requestEpoch !== epoch) return;
        storage.setItem(key, JSON.stringify({ ...pkce, server: origin, clientId, redirectUri, createdAt: now() }));
        const params = new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, response_type: 'code',
          scope, state: pkce.state, code_challenge: pkce.challenge, code_challenge_method: 'S256' });
        navigate(`${origin}/oauth/authorize?${params}`);
      } catch (error) { emit({ error: error.message, busy: false }); throw error; }
    },
    finishCallback(url, cleanUrl = () => {}) {
      if (callbackPromise) return callbackPromise;
      const params = new URL(url).searchParams;
      if (!params.has('code') && !params.has('error')) return Promise.resolve(false);
      const requestEpoch = epoch;
      callbackPromise = (async () => {
        emit({ busy: true, error: '' });
        cleanUrl();
        try {
          let raw;
          try { raw = storage.getItem(key); } finally { storage.removeItem(key); }
          const flow = JSON.parse(raw || 'null');
          if (!flow || flow.state !== params.get('state') || flow.server !== config() || flow.clientId !== clientId ||
            flow.redirectUri !== redirectUri || now() - flow.createdAt > 600000 || now() < flow.createdAt) {
            throw new Error('La conexión caducó o no corresponde a esta sesión. Vuelve a conectar.');
          }
          if (params.has('error')) throw new Error('La autorización fue cancelada o rechazada.');
          await exchange({ grant_type: 'authorization_code', code: params.get('code'), code_verifier: flow.verifier }, requestEpoch);
          return true;
        } catch (error) {
          if (epoch === requestEpoch) { tokens = null; emit({ connected: false, busy: false, error: error.message }); }
          return false;
        }
      })();
      return callbackPromise;
    },
    async getToken() {
      if (!tokens) throw new Error('Conecta con GitLab para continuar.');
      if (tokens.expires > now() + 30000) return tokens.access;
      if (!tokens.refresh) { tokens = null; emit({ connected: false }); throw new Error('La sesión caducó. Vuelve a conectar.'); }
      if (!refreshPromise) {
        const requestEpoch = epoch;
        refreshPromise = exchange({ grant_type: 'refresh_token', refresh_token: tokens.refresh }, requestEpoch)
          .catch(error => { if (epoch === requestEpoch) { tokens = null; emit({ connected: false, error: error.message }); } throw error; })
          .finally(() => { refreshPromise = null; });
      }
      return refreshPromise;
    },
    async logout() {
      const previous = tokens;
      epoch++; tokens = null; callbackPromise = null;
      try { storage.removeItem(key); } catch { /* El cierre en memoria siempre se completa. */ }
      emit({ connected: false, busy: false, error: '' });
      if (previous) {
        try {
          const res = await fetchImpl(`${config()}/oauth/revoke`, { method: 'POST', redirect: 'error',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ client_id: clientId, token: previous.refresh || previous.access }),
          });
          if (!res.ok) throw new Error();
        } catch { emit({ error: 'Sesión cerrada aquí. No se pudo confirmar la revocación en GitLab; puedes revocarla en tus aplicaciones autorizadas.' }); }
      }
    },
  };
}
