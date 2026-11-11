import React from 'react';

/** Título de tarjeta con un ícono sobre fondo de color. */
export default function CardTitle({ icon, iconBackground, children }) {
  return (
    <h3 style={{
      fontSize: '1rem',
      fontWeight: 700,
      color: 'var(--color-text-primary)',
      marginBottom: '1rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
    }}>
      <span style={{
        background: iconBackground,
        borderRadius: 'var(--radius-md)',
        padding: '0.375rem',
        display: 'inline-flex'
      }}>
        {icon}
      </span>
      {children}
    </h3>
  );
}
