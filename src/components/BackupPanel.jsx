import React, { useState } from 'react';
import { useProjectState } from '../context/ProjectContext';
import { downloadJSON } from '../utils/jsonBackup';

export default function BackupPanel({ repository }) {
  const { projectInfo, sprints } = useProjectState();
  const [id, setId] = useState('');
  const [backup, setBackup] = useState(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function run(operation) {
    setBusy(true);
    setBackup(null);
    setMessage('');
    try {
      await operation();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  function save() {
    return run(async () => {
      const saved = await repository.save(projectInfo, sprints);
      setId(saved.id);
      setMessage('Respaldo guardado. Consulta su ID para comprobar el contenido.');
    });
  }

  function read(event) {
    event.preventDefault();
    if (!id.trim()) return;
    return run(async () => {
      const found = await repository.read(id.trim());
      setBackup(found);
      setMessage('Respaldo recuperado de SQLite.');
    });
  }

  return (
    <details className="card mb-4 p-4">
      <summary className="cursor-pointer font-semibold">Respaldos en SQLite</summary>
      <p className="my-2 text-sm">Guarda una copia del proyecto actual o consulta un respaldo por ID.</p>
      <button type="button" className="btn btn-primary" onClick={save} disabled={busy}>
        Guardar respaldo
      </button>
      <form className="mt-3 flex flex-wrap items-end gap-2" onSubmit={read}>
        <label className="flex min-w-0 flex-col text-sm">
          ID del respaldo
          <input className="input min-w-0" value={id} size={37} maxLength={36}
            disabled={busy} required
            onChange={event => {
              setId(event.target.value);
              setBackup(null);
              setMessage('');
            }} />
        </label>
        <button className="btn btn-secondary" type="submit" disabled={busy || !id.trim()}>
          Consultar respaldo
        </button>
      </form>
      <p role="status" className="mt-2 text-sm">{busy ? 'Procesando respaldo…' : message}</p>
      {backup && (
        <div className="mt-2">
          <p className="mb-2 text-sm">
            <strong>{backup.snapshot.projectInfo.name || 'Proyecto sin nombre'}</strong>
            {' · '}{backup.snapshot.sprints.length} sprints
          </p>
          <button className="btn btn-secondary" type="button"
            onClick={() => downloadJSON(backup.snapshot, `respaldo-${backup.id}.json`)}>
            Descargar respaldo JSON
          </button>
        </div>
      )}
    </details>
  );
}
