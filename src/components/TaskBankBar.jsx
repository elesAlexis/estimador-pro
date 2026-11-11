import React from 'react';
import { Plus, Clock } from 'lucide-react';
import { COMMON_TASKS_BANK } from '../domain/templates';
import { useProjectActions } from '../context/ProjectContext';

export default function TaskBankBar({ sprintId }) {
  const { addTask } = useProjectActions();

  const getTypeClass = (type) => `bank-btn bank-btn-${type}`;

  return (
    <div style={{
      background: 'var(--color-bg)',
      padding: '0.75rem 1.25rem',
      borderTop: '1px solid var(--color-border)',
      display: 'flex',
      flexWrap: 'wrap',
      gap: '0.5rem',
      alignItems: 'center',
    }}>
      <button
        onClick={() => addTask(sprintId)}
        className="btn btn-ghost btn-sm"
        style={{ color: 'var(--color-primary)', fontWeight: 600 }}
      >
        <Plus size={15} />
        Agregar tarea
      </button>

      <div style={{
        width: '1px',
        height: '1.5rem',
        background: 'var(--color-border-strong)',
        margin: '0 0.25rem',
      }} />

      <span style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.25rem',
        fontSize: '0.75rem',
        color: 'var(--color-text-muted)',
        fontWeight: 600,
      }}>
        <Clock size={12} />
        Rápido:
      </span>

      {COMMON_TASKS_BANK.map((template, idx) => (
        <button
          key={idx}
          onClick={() => addTask(sprintId, template)}
          className={getTypeClass(template.type)}
        >
          + {template.title}
        </button>
      ))}
    </div>
  );
}
