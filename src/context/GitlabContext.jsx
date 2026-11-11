import React, { createContext, useContext, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { useProjectState } from './ProjectContext';
import { useNavigate } from 'react-router-dom';

const Context = createContext(null);

/**
 * Ciclo de vida de la conexión con GitLab. No elige implementaciones: recibe las
 * factorías y el registro ya construidos desde App.jsx.
 *
 * `createSession` y `createApi` DEBEN ser referencias estables (funciones
 * importadas, no arrow functions en línea): la sesión se memoiza con ellas, y si
 * su identidad cambia en cada render, el efecto de abajo cerraría la sesión
 * OAuth continuamente.
 */
export function GitlabProvider({ createSession, createApi, journal, defaults = {}, children }) {
  const navigate = useNavigate();
  const { projectInfo } = useProjectState();
  const saved = projectInfo.integration || {};
  const server = saved.url || defaults.url || '';
  const clientId = saved.clientId || defaults.clientId || '';
  const repo = saved.repo || defaults.repo || '';
  const redirectUri = defaults.redirectUri;
  const session = useMemo(() => createSession({ server, clientId, redirectUri }), [createSession, server, clientId, redirectUri]);
  const state = useSyncExternalStore(session.subscribe, session.getSnapshot);
  const previous = useRef(session);
  useEffect(() => {
    if (previous.current !== session) { previous.current.logout(); previous.current = session; }
    session.finishCallback(window.location.href, () => {
      const url = new URL(window.location.href);
      ['code', 'state', 'error', 'error_description'].forEach(key => url.searchParams.delete(key));
      window.history.replaceState(null, '', url.pathname + url.search + url.hash);
      navigate('/gitlab', { replace: true });
    });
  }, [session, navigate]);
  const api = useMemo(() => {
    try { return createApi({ server, getToken: session.getToken }); } catch { return null; }
  }, [createApi, server, session]);
  return <Context.Provider value={{ ...state, session, api, journal, server, repo, clientId, redirectUri }}>{children}</Context.Provider>;
}
export function useGitlab() { return useContext(Context); }
