import React from 'react';
import { Flag } from 'lucide-react';

/**
 * Explica por qué los indicadores hablan del "producto": el alcance se corta en
 * el sprint marcado como entrega y los posteriores quedan fuera del progreso.
 */
export default function ScopeNote({ totals }) {
  if (!totals.productDeliverySprintId) return null;
  const posteriores = totals.postDeliverySprints;
  return (
    <p className="scope-note">
      <Flag size={16} aria-hidden="true" />
      <span>
        <strong>Alcance del producto hasta {totals.productDeliverySprintName}.</strong>
        {posteriores > 0 && ` El progreso principal excluye ${posteriores} ${posteriores === 1
          ? 'sprint posterior' : 'sprints posteriores'} de despliegue o estabilización.`}
      </span>
    </p>
  );
}
