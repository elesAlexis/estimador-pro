import React from 'react';
import { formatDate } from '../../shared/calendarDate';
import { TASK_TYPES } from '../../utils/templateData';
import Tooltip from '../Tooltip';
import { ganttGridColumns, getBarPlacement, getTaskRanges, getScheduleComparison } from './ganttTimeline';

export default function GanttTaskRow({ task, minDate, totalDays }) {
  const type = TASK_TYPES[task.type] || TASK_TYPES.dev;
  const { planned, actual } = getTaskRanges(task);
  const comparison = getScheduleComparison(task);
  const showActual = actual && (!planned || comparison.differs);
  const progress = Math.max(0, Math.min(100, Number(task.progress) || 0));
  const title = task.title || 'Tarea sin nombre';
  const renderBar = (range, isActual) => {
    if (!range) return null;
    const placement = getBarPlacement(minDate, range.start, range.end);
    const label = `${isActual ? 'Real' : 'Programado'}: ${title}. ${formatDate(range.start)} — ${formatDate(range.end)}`;
    return <div className={`gantt-bar-slot ${isActual ? 'is-actual' : ''}`}
      style={{ gridColumn: `${placement.startCol + 1} / span ${placement.span}` }}>
      <Tooltip showOnClick maxWidth={300} content={<div className="gantt-tooltip">
        <small>{isActual ? 'FECHAS REALES' : 'PROGRAMADO'} · {type.label}</small>
        <strong>{title}</strong><span>{formatDate(range.start)} — {formatDate(range.end)}</span>
        <span>{task.duration} días hábiles · {progress}% completado</span>
        {task.role && <span>{task.role}</span>}
        {comparison.label && <span>{comparison.label}</span>}
      </div>}>
        <button type="button" className={`gantt-task-bar ${isActual ? 'is-actual' : ''}`} aria-label={`${label}. Avance ${progress}%`}
          style={{ '--task-color': type.color }}>
          {!isActual && <span className="gantt-progress-fill" style={{ width: `${progress}%` }} />}
          <span className="gantt-bar-text">{isActual ? 'Real' : `${task.duration}d · ${progress}%`}</span>
        </button>
      </Tooltip>
    </div>;
  };
  return <div className={`gantt-task ${showActual ? 'has-actual' : ''}`} style={{ gridTemplateColumns: ganttGridColumns(totalDays) }}>
    <div className="gantt-sticky gantt-task-label">
      <div><span className="gantt-type-dot" style={{ background: type.color }} /><span className="gantt-task-name">{title}</span>
        <small className="gantt-task-percent">{progress}%</small></div>
      <span className="gantt-task-role">{task.role || type.label}</span>
      {progress === 100 && <span className="gantt-task-role status-complete">✓ Completada</span>}
      {comparison.differs && <span className="gantt-task-role schedule-difference">{comparison.label}</span>}
    </div>
    {renderBar(planned, false)}
    {showActual && renderBar(actual, true)}
    {!planned && <span className="gantt-unscheduled">{task.calculatedEnd ? `Entrega: ${formatDate(task.calculatedEnd)} · Sin inicio`
      : task.calculatedStart ? `Inicio: ${formatDate(task.calculatedStart)} · Sin entrega` : 'Sin fechas programadas'}</span>}
  </div>;
}
