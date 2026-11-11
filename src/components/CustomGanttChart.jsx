import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import GanttTimelineHeader from './gantt/GanttTimelineHeader';
import GanttTaskRow from './gantt/GanttTaskRow';
import { DAY_STYLES, buildGanttTimeline, ganttGridColumns, getDayKind } from './gantt/ganttTimeline';
import { useDragScroll } from './gantt/useDragScroll';
import { formatDate, toDateKey } from '../shared/calendarDate';
import { getSprintCompletion } from '../domain/metrics';

export default function CustomGanttChart({ sprints, startDate, holidaySet, holidayList }) {
  const [collapsedSprints, setCollapsedSprints] = useState({});
  const [wideDays, setWideDays] = useState(false);
  const { ref, isDragging, handlers } = useDragScroll();
  const { dates, minDate, totalDays } = useMemo(() => buildGanttTimeline(sprints, startDate), [sprints, startDate]);
  if (!totalDays) return <p className="gantt-empty">Añade tareas y una fecha de inicio para ver el cronograma.</p>;
  const gridTemplateColumns = ganttGridColumns(totalDays);
  const allCollapsed = sprints.every(s => collapsedSprints[s.id]);
  const today = toDateKey(new Date());
  const todayIndex = dates.findIndex(date => toDateKey(date) === today);

  // Centra la columna de hoy: el desplazamiento cuenta desde el inicio de la
  // grilla, así que hay que sumar la columna fija de nombres de tarea.
  const goToToday = () => {
    const node = ref.current;
    if (!node || todayIndex < 0) return;
    const styles = getComputedStyle(node);
    const dayWidth = parseFloat(styles.getPropertyValue('--gantt-day-width')) || 32;
    const labelWidth = parseFloat(styles.getPropertyValue('--gantt-label-width')) || 250;
    // El ancho visible descuenta la columna fija de nombres, que tapa la izquierda.
    const centered = labelWidth + todayIndex * dayWidth - (node.clientWidth - labelWidth) / 2;
    node.scrollTo({ left: Math.max(0, centered), behavior: 'smooth' });
  };

  return <div className="gantt-workspace">
    <div className="gantt-toolbar">
      <div><strong>{sprints.reduce((sum, s) => sum + s.tasks.length, 0)} tareas · {sprints.length} sprints</strong>
        <span>{formatDate(dates[0])} — {formatDate(dates.at(-1))}</span></div>
      <div className="gantt-toolbar-actions">
        {todayIndex >= 0
          ? <button type="button" onClick={goToToday}>Ir a hoy</button>
          : <span className="gantt-today-out">Hoy queda fuera del cronograma</span>}
        <button type="button" aria-pressed={wideDays} onClick={() => setWideDays(v => !v)}>Ampliar días</button>
        <button type="button" onClick={() => setCollapsedSprints(Object.fromEntries(sprints.map(s => [s.id, !allCollapsed])))}>
          {allCollapsed ? 'Expandir todo' : 'Contraer todo'}
        </button>
      </div>
    </div>
    <div className="custom-gantt-container gantt-scroll" role="region"
      aria-label="Cronograma Gantt. Usa las flechas para desplazarte y Tab para consultar tareas y festivos."
      tabIndex={0} ref={ref} {...handlers}
      style={{ '--gantt-day-width': wideDays ? '48px' : '32px', cursor: isDragging ? 'grabbing' : 'grab' }}>
      <div className="gantt-grid" style={{ gridTemplateColumns }}>
        <GanttTimelineHeader dates={dates} holidaySet={holidaySet} holidayList={holidayList} today={today} />
        <div className="gantt-background" aria-hidden="true">
          {dates.map(d => <div key={toDateKey(d)} className={toDateKey(d) === today ? 'gantt-today-column' : ''}
            style={{ background: DAY_STYLES[getDayKind(d, holidaySet)].bg }} />)}
        </div>
        {sprints.map(sprint => <React.Fragment key={sprint.id}>
          <div className="gantt-sprint" style={{ gridTemplateColumns }}>
            <button type="button" className="gantt-sticky gantt-sprint-toggle"
              aria-expanded={!collapsedSprints[sprint.id]}
              aria-label={`${collapsedSprints[sprint.id] ? 'Expandir' : 'Contraer'} ${sprint.name} en el Gantt`}
              onClick={() => setCollapsedSprints(prev => ({ ...prev, [sprint.id]: !prev[sprint.id] }))}>
              {collapsedSprints[sprint.id] ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
              <span>{sprint.name}</span><small>{sprint.tasks.length}</small>
            </button>
            <span className="gantt-sprint-caption">{getSprintCompletion(sprint.tasks).isComplete ? '✓ Sprint completado' : `${getSprintCompletion(sprint.tasks).completed} de ${sprint.tasks.length} completadas`}</span>
          </div>
          {!collapsedSprints[sprint.id] && sprint.tasks.map(task =>
            <GanttTaskRow key={task.id} task={task} minDate={minDate} totalDays={totalDays} />)}
        </React.Fragment>)}
      </div>
    </div>
    <div className="gantt-guide">
      <span><i className="gantt-key-today" /> Hoy</span>
      <span><i className="gantt-key-planned" /> Programado · relleno = avance</span>
      <span><i className="gantt-key-actual" /> Fechas reales diferentes</span>
      <span><i className="gantt-key-holiday" /> Festivo</span>
      <span><i className="gantt-key-weekend" /> Fin de semana</span>
    </div>
    <p className="gantt-hint">Desplázate para recorrer las fechas. Consulta las barras y los festivos con el cursor, el teclado o un toque.</p>
  </div>;
}
