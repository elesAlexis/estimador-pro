import React from 'react';
import { LayoutTemplate, Plus, CheckSquare } from 'lucide-react';
import { useProjectActions } from '../context/ProjectContext';

export default function EmptyState() {
  const { loadTemplate, addSprint } = useProjectActions();

  return (
    <div
      className="animate-fade-in-up"
      style={{
        textAlign: 'center',
        padding: '4rem 2rem',
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-xl)',
        border: '2px dashed var(--color-border)',
      }}
    >
      <div style={{
        background: 'var(--color-primary-50)',
        borderRadius: '50%',
        width: '64px',
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 1.25rem',
      }}>
        <LayoutTemplate size={28} color="var(--color-primary)" />
      </div>

      <h3 style={{
        fontSize: '1.125rem',
        fontWeight: 700,
        color: 'var(--color-text-primary)',
        marginBottom: '0.5rem',
      }}>
        Tu cronograma está vacío
      </h3>
      <p style={{
        color: 'var(--color-text-muted)',
        fontSize: '0.875rem',
        marginBottom: '1.5rem',
        maxWidth: '380px',
        margin: '0 auto 1.5rem',
        lineHeight: 1.6,
      }}>
        Comienza cargando la plantilla base con sprints predefinidos o crea tu primer sprint desde cero.
      </p>

      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={() => loadTemplate()}
          className="btn btn-primary"
        >
          <CheckSquare size={16} />
          Cargar Plantilla Base
        </button>
        <button
          onClick={() => addSprint()}
          className="btn btn-secondary"
        >
          <Plus size={16} />
          Sprint en Blanco
        </button>
      </div>
    </div>
  );
}
