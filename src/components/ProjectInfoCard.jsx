import React from 'react';
import { Calendar, User } from 'lucide-react';
import { useHolidays, useProjectActions, useProjectState } from '../context/ProjectContext';
import { formatDate } from '../shared/calendarDate';

export default function ProjectInfoCard() {
  const { projectInfo, totals, calendarValidation } = useProjectState();
  const { setProjectInfo } = useProjectActions();
  const { holidaySource, holidayCount } = useHolidays();

  const holidayLabel = () => {
    switch (holidaySource) {
      case 'loading': return { text: 'Cargando festivos...', color: 'var(--color-text-muted)', bg: 'var(--color-surface-muted)' };
      case 'error': return { text: 'Festivos no disponibles', color: 'var(--color-danger)', bg: 'var(--color-danger-bg)' };
      default: return { text: `Excluyendo ${holidayCount} festivos`, color: 'var(--color-secondary-blue-600)', bg: 'var(--color-secondary-blue-50)' };
    }
  };

  return (
    <section className="card animate-fade-in-up" style={{ padding: '1.5rem' }}>
      <h2 style={{
        fontSize: '1rem',
        fontWeight: 700,
        color: 'var(--color-text-primary)',
        marginBottom: '1.25rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
      }}>
        <span style={{
          background: 'var(--color-primary-50)',
          borderRadius: 'var(--radius-md)',
          padding: '0.375rem',
          display: 'inline-flex'
        }}>
          <Calendar size={16} color="var(--color-primary)" />
        </span>
        Configuración del Proyecto
      </h2>

      {/* Contenedor de Inputs */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1.25rem',
        marginBottom: '1.5rem'
      }}>
        {/* Nombre del Proyecto */}
        <div>
          <label htmlFor="project-name" style={{
            display: 'block',
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'var(--color-text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '0.375rem'
          }}>
            Nombre del Proyecto
          </label>
          <input
            id="project-name"
            type="text"
            value={projectInfo.name}
            onChange={(e) => setProjectInfo({ ...projectInfo, name: e.target.value })}
            className="input"
            placeholder="Ej: App Ecommerce"
            maxLength={100}
          />
        </div>

        {/* Administrador */}
        <div>
          <label htmlFor="project-manager" style={{
            display: 'block',
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'var(--color-text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '0.375rem'
          }}>
            Administrador del Proyecto
          </label>
          <div style={{ position: 'relative' }}>
            <input
              id="project-manager"
              type="text"
              value={projectInfo.manager || ''}
              onChange={(e) => setProjectInfo({ ...projectInfo, manager: e.target.value })}
              className="input"
              style={{ paddingLeft: '2.25rem' }}
              placeholder="Ej: Juan Pérez"
              maxLength={100}
            />
            <User
              size={16}
              style={{
                position: 'absolute',
                left: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--color-text-muted)',
                pointerEvents: 'none'
              }}
            />
          </div>
        </div>

        {/* Fecha de Inicio */}
        <div>
          <label htmlFor="project-start-date" style={{
            display: 'block',
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'var(--color-text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '0.375rem'
          }}>
            Fecha de Inicio (Kickoff)
          </label>
          <div style={{ position: 'relative' }}>
            <input
              id="project-start-date"
              type="date"
              value={projectInfo.startDate}
              onChange={(e) => setProjectInfo({ ...projectInfo, startDate: e.target.value })}
              className="input"
              style={{ paddingLeft: '2.25rem' }}
              aria-invalid={!calendarValidation.hasValidStartDate}
              aria-describedby={!calendarValidation.hasValidStartDate ? 'project-start-date-error' : undefined}
            />
            <Calendar
              size={16}
              style={{
                position: 'absolute',
                left: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--color-text-muted)',
                pointerEvents: 'none'
              }}
            />
          </div>
          {!calendarValidation.hasValidStartDate && (
            <p id="project-start-date-error" style={{ color: 'var(--color-danger)', fontSize: '0.75rem', marginTop: '0.375rem' }}>
              Selecciona una fecha de inicio válida para calcular el cronograma.
            </p>
          )}
        </div>
      </div>

      {calendarValidation.invalidTaskCount > 0 && (
        <p role="alert" style={{ color: 'var(--color-danger)', fontSize: '0.8125rem', margin: '-0.5rem 0 1rem' }}>
          {calendarValidation.invalidTaskCount} {calendarValidation.invalidTaskCount === 1 ? 'tarea tiene' : 'tareas tienen'} una duración inválida. Usa días enteros mayores que cero.
        </p>
      )}

      {/* Contenedor de Resumen y Progreso */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
        gap: '1.5rem',
        paddingTop: '1.25rem',
        borderTop: '1px solid var(--color-border)'
      }}>

        {/* Progreso Global */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: '0.5rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.125rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--color-text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              margin: 0
            }}>
              {totals.productDeliverySprintId ? 'Progreso del Producto' : 'Progreso Global'}
            </label>
            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-primary)' }}>
              {totals.globalProgress}%
            </span>
          </div>
          {totals.productDeliverySprintId && <span style={{ color: 'var(--color-text-muted)', fontSize: '0.6875rem' }}>
            Calculado hasta {totals.productDeliverySprintName}; excluye {totals.postDeliverySprints} {totals.postDeliverySprints === 1 ? 'sprint posterior' : 'sprints posteriores'}.
          </span>}
          <div style={{
            width: '100%',
            height: '0.625rem',
            background: 'var(--color-border)',
            borderRadius: '1rem',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${totals.globalProgress}%`,
              height: '100%',
              background: 'linear-gradient(90deg, var(--color-primary-400), var(--color-primary))',
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>

        {/* Mini stats inline */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: '0.5rem'
        }}>
          <label style={{
            display: 'block',
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'var(--color-text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '0.125rem'
          }}>
            Resumen Rápido
          </label>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <span className="font-mono" style={{
                fontSize: '1.25rem',
                fontWeight: 700,
                color: 'var(--color-primary)'
              }}>
                {totals.totalDays}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginLeft: '0.25rem' }}>
                días
              </span>
            </div>
            <div style={{ width: '1px', height: '1.5rem', background: 'var(--color-border)' }} />
            <div>
              <span className="font-mono" style={{
                fontSize: '1.25rem',
                fontWeight: 700,
                color: 'var(--color-text-secondary)'
              }}>
                {totals.totalTasks}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginLeft: '0.25rem' }}>
                tareas
              </span>
            </div>
            {totals.estimatedEndDate && (
              <>
                <div style={{ width: '1px', height: '1.5rem', background: 'var(--color-border)' }} />
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                  {totals.productDeliverySprintId ? 'Entrega del producto' : 'Entrega'}: <strong style={{ color: 'var(--color-deploy)' }}>{formatDate(totals.estimatedEndDate)}</strong>
                </div>
              </>
            )}
            <div style={{ width: '1px', height: '1.5rem', background: 'var(--color-border)' }} />
            <a 
              href="https://date.nager.at/PublicHoliday/Country/CO"
              target="_blank"
              rel="noopener noreferrer"
              title="Ver calendario oficial de festivos en Colombia"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                fontSize: '0.6875rem',
                fontWeight: 600,
                color: holidayLabel().color,
                background: holidayLabel().bg,
                padding: '0.25rem 0.625rem',
                borderRadius: 'var(--radius-md)',
                textDecoration: 'none',
                cursor: 'pointer',
                transition: 'filter 0.2s ease',
              }}
              onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(0.95)'}
              onMouseLeave={(e) => e.currentTarget.style.filter = 'none'}
            >
              <span>🇨🇴</span>
              {holidayLabel().text}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
