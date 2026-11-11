import React, { useMemo } from 'react';
import { Layers } from 'lucide-react';
import { sumDurations } from '../../domain/metrics';
import CardTitle from './CardTitle';

/** Tabla de días y tareas por sprint, con barras relativas al sprint más largo. */
export default function SprintSummaryTable({ sprints, totals }) {
  // Mayor cantidad de días entre sprints, para escalar las barras
  const maxDays = useMemo(
    () => Math.max(1, ...sprints.map((sprint) => sumDurations(sprint.tasks))),
    [sprints],
  );

  return (
    <div className="card" style={{ padding: '1.5rem', overflow: 'hidden' }}>
      <CardTitle
        icon={<Layers size={16} color="var(--color-primary-500)" />}
        iconBackground="var(--color-primary-50)"
      >
        Resumen por Sprint
      </CardTitle>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{
              borderBottom: '2px solid var(--color-border)',
              fontSize: '0.75rem',
              fontWeight: 700,
              color: 'var(--color-text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem' }}>Sprint</th>
              <th style={{ textAlign: 'center', padding: '0.5rem 0.75rem' }}>Tareas</th>
              <th style={{ textAlign: 'center', padding: '0.5rem 0.75rem' }}>Días</th>
              <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem' }}>Distribución</th>
            </tr>
          </thead>
          <tbody>
            {sprints.map((sprint) => {
              const sprintDays = sumDurations(sprint.tasks);
              return (
                <tr key={sprint.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '0.75rem', fontWeight: 600 }}>{sprint.name}{sprint.productDelivery && <small className="dashboard-delivery-marker">Entrega del producto</small>}</td>
                  <td className="font-mono" style={{ textAlign: 'center', padding: '0.75rem', color: 'var(--color-text-secondary)' }}>
                    {sprint.tasks.length}
                  </td>
                  <td className="font-mono" style={{ textAlign: 'center', padding: '0.75rem', fontWeight: 700, color: 'var(--color-primary-600)' }}>
                    {sprintDays}
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <div style={{
                      height: '8px',
                      background: 'var(--color-bg)',
                      borderRadius: '4px',
                      overflow: 'hidden',
                      minWidth: '100px',
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${(sprintDays / maxDays) * 100}%`,
                        background: `linear-gradient(90deg, var(--color-primary-400), var(--color-primary-600))`,
                        borderRadius: '4px',
                        transition: 'width 0.5s ease',
                      }} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ background: 'var(--color-bg)' }}>
              <td style={{ padding: '0.75rem', fontWeight: 700 }}>Total</td>
              <td className="font-mono" style={{ textAlign: 'center', padding: '0.75rem', fontWeight: 700 }}>
                {totals.totalTasks}
              </td>
              <td className="font-mono" style={{ textAlign: 'center', padding: '0.75rem', fontWeight: 800, color: 'var(--color-primary-600)' }}>
                {totals.totalDays}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
