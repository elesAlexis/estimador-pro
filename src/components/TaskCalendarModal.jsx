import React, { useMemo } from 'react';
import { X } from 'lucide-react';
import { useHolidays } from '../context/ProjectContext';
import { parseCalendarDate, toDateKey } from '../shared/calendarDate';
import Dialog from './Dialog';
import HolidayTooltip from './HolidayTooltip';

const DAYS_OF_WEEK = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

function getMonthsRange(startStr, endStr) {
  const start = parseCalendarDate(startStr);
  const end = parseCalendarDate(endStr);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];
  
  const months = [];
  let current = new Date(start.getFullYear(), start.getMonth(), 1);
  const endLimit = new Date(end.getFullYear(), end.getMonth(), 1);

  while (current <= endLimit) {
    months.push(new Date(current));
    current.setMonth(current.getMonth() + 1);
  }
  
  return months;
}

export default function TaskCalendarModal({ isOpen, onClose, task }) {
  const { holidaySet, holidayList } = useHolidays();

  const calendarMonths = useMemo(() => {
    if (!task || !task.calculatedStart || !task.calculatedEnd) return [];
    
    const start = parseCalendarDate(task.calculatedStart);
    start.setHours(0,0,0,0);
    const end = parseCalendarDate(task.calculatedEnd);
    end.setHours(0,0,0,0);
    
    const months = getMonthsRange(task.calculatedStart, task.calculatedEnd);
    
    return months.map(monthDate => {
      const year = monthDate.getFullYear();
      const month = monthDate.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const firstDay = new Date(year, month, 1).getDay();
      
      const grid = [];
      // Pad empty
      for (let i = 0; i < firstDay; i++) {
        grid.push(null);
      }
      
      for (let i = 1; i <= daysInMonth; i++) {
        const d = new Date(year, month, i);
        d.setHours(0,0,0,0);
        
        const dateKey = toDateKey(d);
        
        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
        const isHoliday = holidaySet?.has(dateKey);
        
        const isTaskDay = d >= start && d <= end && !isWeekend && !isHoliday; // is inside task duration and working day
        
        let holidayName = null;
        if (isHoliday) {
           holidayName = holidayList.filter(h => h.date === dateKey).map(h => h.name).join(' · ');
        }

        grid.push({
          date: d,
          dateKey,
          dayNum: i,
          isWeekend,
          isHoliday,
          holidayName,
          isTaskDay
        });
      }
      return {
        year,
        month,
        title: `${MONTHS[month]} ${year}`,
        grid
      };
    });
  }, [task, holidaySet, holidayList]);

  if (!isOpen || !task) return null;

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={task.title || 'Calendario de la tarea'} className="calendar-dialog">
      <div className="card animate-fade-in-up" style={{
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: '0 10px 40px -10px rgba(0,0,0,0.15)',
        width: '100%', maxWidth: '340px',
        maxHeight: '90vh', display: 'flex', flexDirection: 'column'
      }}>
        {/* Header Minimalista */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '1rem 1.25rem', borderBottom: '1px solid var(--color-border)'
        }}>
          <div>
            <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>
              {task.duration} días hábiles
            </span>
          </div>
          <button data-dialog-initial aria-label="Cerrar calendario" onClick={onClose} className="icon-button" style={{ padding: '0.25rem', borderRadius: '50%' }}>
            <X size={16} color="var(--color-text-muted)" />
          </button>
        </div>

        {/* Contenido del Calendario */}
        <div style={{ padding: '1.25rem', overflowY: 'auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {calendarMonths.map((m, idx) => (
              <div key={idx}>
                <h4 style={{ 
                  fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', 
                  marginBottom: '0.75rem', textAlign: 'center', textTransform: 'capitalize' 
                }}>
                  {m.title}
                </h4>
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px'
                }}>
                  {/* Días de la semana */}
                  {DAYS_OF_WEEK.map(day => (
                    <div key={day} style={{
                      textAlign: 'center', fontSize: '0.625rem', fontWeight: 600,
                      color: 'var(--color-text-muted)', paddingBottom: '0.375rem'
                    }}>
                      {day.charAt(0)}
                    </div>
                  ))}
                  
                  {/* Cuadrícula */}
                  {m.grid.map((day, i) => {
                    if (!day) return <div key={i} />;
                    
                    let bg = 'transparent';
                    let color = 'var(--color-text-primary)';
                    let fontWeight = 400;
                    let opacity = 1;
                    
                    if (day.isTaskDay) {
                      bg = 'var(--color-primary-100)';
                      color = 'var(--color-primary-700)';
                      fontWeight = 600;
                    } else if (day.isHoliday) {
                      bg = '#fee2e2';
                      color = '#b91c1c';
                      fontWeight = 600;
                    } else if (day.isWeekend) {
                      color = 'var(--color-text-muted)';
                      opacity = 0.4;
                    }

                    const Day = day.isHoliday ? 'button' : 'div';
                    const cell = (
                      <Day key={i} type={day.isHoliday ? 'button' : undefined}
                        aria-label={day.isHoliday ? `${day.dateKey}: ${day.holidayName || 'Festivo'}` : undefined} style={{
                        aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: '100%', padding: 0, border: 'none',
                        background: bg, borderRadius: '6px',
                        color, fontSize: '0.75rem', fontWeight, opacity,
                        position: 'relative', cursor: day.isHoliday ? 'help' : 'default'
                      }}>
                        {day.dayNum}
                        {day.isHoliday && (
                          <span style={{ 
                            position: 'absolute', bottom: '3px', 
                            width: '3px', height: '3px', background: '#ef4444', borderRadius: '50%' 
                          }} />
                        )}
                      </Day>
                    );
                    return day.isHoliday ? <HolidayTooltip key={i} date={day.dateKey} names={day.holidayName}>{cell}</HolidayTooltip> : cell;
                  })}
                </div>
              </div>
            ))}
          </div>
          
          {/* Leyenda Minimalista */}
          <div style={{
            display: 'flex', gap: '0.875rem', marginTop: '1.5rem', 
            fontSize: '0.625rem', color: 'var(--color-text-muted)',
            justifyContent: 'center', fontWeight: 500
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <div style={{ width: 6, height: 6, background: 'var(--color-primary-400)', borderRadius: '50%' }} />
              <span>Días de Tarea</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <div style={{ width: 6, height: 6, background: 'transparent', border: '1px solid var(--color-border)', borderRadius: '50%' }} />
              <span>Fin de Semana</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <div style={{ width: 6, height: 6, background: '#ef4444', borderRadius: '50%' }} />
              <span>Festivo</span>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
