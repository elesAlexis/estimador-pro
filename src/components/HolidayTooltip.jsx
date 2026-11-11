import React from 'react';
import { CalendarDays } from 'lucide-react';
import { formatDate } from '../shared/calendarDate';
import Tooltip from './Tooltip';

/** Mismo contenido para festivos del calendario y del Gantt, también al tocar. */
export default function HolidayTooltip({ date, names, children }) {
  return <Tooltip showOnClick placement="top" maxWidth={280} content={
    <div className="holiday-tooltip">
      <span className="holiday-tooltip-label"><CalendarDays size={14} aria-hidden="true"/> FESTIVO EN COLOMBIA</span>
      <strong>{names || 'Día festivo'}</strong>
      <span>{formatDate(date)}</span>
      <small>No cuenta como día hábil en el cronograma.</small>
    </div>
  }>{children}</Tooltip>;
}
