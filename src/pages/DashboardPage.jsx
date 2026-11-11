import React, { useMemo } from 'react';
import { Layers, TrendingUp, Users } from 'lucide-react';
import { useHolidays, useProjectState } from '../context/ProjectContext';
import { buildProgressReport } from '../domain/progressReport';
import { TASK_TYPES, ROLE_COLORS } from '../utils/templateData';
import KpiCards from '../components/dashboard/KpiCards';
import ScopeNote from '../components/dashboard/ScopeNote';
import GanttCard from '../components/dashboard/GanttCard';
import DistributionChartCard from '../components/dashboard/DistributionChartCard';
import ModuleProgressCard from '../components/dashboard/ModuleProgressCard';
import SprintSummaryTable from '../components/dashboard/SprintSummaryTable';

const FALLBACK_CHART_COLOR = '#89939f';

export default function DashboardPage() {
  const { projectInfo, calculatedSprints, totals } = useProjectState();
  const { holidaySet, holidayList, calendarReady, holidaySource } = useHolidays();

  // Lectura de ejecución a la fecha de corte: estado por sprint, calendario
  // consumido y avance por módulo. Recorre sprints y tareas, de ahí el useMemo.
  const report = useMemo(
    () => buildProgressReport(projectInfo, calculatedSprints, totals),
    [projectInfo, calculatedSprints, totals],
  );

  // Role distribution for pie chart
  const roleData = useMemo(() => {
    return Object.entries(totals.roleDistribution).map(([role, days]) => ({
      name: role,
      value: days,
      fill: ROLE_COLORS[role] || FALLBACK_CHART_COLOR,
    }));
  }, [totals.roleDistribution]);

  // Type distribution for pie chart
  const typeData = useMemo(() => {
    return Object.entries(totals.typeDistribution).map(([type, days]) => ({
      name: TASK_TYPES[type]?.label || type,
      value: days,
      fill: TASK_TYPES[type]?.color || FALLBACK_CHART_COLOR,
    }));
  }, [totals.typeDistribution]);

  if (!calculatedSprints.length) {
    return (
      <div className="animate-fade-in-up" style={{
        textAlign: 'center',
        padding: '4rem 2rem',
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-xl)',
        border: '2px dashed var(--color-border)',
      }}>
        <TrendingUp size={40} style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }} />
        <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          Sin datos para mostrar
        </h3>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
          Agrega sprints y tareas en el Cronograma para ver métricas aquí.
        </p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <ScopeNote totals={report.totals} />

      <KpiCards report={report} />

      {calendarReady ? <GanttCard
        sprints={calculatedSprints}
        startDate={projectInfo.startDate}
        holidaySet={holidaySet}
        holidayList={holidayList}
      /> : <p role="status" className="card calendar-loading">{holidaySource === 'loading' ? 'Cargando calendario para mostrar el Gantt…' : 'Revisa la fecha de inicio: el calendario no está disponible.'}</p>}

      {/* Charts Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
        gap: '1.5rem',
      }}>
        <DistributionChartCard
          title="Distribución por Rol"
          icon={<Users size={16} color="#718e9f" />}
          iconBackground="#f1f6f8"
          data={roleData}
        />
        <DistributionChartCard
          title="Distribución por Tipo"
          icon={<Layers size={16} color="#aa977e" />}
          iconBackground="#faf7f2"
          data={typeData}
        />
      </div>

      {report.modules.length > 0 && <ModuleProgressCard modules={report.modules} />}

      <SprintSummaryTable sprints={calculatedSprints} totals={totals} />
    </div>
  );
}
