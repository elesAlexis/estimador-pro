import React from 'react';
import HolidayTooltip from '../HolidayTooltip';
import { toDateKey } from '../../shared/calendarDate';
import { DAY_STYLES, ganttGridColumns, getDayKind, groupDatesByMonth } from './ganttTimeline';

export default function GanttTimelineHeader({ dates, holidaySet, holidayList = [], today }) {
  const gridTemplateColumns = ganttGridColumns(dates.length);
  return <>
    <div className="gantt-months" style={{ gridTemplateColumns }}>
      <div className="gantt-sticky gantt-corner">Tarea / responsable</div>
      {groupDatesByMonth(dates).map((month, i) => <div key={i} className="gantt-month"
        style={{ gridColumn: `span ${month.span}` }}><span>{month.name}</span></div>)}
    </div>
    <div className="gantt-days" style={{ gridTemplateColumns }}>
      <div className="gantt-sticky gantt-corner gantt-corner-secondary">Avance de cada tarea</div>
      {dates.map(date => {
        const key = toDateKey(date);
        const kind = getDayKind(date, holidaySet);
        const names = holidayList.filter(h => h.date === key).map(h => h.name).join(' · ');
        const Day = kind === 'holiday' ? 'button' : 'div';
        const cell = <Day key={key} type={kind === 'holiday' ? 'button' : undefined}
          aria-label={kind === 'holiday' ? `${key}: ${names || 'Festivo'}` : undefined}
          aria-current={key === today ? 'date' : undefined} className="gantt-day"
          style={{ background: DAY_STYLES[kind].bg, color: DAY_STYLES[kind].color }}>
          <small>{key === today ? 'HOY' : date.toLocaleDateString('es-CO', { weekday: 'narrow' })}</small>
          <span>{date.getDate()}</span>
        </Day>;
        return kind === 'holiday' ? <HolidayTooltip key={key} date={key} names={names}>{cell}</HolidayTooltip> : cell;
      })}
    </div>
  </>;
}