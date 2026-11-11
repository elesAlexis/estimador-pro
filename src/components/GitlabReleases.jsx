import React, { useEffect, useRef, useState } from 'react';
import { saveGitlabRelease } from '../application/gitlab/gitlabReleases';

export default function GitlabReleases({ api, projectId, milestones, canWrite, disabled }) {
  const [data, setData] = useState(null), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false), [draft, setDraft] = useState(null), [review, setReview] = useState(false);
  const active = useRef(null), alive = useRef(true), lock = useRef(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; active.current?.abort(); }; }, []);
  const run = async work => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(''); setNotice('');
    const controller = new AbortController(); active.current = controller;
    try { await work(controller.signal); }
    catch (err) { if (alive.current && err.name !== 'AbortError') setError(err.message); }
    finally { if (alive.current) { lock.current = false; setBusy(false); } }
  };
  const load = () => run(async signal => {
    const [releases, tags] = await Promise.all([api.releases(projectId, { signal }), api.tags(projectId, { signal })]);
    if (alive.current) { setData({ releases, tags }); setDraft(null); setReview(false); }
  });
  const choose = tag => {
    const original = data.releases.find(release => release.tag_name === tag);
    setDraft(tag ? { tag_name: tag, name: original?.name || tag, description: original?.description || '',
      milestones: (original?.milestones || []).map(m => m.title), original } : null);
    setReview(false);
  };
  const save = () => run(async signal => {
    await saveGitlabRelease({ api, projectId, draft, original: draft.original, signal });
    if (alive.current) { setNotice('Versión guardada. Actualiza la lista para seguir trabajando.'); setDraft(null); setReview(false); setData(null); }
  });
  const change = patch => { setDraft({ ...draft, ...patch }); setReview(false); };
  const availableMilestones = [...new Set([...milestones.map(m => m.title), ...(draft?.milestones || [])])];
  return <section className="gitlab-panel" aria-busy={busy}>
    <div className="gitlab-section-heading"><div><h2>Versiones del proyecto</h2><p>Publica notas de entrega sobre tags existentes y asócialas con milestones.</p></div>
      <button className="btn btn-secondary" disabled={disabled || busy} onClick={load}>Consultar versiones</button></div>
    {error && <p role="alert" className="gitlab-alert">{error}</p>}
    <p role="status">{busy ? 'Consultando…' : notice}</p>
    {data && <>
      <ul className="gitlab-resource-list">{data.releases.map(release => <li key={release.tag_name}>
        <strong>{release.name}</strong><span>{release.tag_name}</span>
        {canWrite && <button className="btn btn-secondary" disabled={disabled || busy} onClick={() => choose(release.tag_name)}>Editar notas</button>}</li>)}</ul>
      {!data.releases.length && <p>Todavía no hay versiones publicadas.</p>}
      {canWrite && <label className="gitlab-field">Tag existente<select disabled={disabled || busy} value={draft?.tag_name || ''} onChange={e => choose(e.target.value)}>
        <option value="">Selecciona un tag</option>{data.tags.map(tag => <option key={tag.name}>{tag.name}</option>)}</select></label>}
      {!data.tags.length && <p>Crea primero un tag en GitLab. Esta pantalla no modifica el código ni crea tags.</p>}
    </>}
    {draft && <form className="gitlab-form" onSubmit={e => { e.preventDefault(); setReview(true); }}>
      <label>Nombre de la versión<input required value={draft.name} disabled={disabled || busy} onChange={e => change({ name: e.target.value })} /></label>
      <label>Notas de entrega<textarea rows={5} value={draft.description} disabled={disabled || busy} onChange={e => change({ description: e.target.value })} /></label>
      <fieldset disabled={disabled || busy}><legend>Milestones de esta versión</legend>
        {availableMilestones.map(title => <label className="gitlab-checkbox" key={title}><input type="checkbox" checked={draft.milestones.includes(title)}
          onChange={e => change({ milestones: e.target.checked ? [...draft.milestones, title] : draft.milestones.filter(item => item !== title) })} />{title}</label>)}
      </fieldset>
      {review ? <div className="gitlab-release-review"><strong>{draft.original ? 'Actualizar' : 'Publicar'}: {draft.name} · {draft.tag_name}</strong>
        <pre>{draft.description || 'Sin notas de entrega'}</pre><p>Milestones: {draft.milestones.join(', ') || 'Ninguno'}</p>
        <button type="button" className="btn btn-primary" disabled={disabled || busy} onClick={save}>Confirmar en GitLab</button></div>
        : <button className="btn btn-primary" disabled={disabled || busy}>Revisar versión</button>}
    </form>}
  </section>;
}
