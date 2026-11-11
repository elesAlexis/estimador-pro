import React, { useEffect, useState } from 'react';
import Dialog from './Dialog';
import { useProjectActions } from '../context/ProjectContext';
import { useGitlab } from '../context/GitlabContext';
import { gitlabOrigin } from '../domain/integration';

export default function IntegrationModal({ isOpen, onClose }) {
  const connection = useGitlab();
  const { setIntegrationConfig } = useProjectActions();
  const [values, setValues] = useState({ url: '', repo: '', clientId: '' });
  const [error, setError] = useState('');
  useEffect(() => {
    if (isOpen) { setValues({ url: connection.server, repo: connection.repo, clientId: connection.clientId }); setError(''); }
  }, [isOpen, connection.server, connection.repo, connection.clientId]);
  return <Dialog isOpen={isOpen} onClose={onClose} title="Conexión con GitLab">
    <form className="gitlab-form" onSubmit={async e => {
      e.preventDefault();
      try {
        const url = gitlabOrigin(values.url.trim());
        await connection.session.logout();
        setIntegrationConfig({ provider: 'gitlab', url, repo: values.repo.trim(), clientId: values.clientId.trim() });
        onClose();
      } catch (err) { setError(err.message); }
    }}>
      <p>Completa la configuración o define estos valores en tu archivo .env antes de compilar.</p>
      <label>Servidor GitLab<input className="input" type="url" required value={values.url} onChange={e => setValues({ ...values, url: e.target.value })} placeholder="https://gitlab.example.com" /></label>
      <label>Proyecto (grupo/proyecto o ID)<input className="input" required value={values.repo} onChange={e => setValues({ ...values, repo: e.target.value })} /></label>
      <label>Application ID de OAuth<input className="input" required value={values.clientId} onChange={e => setValues({ ...values, clientId: e.target.value })} /></label>
      <p>Dirección de retorno que debes registrar en GitLab: <code>{connection.redirectUri}</code></p>
      <p>Usa una aplicación OAuth pública, con PKCE y permiso api. Este permiso puede abarcar otros proyectos accesibles a tu cuenta; el selector de proyecto limita las operaciones de esta interfaz.</p>
      {error && <p role="alert">{error}</p>}
      <div className="dialog-actions"><button type="button" className="btn btn-secondary" data-dialog-initial onClick={onClose}>Cancelar</button><button className="btn btn-primary">Guardar configuración</button></div>
    </form>
  </Dialog>;
}
