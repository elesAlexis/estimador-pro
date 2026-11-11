import React from 'react';
import { AlertTriangle, Calendar, CalendarDays, CheckCircle2, Clock, Target, TrendingUp, Users } from 'lucide-react';
import { formatDate } from '../../shared/calendarDate';

/** Tarjeta con etiqueta, icono y cifra; `children` añade barra o detalle debajo. */
function Kpi({ tone, stagger, icon, label, children }) {
  return (
    <div className={`stat-card kpi-card ${tone} animate-fade-in-up stagger-${stagger}`}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
        {icon}
        <span className="stat-label">{label}</span>
      </div>
      {children}
    </div>
  );
}

/**
 * Indicadores del proyecto: primero la ejecución a la fecha de corte
 * (`report.totals` recortado al alcance del producto) y después la estimación.
 */
export default function KpiCards({ report }) {
  const { totals } = report;
  const scoped = Boolean(totals.productDeliverySprintId);

  return (
    <div className="kpi-grid">
      <Kpi tone="kpi-blue" stagger="1" label={scoped ? 'Avance del Producto' : 'Avance Global'}
        icon={<TrendingUp size={16} className="kpi-icon" aria-hidden="true" />}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className="stat-value font-mono">{totals.globalProgress}%</span>
          <div style={{ flex: 1, height: '0.375rem', background: 'var(--kpi-border)', borderRadius: '1rem', overflow: 'hidden' }}>
            <div style={{ width: `${totals.globalProgress}%`, height: '100%', background: 'var(--kpi-accent)', transition: 'width 0.3s ease' }} />
          </div>
        </div>
      </Kpi>

      <Kpi tone="kpi-sage" stagger="1" label="Sprints del Producto"
        icon={<CheckCircle2 size={16} className="kpi-icon" aria-hidden="true" />}>
        <span className="stat-value font-mono">
          {totals.completedSprints}
          <span className="stat-value-note"> / {totals.scopeSprints}</span>
        </span>
      </Kpi>

      <Kpi tone="kpi-mauve" stagger="2" label="Alcance Completado"
        icon={<Target size={16} className="kpi-icon" aria-hidden="true" />}>
        <span className="stat-value font-mono">
          {totals.completedTasks}
          <span className="stat-value-note"> / {totals.scopeTasks} tareas</span>
        </span>
      </Kpi>

      <Kpi tone="kpi-sand" stagger="2" label={scoped ? 'Calendario hasta Entrega' : 'Calendario Consumido'}
        icon={totals.overdueSprints
          ? <AlertTriangle size={16} className="kpi-icon" aria-hidden="true" />
          : <CalendarDays size={16} className="kpi-icon" aria-hidden="true" />}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
          <span className="stat-value font-mono">{report.calendarElapsed}%</span>
          {Boolean(totals.overdueSprints) && <span className="stat-value-note">
            {totals.overdueSprints} {totals.overdueSprints === 1 ? 'sprint vencido' : 'sprints vencidos'}
          </span>}
        </div>
      </Kpi>

      <Kpi tone="kpi-slate" stagger="3" label="Días Hábiles Totales"
        icon={<Clock size={16} className="kpi-icon" aria-hidden="true" />}>
        <span className="stat-value font-mono">{totals.totalDays}</span>
      </Kpi>

      <Kpi tone="kpi-sand" stagger="3" label={scoped ? 'Entrega del Producto' : 'Entrega Estimada'}
        icon={<Calendar size={16} className="kpi-icon" aria-hidden="true" />}>
        <span className="stat-value font-mono" style={{ fontSize: '1.25rem' }}>
          {totals.estimatedEndDate ? formatDate(totals.estimatedEndDate) : '—'}
        </span>
      </Kpi>

      <Kpi tone="kpi-sage" stagger="4" label="Roles Involucrados"
        icon={<Users size={16} className="kpi-icon" aria-hidden="true" />}>
        <span className="stat-value font-mono">{Object.keys(totals.roleDistribution).length}</span>
      </Kpi>
    </div>
  );
}
