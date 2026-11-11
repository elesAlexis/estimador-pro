import React from 'react';
import { Layers3 } from 'lucide-react';
import CardTitle from './CardTitle';

/**
 * Avance por módulo: usa las etiquetas "módulo:" que llegan de GitLab y, cuando
 * no las hay, agrupa por tipo de tarea (`getTaskModule` en domain/progressReport).
 */
export default function ModuleProgressCard({ modules }) {
  return (
    <div className="card" style={{ padding: '1.5rem' }}>
      <CardTitle
        icon={<Layers3 size={16} color="var(--color-primary-500)" />}
        iconBackground="var(--color-primary-50)"
      >
        Avance por Módulo
      </CardTitle>

      <div className="module-progress-grid">
        {modules.map((module) => (
          <article key={module.name}>
            <div>
              <span>
                <strong>{module.name}</strong>
                <small>{module.completed} de {module.tasks} completadas</small>
              </span>
              <b className="font-mono">{module.progress}%</b>
            </div>
            <div className="module-progress-bar" role="progressbar" aria-label={`Avance de ${module.name}`}
              aria-valuemin="0" aria-valuemax="100" aria-valuenow={module.progress}>
              <span style={{ width: `${module.progress}%` }} />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
