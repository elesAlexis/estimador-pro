import React from 'react';
import { usePersistence, useProjectState } from '../context/ProjectContext';
import { downloadJSON, exportToJSON } from '../utils/jsonBackup';

export default function PersistenceNotice() {
  const { status, message, recovery, retry, markRecoveryDownloaded } = usePersistence();
  const { projectInfo, sprints, announcement } = useProjectState();
  const failed = status === 'error' || status === 'blocked';
  return (
    <>
      <div className={failed ? 'persistence-notice persistence-error' : 'persistence-notice'}>
        <p role={failed ? 'alert' : 'status'}>
          {status === 'saved' ? 'Guardado en este navegador' : status === 'saving' ? 'Guardando…' :
            status === 'blocked' ? 'Guardado suspendido: los datos originales necesitan recuperación.' :
              'No se pudieron guardar los cambios. Se conservan en esta sesión; descarga un respaldo antes de cerrar.'}
        </p>
        {failed && <>
          <p>{message}</p>
          {status === 'blocked' && <p>Descarga los originales e importa un respaldo válido desde Exportar. No se sobrescribirán automáticamente.</p>}
          <div className="notice-actions">
            <button className="btn btn-secondary btn-sm" onClick={retry}>Reintentar</button>
            <button className="btn btn-secondary btn-sm" onClick={() => exportToJSON(projectInfo, sprints)}>Descargar respaldo JSON</button>
            {recovery && <button className="btn btn-secondary btn-sm" onClick={() => {
              downloadJSON(recovery.raw, 'datos_originales_recuperacion.json');
              markRecoveryDownloaded();
            }}>Descargar datos originales</button>}
          </div>
        </>}
      </div>
      <p className="sr-only" role="status" aria-live="polite">{announcement}</p>
    </>
  );
}
