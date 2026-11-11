import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

/**
 * Captura errores de render de la vista y muestra un mensaje en lugar de dejar
 * la pantalla en blanco. No toca los datos guardados: recargar suele bastar, y
 * el encabezado (fuera de este límite) sigue permitiendo exportar un backup.
 */
export default class ErrorBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Error en la interfaz:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div role="alert" className="card" style={{ padding: '2rem', textAlign: 'center', maxWidth: '520px', margin: '3rem auto' }}>
        <AlertCircle size={36} color="var(--color-danger)" style={{ marginBottom: '0.75rem' }} />
        <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '0.5rem' }}>
          Algo salió mal al mostrar esta página
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '1.25rem', lineHeight: 1.6 }}>
          Descarga un respaldo desde el menú Exportar antes de recargar. Consulta
          el estado de guardado para comprobar si tus últimos cambios están almacenados.
        </p>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>
          <RotateCcw size={16} />
          Recargar
        </button>
      </div>
    );
  }
}
