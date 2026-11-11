import React, { useEffect, useId, useState } from 'react';
import Dialog from './Dialog';
import MarkdownContent from './MarkdownContent';
import { useGitlab } from '../context/GitlabContext';
import { issueCommentTarget, loadIssueComments } from '../application/gitlab/issueComments';

export default function TaskDetailsPanel({ task, onUpdate, isOpen, onClose }) {
  const id = useId();
  const connection = useGitlab();
  const [editing, setEditing] = useState(false);
  const [comments, setComments] = useState({ status: 'idle', items: [] });
  const [attempt, setAttempt] = useState(0);
  const target = issueCommentTarget(task.remote, connection?.server);
  const projectId = target?.projectId, iid = target?.iid;
  const api = connection?.api, connected = connection?.connected;
  useEffect(() => { if (isOpen) setEditing(false); }, [isOpen, task.id]);
  useEffect(() => {
    setComments({ status: 'idle', items: [] });
    if (!isOpen || !connected || !api || !projectId || !iid) return;
    const controller = new AbortController();
    setComments({ status: 'loading', items: [] });
    loadIssueComments({ api, targets: [{ projectId, iid, taskId: task.id }], signal: controller.signal })
      .then(({ comments: loaded, failures, firstError }) => {
        if (controller.signal.aborted) return;
        if (failures) setComments({ status: 'error', items: [], message: firstError.message });
        else setComments({ status: 'ready', items: loaded[task.id] || [] });
      }).catch(error => {
        if (!controller.signal.aborted) setComments({ status: 'error', items: [], message: error.message });
      });
    return () => controller.abort();
  }, [isOpen, api, connected, projectId, iid, attempt]);
  const dateLabel = value => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
  };
  return <Dialog isOpen={isOpen} onClose={onClose} title={task.title || 'Detalle de tarea'} className="task-observations-dialog">
    <div className="issue-detail-meta"><span className={`task-status ${Number(task.progress) === 100 ? 'status-complete' : ''}`}>
      {Number(task.progress) === 100 ? '✓ Completada' : 'En seguimiento'}</span>
      {task.remote && <span>Issue #{task.remote.id}</span>}<span>{task.role || 'Sin asignar'}</span></div>
    <section className="issue-detail-section" aria-labelledby={`${id}-description-heading`}>
      <div className="issue-detail-heading"><h3 id={`${id}-description-heading`}>Descripción</h3>
        <button type="button" data-dialog-initial className="btn btn-secondary btn-sm" aria-pressed={editing}
          onClick={() => setEditing(value => !value)}>{editing ? 'Ver formato' : 'Editar descripción'}</button></div>
      {editing ? <><label className="sr-only" htmlFor={`${id}-description`}>Descripción en Markdown</label>
        <textarea id={`${id}-description`} className="input" rows={9} value={task.description || ''}
          onChange={e => onUpdate('description', e.target.value)} placeholder="Descripción de la tarea (Markdown)" />
        <p className="dialog-message">Editas la copia local. Los cambios se aplican mientras escribes.</p></>
        : task.description ? <MarkdownContent text={task.description} /> : <p className="dialog-message">Sin descripción.</p>}
    </section>
    <section className="issue-detail-section" aria-labelledby={`${id}-comments-heading`}>
      <div className="issue-detail-heading"><h3 id={`${id}-comments-heading`}>Comentarios de GitLab</h3>
        {connected && target && <button type="button" className="btn btn-secondary btn-sm" disabled={comments.status === 'loading'} onClick={() => setAttempt(n => n + 1)}>Actualizar</button>}</div>
      {!task.remote ? <p className="dialog-message">Esta tarea todavía no está vinculada a un issue.</p>
        : !connected ? <p className="dialog-message">Conecta con GitLab para consultar los comentarios.</p>
        : !target ? <p className="dialog-message">Conecta al servidor al que pertenece este issue para consultar sus comentarios.</p> : <>
          {comments.status === 'loading' && <p role="status">Cargando comentarios…</p>}
          {comments.status === 'error' && <p role="alert">{comments.message} Puedes volver a intentar con Actualizar.</p>}
          {comments.status === 'ready' && !comments.items.length && <p className="dialog-message">Este issue no tiene comentarios.</p>}
          {comments.items.map(comment => <article className="issue-comment" key={comment.id}>
            <div className="issue-comment-header"><span className="issue-avatar" aria-hidden="true">{comment.author.slice(0, 1).toUpperCase()}</span>
              <div><strong>{comment.author}</strong><time dateTime={comment.createdAt}>{dateLabel(comment.createdAt)}</time></div>
              {comment.internal && <span>Interno</span>}</div>
            <MarkdownContent text={comment.body} />
          </article>)}
        </>}
    </section>
    <section className="issue-detail-section"><label htmlFor={`${id}-observations`} className="issue-notes-label">Observaciones locales</label>
      <p id={`${id}-hint`} className="dialog-message">Tus notas de seguimiento se conservan en el proyecto. No se publican como comentarios en GitLab.</p>
      <textarea id={`${id}-observations`} className="input" rows={3} value={task.observations || ''} aria-describedby={`${id}-hint`}
        onChange={e => onUpdate('observations', e.target.value)} placeholder="Añade observaciones de seguimiento…" />
    </section>
    <div className="dialog-actions"><button type="button" className="btn btn-primary" onClick={onClose}>Cerrar</button></div>
  </Dialog>;
}
