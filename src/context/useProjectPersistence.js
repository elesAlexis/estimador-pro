import { useCallback, useEffect, useRef, useState } from 'react';
import { archiveBeforeRecoveryImport, persistProjectUnlessBlocked, retryProjectRecovery } from '../application/projectPersistence';

/** Persistencia separada de cronogramas y acciones de negocio. */
export function useProjectPersistence(repository, project, initialRecovery, onRecovered) {
  const initialProject = useRef(project);
  const [recovery, setRecovery] = useState(initialRecovery);
  const [blocked, setBlocked] = useState(Boolean(initialRecovery));
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState(null);
  const recoveryDownloaded = useRef(false);
  useEffect(() => {
    const outcome = persistProjectUnlessBlocked(repository, project, blocked);
    if (!outcome.blocked) setResult({ project, outcome });
  }, [repository, project, blocked, attempt]);

  const prepareImport = useCallback(() => {
    if (blocked && recovery) {
      archiveBeforeRecoveryImport(repository, recovery, recoveryDownloaded.current);
    }
    setBlocked(false);
  }, [blocked, recovery, repository]);

  const retry = useCallback(() => {
    if (!blocked) { setAttempt(n => n + 1); return; }
    const retried = retryProjectRecovery(repository, project, initialProject.current, recovery);
    recoveryDownloaded.current = false;
    if (retried.recoveredProject) {
      onRecovered(retried.recoveredProject);
      setBlocked(false);
    } else {
      setRecovery(retried.recovery);
    }
  }, [blocked, repository, project, onRecovered, recovery]);

  const status = blocked ? 'blocked' : result?.project !== project ? 'saving' : result.outcome.ok ? 'saved' : 'error';
  return {
    status, recovery, message: blocked ? recovery?.message : result?.outcome.message,
    retry,
    prepareImport,
    markRecoveryDownloaded: () => { recoveryDownloaded.current = true; },
  };
}
