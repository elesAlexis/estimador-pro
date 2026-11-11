/**
 * Respaldo del proyecto en JSON: descarga e importación.
 */
import { normalizeProject } from '../application/projectValidation';
import { publicIntegration } from '../domain/integration';

export function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

export const exportToJSON = (projectInfo, sprints) => {
  const exportData = {
    projectInfo: {
      ...projectInfo,
      integration: projectInfo.integration ? publicIntegration(projectInfo.integration) : undefined,
    },
    sprints,
    exportedAt: new Date().toISOString(),
  };
  downloadJSON(exportData, `${projectInfo.name.replace(/\s+/g, '_') || 'Proyecto'}_backup.json`);
};

/** Lee un archivo de respaldo; rechaza si no es JSON o si los sprints no tienen una estructura válida. */
export const importFromJSON = (file, fallback) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        resolve(normalizeProject(data, fallback));
      } catch (error) {
        reject(error instanceof SyntaxError ? new Error('Error al leer el archivo JSON') : error);
      }
    };
    reader.onerror = () => reject(new Error('Error al leer el archivo JSON'));
    reader.readAsText(file);
  });
};
