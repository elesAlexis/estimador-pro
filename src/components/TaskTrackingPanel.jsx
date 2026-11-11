import React, { useId } from 'react';
import { formatDate } from '../shared/calendarDate';

export default function TaskTrackingPanel({ task, onUpdate, onConfirmDates }) {
  const id = useId();
  const hasPlan = Boolean(task.calculatedStart && task.calculatedEnd);
  const matches = hasPlan && task.realStart === task.calculatedStart && task.realEnd === task.calculatedEnd;
  return <div className="task-details">
    <strong>Seguimiento de fechas</strong>
    <p>Programado: {hasPlan ? `${formatDate(task.calculatedStart)} — ${formatDate(task.calculatedEnd)}` : 'Pendiente de programar'}</p>
    <fieldset className="task-real-dates">
      <legend>Fechas reales registradas</legend>
      <label htmlFor={`${id}-start`}>Inicio
        <input id={`${id}-start`} className="input" type="date" value={task.realStart ?? ''}
          max={task.realEnd || undefined} onChange={e=>onUpdate('realStart',e.target.value)}/>
      </label>
      <label htmlFor={`${id}-end`}>Fin
        <input id={`${id}-end`} className="input" type="date" value={task.realEnd ?? ''}
          min={task.realStart || undefined} onChange={e=>onUpdate('realEnd',e.target.value)}/>
      </label>
    </fieldset>
    <div className="tracking-date-confirm">
      <button type="button" className="btn btn-secondary btn-sm" disabled={!hasPlan || matches} onClick={onConfirmDates}>Confirmar mismas fechas</button>
      <span role="status">{matches ? '✓ Fechas reales iguales a las programadas.' : 'Confirma solo cuando haya ocurrido. Las fechas registradas se conservan si cambia la planificación.'}</span>
    </div>
  </div>;
}
