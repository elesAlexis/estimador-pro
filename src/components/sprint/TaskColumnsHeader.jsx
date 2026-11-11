import React from 'react';
import { TASK_GRID_COLUMNS } from '../taskGrid';

/** Encabezados de columna de la lista de tareas de un sprint. */
export default function TaskColumnsHeader() {
  return (
    <div className="task-columns-header" aria-hidden="true" style={{
      display: 'grid',
      gridTemplateColumns: TASK_GRID_COLUMNS,
      gap: '0.5rem',
      padding: '0.5rem 1rem',
      borderBottom: '1px solid var(--color-border)',
      fontSize: '0.6875rem',
      fontWeight: 700,
      color: 'var(--color-text-muted)',
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
    }}>
      <div></div>
      <div style={{ textAlign: 'center' }}>WBS</div>
      <div>Tarea / Hito</div>
      <div>Responsable</div>
      <div style={{ textAlign: 'center' }}>Días</div>
      <div style={{ textAlign: 'center' }}>Prioridad</div>
      <div style={{ textAlign: 'center' }}>Calendario Estimado</div>
      <div></div>
    </div>
  );
}
