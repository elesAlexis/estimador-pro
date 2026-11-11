import React, { useEffect, useRef, useState } from 'react';
import { GitBranch, RefreshCw, Link2, Settings2, LogOut, ArrowDownToLine, CloudUpload } from 'lucide-react';
import { useGitlab } from '../context/GitlabContext';
import { useProjectActions, useProjectState, usePersistence } from '../context/ProjectContext';
import IntegrationModal from '../components/IntegrationModal';
import ConfirmModal from '../components/ConfirmModal';
import { gitlabTarget } from '../domain/integration';
import { importGitlabProject, importedProjectStart } from '../application/gitlab/gitlabMapping';
import { prepareGitlabSync, executeGitlabSync } from '../application/gitlab/gitlabSync';
import { fetchGitlabProject } from '../application/gitlab/fetchGitlabProject';
import { exportToJSON } from '../utils/jsonBackup';

const fieldNames = { title: 'Nombre', description: 'Descripción y estimación', state: 'Estado', start_date: 'Inicio', due_date: 'Entrega',
  labels: 'Etiquetas', assignee_ids: 'Responsables', milestone_id: 'Milestone' };
const showValue = value => value === null || value === undefined || value === '' ? 'Sin valor' : typeof value === 'object' ? JSON.stringify(value) : String(value);
const safeLink = (url, server) => { try { return new URL(url).origin === new URL(server).origin && new URL(url).protocol === 'https:' ? url : undefined; } catch { return undefined; } };

export default function GitlabPage() {
  const connection = useGitlab();
  const { api, session, connected, server, repo, journal } = connection;
  const { projectInfo, sprints, calculatedSprints, exportDisabledReason } = useProjectState();
  const { replaceProject, recordRemote, recalculateImported, updateTask } = useProjectActions();
  const persistence = usePersistence();
  const [configOpen, setConfigOpen] = useState(false);
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [preview, setPreview] = useState(null);
  const [choices, setChoices] = useState({});
  const [confirm, setConfirm] = useState('');
  const lock = useRef(false), controller = useRef(null), generation = useRef(0);
  const projectRef = useRef({ projectInfo, sprints });
  projectRef.current = { projectInfo, sprints };
  const revision = JSON.stringify({ projectInfo, sprints });
  const access = Math.max(data?.project.permissions?.project_access?.access_level || 0, data?.project.permissions?.group_access?.access_level || 0);
  const canWrite = access >= 30 || data?.user?.is_admin;
  const target = data ? gitlabTarget(server, data.project.id) : '';
  const stalePreview = preview && preview.revision !== revision;
  const imported = sprints.some(sprint => sprint.tasks.some(task => task.scheduleMode === 'imported'));
  const allResolved = preview?.entries.every(entry => entry.conflicts.every(field => choices[entry.key + ':' + field]));
  const writeDisabled = !canWrite || ['blocked', 'error'].includes(persistence.status);

  useEffect(() => {
    generation.current++;
    controller.current?.abort();
    lock.current = false;
    setBusy(''); setData(null); setPreview(null); setChoices({}); setError(''); setNotice('');
    return () => { generation.current++; controller.current?.abort(); };
  }, [api, repo, connected]);

  const run = async (label, work) => {
    if (lock.current) return;
    lock.current = true; setBusy(label); setError(''); setNotice('');
    const epoch = generation.current;
    const abort = new AbortController(); controller.current = abort;
    try { await work(abort.signal, () => epoch === generation.current && !abort.signal.aborted); }
    catch (err) { if (epoch === generation.current && err.name !== 'AbortError') setError(err.message || 'No se pudo completar la operación.'); }
    finally { if (epoch === generation.current) { lock.current = false; setBusy(''); } }
  };

  const fetchData = signal => fetchGitlabProject({ api, repo, signal });
  const refresh = () => run('Consultando GitLab…', async (signal, current) => {
    const result = await fetchData(signal);
    if (current()) { setData(result); setPreview(null); setNotice('Información actualizada. Tu estimación local se conserva.'); }
  });
  const prepare = () => run('Comparando cambios…', async (signal, current) => {
    const result = await fetchData(signal);
    const nextTarget = gitlabTarget(server, result.project.id);
    const local = journal.restore(calculatedSprints, nextTarget);
    const entries = prepareGitlabSync(local, result, nextTarget);
    if (current()) { setData(result); setPreview({ entries, revision, projectId: result.project.id }); setChoices({}); }
  });
  const importProject = () => {
    try {
      const importedSprints = importGitlabProject(data.project, data.milestones, data.issues, target);
      const next = { projectInfo: { ...projectInfo, name: data.project.name, startDate: importedProjectStart(importedSprints, projectInfo.startDate) },
        sprints: importedSprints };
      replaceProject(next);
      setPreview(null); setNotice('Proyecto importado. Las fechas existentes se conservan; completa las estimaciones que falten.');
    } catch (err) { setError(err.message); }
  };
  const sync = () => run('Aplicando cambios…', async (signal, current) => {
    if (!preview || stalePreview || writeDisabled) throw new Error('Actualiza la vista previa antes de aplicar cambios.');
    let completed = 0;
    try {
      await executeGitlabSync({ api, projectId: preview.projectId, entries: preview.entries, choices, signal,
        record: async (entry, remote) => {
          if (!current()) throw new DOMException('Operación cancelada', 'AbortError');
          // Conserva el vínculo en memoria incluso si el almacenamiento se llena.
          recordRemote(entry, remote);
          journal.record(entry, remote);
          completed++;
          setNotice('Resultados registrados: ' + completed + '.');
        },
      });
      if (current()) { setPreview(null); setNotice('Sincronización completada. Actualiza para consultar el resultado en GitLab.'); }
    } catch (err) {
      if (current()) { setPreview(null); setNotice('Se conservaron los resultados anteriores al fallo. Prepara una nueva vista previa para continuar.'); }
      throw err;
    }
  });

  return <div className="gitlab-page">
    <section className="gitlab-panel">
      <div className="gitlab-section-heading">
        <div><p className="gitlab-eyebrow">ESPACIO DE TRABAJO · ESTIMADOR PRO 1.0</p><h1><GitBranch size={23} /> GitLab</h1>
          <p>Tu estimación, conectada con los issues y milestones de un proyecto.</p></div>
        <span className={'gitlab-status ' + (connected ? 'is-connected' : '')}>{connected ? 'Conectado' : 'Trabajo local'}</span>
      </div>
      <p className="gitlab-destination">{server || 'Servidor pendiente'} <span> / </span> {repo || 'Proyecto pendiente'}</p>
      <div className="gitlab-actions">
        <button className="btn btn-secondary" onClick={() => setConfigOpen(true)} disabled={!!busy || connection.busy}><Settings2 size={16} /> Configuración</button>
        {connected ? <>
          <button className="btn btn-primary" onClick={refresh} disabled={!!busy}><RefreshCw size={16} /> Consultar proyecto</button>
          <button className="btn btn-secondary" disabled={!!busy} onClick={() => session.logout()}><LogOut size={16} /> Desconectar</button>
        </> : <button className="btn btn-primary" disabled={connection.busy || !connection.clientId || !server || !repo}
          onClick={() => session.login().catch(() => {})}><Link2 size={16} /> Conectar con GitLab</button>}
      </div>
      {!connected && <p>Conecta con tu cuenta para consultar o sincronizar. Al recargar tendrás que conectar de nuevo.</p>}
      <p className="gitlab-muted">El acceso se autoriza en GitLab. La aplicación conserva la sesión únicamente mientras está abierta.</p>
    </section>
    {(error || connection.error) && <div role="alert" className="gitlab-alert">{error || connection.error}</div>}
    <p role="status" aria-live="polite" className="gitlab-live">{busy || notice}</p>

    {data && connected && <>
      <section className="gitlab-panel" aria-busy={!!busy}>
        <div className="gitlab-section-heading"><div><h2>{data.project.name_with_namespace || data.project.name}</h2><p>Cuenta: {data.user.name} (@{data.user.username})</p></div>
          <a href={safeLink(data.project.web_url, server)} target="_blank" rel="noreferrer" className="btn btn-secondary">Abrir en GitLab</a></div>
        <div className="gitlab-stats">
          <div><strong>{data.issues.length}</strong><span>Issues</span></div>
          <div><strong>{data.issues.filter(issue => issue.state === 'closed').length}</strong><span>Completados</span></div>
          <div><strong>{data.milestones.length}</strong><span>Milestones</span></div>
        </div>
        <div className="gitlab-actions">
          <button className="btn btn-secondary" disabled={!!busy} onClick={() => setConfirm('import')}><ArrowDownToLine size={16} /> Importar al cronograma</button>
          <button className="btn btn-secondary" onClick={() => exportToJSON(projectInfo, sprints)}>Descargar respaldo local</button>
          <button className="btn btn-primary" disabled={!!busy || writeDisabled || !sprints.length || !!exportDisabledReason}
            onClick={prepare}><CloudUpload size={16} /> Revisar sincronización</button>
        </div>
        {!canWrite && <p>La consulta está disponible. Para sincronizar desde esta interfaz necesitas acceso Developer o superior al proyecto.</p>}
        {exportDisabledReason && <p className="gitlab-muted">Antes de sincronizar: {exportDisabledReason}</p>}
        {['blocked', 'error'].includes(persistence.status) && <p role="alert">Resuelve el aviso de guardado antes de enviar cambios a GitLab.</p>}
        {!journal.available && <p className="gitlab-muted">Este navegador no permite guardar datos locales, así que no hay registro de respaldo:
          si se interrumpe una sincronización, vuelve a revisarla antes de reintentar.</p>}
        <p className="gitlab-muted">Importar reemplaza el cronograma local completo. Sincronizar crea o actualiza los elementos revisados; quitar una tarea local no la elimina de GitLab.</p>
        <details><summary>Consultar issues ({data.issues.length})</summary><ul className="gitlab-resource-list">{data.issues.map(issue =>
          <li key={issue.id}><span className="gitlab-status">{issue.state === 'closed' ? 'Completado' : 'Abierto'}</span>
            <a href={safeLink(issue.web_url, server)} target="_blank" rel="noreferrer">#{issue.iid} · {issue.title}</a>
            <span>{issue.milestone?.title || 'Sin milestone'}</span></li>)}</ul></details>
        <details><summary>Consultar milestones ({data.milestones.length})</summary><ul className="gitlab-resource-list">{data.milestones.map(milestone =>
          <li key={milestone.id}><span className="gitlab-status">{milestone.state === 'closed' ? 'Completado' : 'Activo'}</span>
            <a href={safeLink(milestone.web_url, server)} target="_blank" rel="noreferrer">{milestone.title}</a>
            <span>{milestone.start_date || 'Sin inicio'} → {milestone.due_date || 'Sin entrega'}</span></li>)}</ul></details>
      </section>
      {imported && <section className="gitlab-panel"><h2>Fechas importadas</h2><p>Se conservan las fechas originales. Cambiar la duración no mueve estas tareas automáticamente.</p>
        <button className="btn btn-secondary" disabled={!!busy} onClick={() => setConfirm('recalculate')}>Recalcular toda la estimación</button></section>}
      <section className="gitlab-panel"><details><summary>Asignar responsables de GitLab</summary>
        <p>El rol del cronograma es descriptivo. Aquí eliges la cuenta responsable; se enviará al revisar la sincronización.</p>
        <div className="gitlab-assignments">{sprints.flatMap(sprint => sprint.tasks.map(task => <label key={sprint.id + ':' + task.id}>
          <span>{sprint.name} · {task.title}</span><select disabled={!!busy} value={task.assigneeIds?.[0] || ''}
            onChange={e => updateTask(sprint.id, task.id, 'assigneeIds', e.target.value ? [Number(e.target.value)] : [])}>
            <option value="">Sin asignar</option>{task.assigneeIds?.[0] && !data.members.some(member => member.id === task.assigneeIds[0]) &&
              <option value={task.assigneeIds[0]}>Responsable actual ({task.assigneeIds[0]})</option>}
            {data.members.map(member => <option key={member.id} value={member.id}>{member.name} (@{member.username})</option>)}
          </select>{task.assigneeIds?.length > 1 && <small>Conserva {task.assigneeIds.length} responsables hasta que elijas uno.</small>}</label>))}</div>
      </details></section>
      {preview && <section className="gitlab-panel" aria-label="Vista previa de sincronización">
        <h2>Revisa antes de sincronizar</h2><p>{preview.entries.filter(entry => entry.mode === 'create').length} creaciones · {preview.entries.filter(entry => entry.mode === 'update').length} actualizaciones</p>
        {stalePreview && <p role="alert">La estimación cambió. Prepara una nueva vista previa.</p>}
        <div className="gitlab-preview">{preview.entries.map(entry => <details key={entry.key} open={entry.conflicts.length > 0}>
          <summary><span className="gitlab-status">{entry.mode === 'create' ? 'Crear' : entry.mode === 'update' ? 'Actualizar' : 'Sin cambios'}</span>
            {entry.kind === 'milestone' ? 'Milestone' : 'Issue'} · {entry.title}</summary>
          {entry.pendingMilestone && <p>Se vinculará al nuevo milestone de este sprint.</p>}
          {Object.entries(entry.changes).map(([field, value]) => <div className="gitlab-change" key={field}><strong>{fieldNames[field] || field}</strong>
            <div><span>GitLab</span><pre>{showValue(entry.current[field])}</pre></div><div><span>Propuesto</span><pre>{showValue(value)}</pre></div>
            {entry.conflicts.includes(field) && <label>Este campo cambió en ambos lugares<select disabled={!!busy} value={choices[entry.key + ':' + field] || ''}
              onChange={e => setChoices({ ...choices, [entry.key + ':' + field]: e.target.value })}>
              <option value="">Elige una opción</option><option value="remote">Conservar GitLab</option><option value="local">Aplicar propuesta local</option>
            </select></label>}</div>)}
        </details>)}</div>
        <p>Los elementos al 100 % se cerrarán; al bajar de 100 % se reabrirán. Conservar GitLab mantiene ese campo remoto; importa de nuevo para traerlo al cronograma.</p>
        <button className="btn btn-primary" disabled={!!busy || stalePreview || !allResolved || writeDisabled} onClick={sync}>Aplicar cambios en GitLab</button>
      </section>}
    </>}
    <IntegrationModal isOpen={configOpen} onClose={() => setConfigOpen(false)} />
    <ConfirmModal isOpen={!!confirm} onClose={() => setConfirm('')}
      title={confirm === 'import' ? 'Reemplazar el cronograma local' : 'Recalcular fechas programadas'}
      message={confirm === 'import' ? 'Se reemplazarán la estimación local y sus tareas con el proyecto consultado. Descarga primero un respaldo si quieres conservarlos.'
        : 'Todas las fechas programadas se calcularán en secuencia desde el inicio del proyecto. Las duraciones vacías seguirán pendientes. Esto no modifica GitLab hasta que sincronices.'}
      confirmText={confirm === 'import' ? 'Importar proyecto' : 'Recalcular'}
      onConfirm={() => { if (confirm === 'import') importProject(); else { recalculateImported(); setPreview(null); } }} />
  </div>;
}
