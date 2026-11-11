import React from 'react';
import { TrendingUp } from 'lucide-react';
import { TASK_TYPES } from '../../utils/templateData';
import CustomGanttChart from '../CustomGanttChart';
import CardTitle from './CardTitle';

/** Tarjeta del Diagrama de Gantt con la leyenda de tipos de tarea. */
export default function GanttCard({ sprints, startDate, holidaySet, holidayList }) {
  return (
    <div className="card" style={{ padding: '1.5rem' }}>
      <CardTitle
        icon={<TrendingUp size={16} color="var(--color-primary-500)" />}
        iconBackground="var(--color-primary-50)"
      >
        Diagrama de Gantt
      </CardTitle>

      <div style={{ width: '100%', marginTop: '1rem' }}>
        <CustomGanttChart
          sprints={sprints}
          startDate={startDate}
          holidaySet={holidaySet}
          holidayList={holidayList}
        />
      </div>

      {/* Legend */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        justifyContent: 'center',
        marginTop: '0.75rem',
        flexWrap: 'wrap',
      }}>
        {Object.entries(TASK_TYPES).map(([key, config]) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem' }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '3px',
              background: config.color,
            }} />
            <span style={{ color: 'var(--color-text-secondary)' }}>{config.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
