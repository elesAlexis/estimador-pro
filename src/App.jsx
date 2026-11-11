import React, { Suspense, lazy } from 'react';
import { HashRouter, Navigate, Routes, Route } from 'react-router-dom';
import { ProjectProvider } from './context/ProjectContext';
import { createLocalStorageProjectRepository } from './infrastructure/localStorageProjectRepository';
import { createHolidayProvider } from './infrastructure/holidayProvider';
import { createGitlabSession } from './infrastructure/gitlabOAuth';
import { createGitlabApi } from './infrastructure/gitlabApi';
import { createGitlabJournal } from './infrastructure/gitlabJournal';
import ErrorBoundary from './components/ErrorBoundary';
import Header from './components/Header';
import BackupPanel from './components/BackupPanel';
import { createHttpBackupRepository } from './infrastructure/httpBackupRepository';
import EstimatorPage from './pages/EstimatorPage';
import PersistenceNotice from './components/PersistenceNotice';
import { GitlabProvider } from './context/GitlabContext';

// El Dashboard (recharts) se descarga solo cuando se abre, para aligerar la carga inicial.
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const GitlabPage = lazy(() => import('./pages/GitlabPage'));

// Composition root: el único lugar donde se eligen las implementaciones de
// infraestructura que usa la aplicación.
const projectRepository = createLocalStorageProjectRepository();
const holidayProvider = createHolidayProvider();
const gitlabJournal = createGitlabJournal();
const backupRepository = import.meta.env.VITE_STORAGE_BACKUPS === 'true' ? createHttpBackupRepository() : null;

// Configuración por defecto de GitLab: la del proyecto guardado tiene prioridad.
const gitlabDefaults = {
  url: import.meta.env.VITE_GITLAB_URL || '',
  clientId: import.meta.env.VITE_GITLAB_CLIENT_ID || '',
  repo: import.meta.env.VITE_GITLAB_PROJECT || '',
  redirectUri: new URL(import.meta.env.BASE_URL, window.location.origin).href,
};

const pageFallback = (
  <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '3rem 0' }}>
    Cargando…
  </p>
);

export default function App() {
  return (
    <HashRouter>
      <ProjectProvider repository={projectRepository} holidayProvider={holidayProvider}>
        <GitlabProvider createSession={createGitlabSession} createApi={createGitlabApi}
          journal={gitlabJournal} defaults={gitlabDefaults}>
        <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
          <Header />
          <main tabIndex={-1} id="main-content" style={{
            maxWidth: '1280px',
            margin: '0 auto',
            padding: '1.5rem',
            paddingBottom: '4rem',
          }}>
            <PersistenceNotice />
            {backupRepository && <BackupPanel repository={backupRepository} />}
            <ErrorBoundary>
              <Suspense fallback={pageFallback}>
                <Routes>
                  <Route path="/" element={<EstimatorPage />} />
                  <Route path="/dashboard" element={<DashboardPage />} />
                  {/* Rutas anteriores: los enlaces ya compartidos siguen funcionando. */}
                  <Route path="/analisis" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/analisis/avance" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/avance" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/gitlab" element={<GitlabPage />} />
                </Routes>
              </Suspense>
            </ErrorBoundary>
          </main>
        </div>
        </GitlabProvider>
      </ProjectProvider>
    </HashRouter>
  );
}
