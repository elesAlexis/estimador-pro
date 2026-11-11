import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutTemplate, BarChart3, Download, Upload, CheckSquare, Plus, FileDown, FileCode2, ChevronDown, Folder, Gitlab } from 'lucide-react';
import { useProjectActions, useProjectState } from '../context/ProjectContext';
import { exportToJSON, importFromJSON } from '../utils/jsonBackup';
import ConfirmModal from './ConfirmModal';

export default function Header() {
  const { projectInfo, calculatedSprints, totals, sprints, exportDisabledReason } = useProjectState();
  const { replaceProject, loadTemplate, addSprint } = useProjectActions();
  const fileInputRef = React.useRef(null);
  const [showTemplateConfirm, setShowTemplateConfirm] = React.useState(false);
  const [showExportMenu, setShowExportMenu] = React.useState(false);
  const [notice, setNotice] = React.useState(null); // { title, message } de un error a informar


  const handleLoadTemplate = () => {
    if (sprints.length > 0) {
      setShowTemplateConfirm(true);
    } else {
      loadTemplate();
    }
  };

  const handleExportPDF = async () => {
    if (exportDisabledReason) return;
    try {
      // jsPDF es pesado: se descarga solo cuando se exporta
      const { exportToPDF } = await import('../utils/pdfExport');
      exportToPDF(projectInfo, calculatedSprints, totals);
    } catch (err) {
      setNotice({ title: 'No se pudo generar el PDF', message: err.message });
    }
  };

  const handleExportHTML = async () => {
    if (exportDisabledReason) return;
    try {
      // El informe y su armado se descargan solo al exportar: Header está en el
      // bundle inicial y un import estático los arrastraría a la primera carga.
      const [{ buildProgressReport }, { exportProgressToHtml }] = await Promise.all([
        import('../domain/progressReport'),
        import('../utils/htmlProgressExport'),
      ]);
      const report = buildProgressReport(projectInfo, calculatedSprints, totals);
      // Comentarios ya guardados del repositorio, indexados por tarea.
      const comments = Object.fromEntries(calculatedSprints.flatMap(sprint => sprint.tasks
        .filter(task => task.remoteComments?.length)
        .map(task => [task.id, task.remoteComments])));
      exportProgressToHtml(report, comments);
    } catch (err) {
      setNotice({ title: 'No se pudo generar el informe', message: err.message });
    }
  };

  const handleExportJSON = () => {
    exportToJSON(projectInfo, sprints);
  };

  const handleImportJSON = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const data = await importFromJSON(file, projectInfo);
      replaceProject(data);
    } catch (err) {
      setNotice({ title: 'No se pudo importar el archivo', message: err.message });
    }
    e.target.value = '';
  };

  return (
    <header className="app-header">
      <div className="header-shell">
        {/* Top bar */}
        <div className="header-top">
          {/* Logo */}
          <div className="header-brand">
            <div className="header-mark">
              <LayoutTemplate size={21} aria-hidden="true" />
            </div>
            <div>
              <h1>
                Estimador Pro
              </h1>
              <span className="header-tagline">
                Planifica · organiza · da seguimiento
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="header-actions">
            <button aria-label="Plantilla Base" onClick={handleLoadTemplate} className="btn btn-sm header-quiet-action">
              <CheckSquare size={15} />
              <span>Plantilla base</span>
            </button>


            <button
              onClick={() => addSprint()}
              aria-label="Nuevo Sprint"
              className="btn btn-sm header-primary-action"
            >
              <Plus size={15} />
              <span>Nuevo sprint</span>
            </button>

            {/* Export dropdown */}
            <div style={{ position: 'relative' }} onKeyDown={e => {
              if (e.key === 'Escape') { setShowExportMenu(false); e.currentTarget.querySelector('button').focus(); }
            }}>
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                aria-label="Exportar"
                aria-expanded={showExportMenu}
                aria-controls="export-options"
                className="btn btn-sm header-export-action"
              >
                <FileDown size={15} />
                <span>Exportar</span><ChevronDown size={12} aria-hidden="true" />
              </button>

              {showExportMenu && (
                <>
                  <div
                    style={{ position: 'fixed', inset: 0, zIndex: 40 }}
                    onClick={() => setShowExportMenu(false)}
                  />
                  <div id="export-options" className="animate-slide-down" style={{
                    position: 'absolute',
                    right: 0,
                    top: 'calc(100% + 4px)',
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: 'var(--shadow-lg)',
                    padding: '0.375rem',
                    zIndex: 50,
                    width: 'min(280px, calc(100vw - 48px))'
                  }}>
                    <button
                      onClick={() => { handleExportPDF(); setShowExportMenu(false); }}
                      disabled={Boolean(exportDisabledReason)}
                      aria-describedby={exportDisabledReason ? 'export-disabled-reason' : undefined}
                      className="btn btn-ghost btn-sm"
                      style={{ width: '100%', justifyContent: 'flex-start', borderRadius: 'var(--radius-md)' }}
                    >
                      <Download size={14} />
                      Exportar PDF
                    </button>
                    <button
                      onClick={() => { handleExportHTML(); setShowExportMenu(false); }}
                      disabled={Boolean(exportDisabledReason)}
                      aria-describedby={exportDisabledReason ? 'export-disabled-reason' : undefined}
                      className="btn btn-ghost btn-sm"
                      style={{ width: '100%', justifyContent: 'flex-start', borderRadius: 'var(--radius-md)' }}
                    >
                      <FileCode2 size={14} />
                      Exportar informe HTML
                    </button>
                    {exportDisabledReason && <p id="export-disabled-reason" style={{ fontSize: '0.75rem', padding: '0.5rem' }}>{exportDisabledReason}</p>}
                    <button
                      onClick={() => { handleExportJSON(); setShowExportMenu(false); }}
                      className="btn btn-ghost btn-sm"
                      style={{ width: '100%', justifyContent: 'flex-start', borderRadius: 'var(--radius-md)' }}
                    >
                      <Download size={14} />
                      Descargar respaldo JSON
                    </button>
                    <div style={{ height: '1px', background: 'var(--color-border)', margin: '0.25rem 0' }} />
                    <button
                      onClick={() => { fileInputRef.current?.click(); setShowExportMenu(false); }}
                      className="btn btn-ghost btn-sm"
                      style={{ width: '100%', justifyContent: 'flex-start', borderRadius: 'var(--radius-md)' }}
                    >
                      <Upload size={14} />
                      Importar JSON
                    </button>
                  </div>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={handleImportJSON}
            />
          </div>
        </div>

        {/* Nav tabs */}
        <div className="header-bottom">
        <nav className="header-navigation" aria-label="Vistas del proyecto">
          <NavLink
            to="/"
            end
            className={({ isActive }) => `nav-tab ${isActive ? 'nav-tab-active' : ''}`}
          >
            <LayoutTemplate size={16} />
            Cronograma
          </NavLink>
          <NavLink
            to="/dashboard"
            className={({ isActive }) => `nav-tab ${isActive ? 'nav-tab-active' : ''}`}
          >
            <BarChart3 size={16} />
            Dashboard
          </NavLink>
          <NavLink to="/gitlab" className={({ isActive }) => `nav-tab ${isActive ? 'nav-tab-active' : ''}`}>
            <Gitlab size={16} />GitLab
          </NavLink>
        </nav>
        <div className="header-project"><Folder size={14} aria-hidden="true" /><span>{projectInfo.name || 'Proyecto sin nombre'}</span></div>
        </div>
      </div>

      <ConfirmModal
        isOpen={showTemplateConfirm}
        onClose={() => setShowTemplateConfirm(false)}
        onConfirm={() => loadTemplate()}
        title="Cargar plantilla base"
        message="¿Seguro que deseas cargar la plantilla? Esto borrará tus datos actuales."
        confirmText="Cargar plantilla"
      />

      <ConfirmModal
        isOpen={notice !== null}
        onClose={() => setNotice(null)}
        title={notice?.title}
        message={notice?.message}
        confirmText="Entendido"
        showCancel={false}
      />
    </header>
  );
}
