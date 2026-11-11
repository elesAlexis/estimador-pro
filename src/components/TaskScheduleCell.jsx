import React, { useState } from 'react';
import { formatDate } from '../shared/calendarDate';
import { getHolidaysNear } from '../domain/holidays';
import { useHolidays } from '../context/ProjectContext';
import Tooltip from './Tooltip';
import TaskCalendarModal from './TaskCalendarModal';

// Días de calendario alrededor de la tarea en los que se avisa de festivos cercanos
const NEARBY_HOLIDAY_MARGIN_DAYS = 2;

/**
 * Celda con las fechas calculadas de una tarea. Marca con 🇨🇴 los festivos
 * cercanos y, al hacer clic, abre la tarea en un calendario.
 */
export default function TaskScheduleCell({ task }) {
  const { holidayList, holidaySource, calendarReady } = useHolidays();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const nearbyHolidays = getHolidaysNear(holidayList, task.calculatedStart, task.calculatedEnd, NEARBY_HOLIDAY_MARGIN_DAYS);

  return (
    <>
      <Tooltip content="Clic para ver en el calendario" placement="top">
        <button
          type="button"
          disabled={!task.calculatedStart || !task.calculatedEnd}
          aria-label={`Ver calendario de ${task.title}`}
          className="font-mono"
          onClick={() => {
            if (task.calculatedStart && task.calculatedEnd) {
              setIsCalendarOpen(true);
            }
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.4rem',
            background: 'var(--color-bg)',
            borderRadius: 'var(--radius-md)',
            padding: '0.375rem 0.5rem',
            fontSize: '0.6875rem',
            alignSelf: 'flex-start',
            marginTop: '0.1rem',
            cursor: 'pointer',
            border: '1px solid transparent',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--color-primary-50)';
            e.currentTarget.style.borderColor = 'var(--color-primary-200)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--color-bg)';
            e.currentTarget.style.borderColor = 'transparent';
          }}
        >
          {task.scheduleMode === 'imported' ? <span>
            {task.calculatedStart ? `Inicio: ${formatDate(task.calculatedStart)}` : 'Sin fecha de inicio'}
            {' · '}{task.calculatedEnd ? `Entrega: ${formatDate(task.calculatedEnd)}` : 'Sin fecha de entrega'}
          </span> : !calendarReady ? <span>{holidaySource === 'loading' ? 'Cargando calendario…' : 'Calendario no disponible'}</span> : !task.calculatedStart ? <span>Duración pendiente</span> : <>
            <span style={{ color: 'var(--color-text-secondary)' }}>{formatDate(task.calculatedStart)}</span>
            <span style={{ color: 'var(--color-text-muted)' }}>→</span>
            <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>{formatDate(task.calculatedEnd)}</span>
          </>}
          {nearbyHolidays.length > 0 && (
            <span style={{ fontSize: '0.8125rem' }} title={nearbyHolidays.map(h => `📅 ${h.date}: ${h.name}`).join('\n')}>
              🇨🇴
            </span>
          )}
        </button>
      </Tooltip>

      <TaskCalendarModal
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
        task={task}
      />
    </>
  );
}
