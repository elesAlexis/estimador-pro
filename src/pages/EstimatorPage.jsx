import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useProjectActions, useProjectState } from '../context/ProjectContext';
import ProjectInfoCard from '../components/ProjectInfoCard';
import SprintCard from '../components/SprintCard';
import EmptyState from '../components/EmptyState';
import { isTaskComplete } from '../domain/metrics';

export default function EstimatorPage() {
  const { calculatedSprints } = useProjectState();
  const { moveSprint } = useProjectActions();
  const [onlyPending, setOnlyPending] = useState(false);

  // Scroll to new sprint when one is added
  const prevSprintCount = useRef(calculatedSprints.length);
  useEffect(() => {
    if (calculatedSprints.length > prevSprintCount.current) {
      setTimeout(() => {
        const sprintCards = document.querySelectorAll('[data-sprint-index]');
        if (sprintCards.length > 0) {
          sprintCards[sprintCards.length - 1].scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
      }, 100);
    }
    prevSprintCount.current = calculatedSprints.length;
  }, [calculatedSprints.length]);

  // Sprint drag state
  const [draggedSprintIndex, setDraggedSprintIndex] = useState(null);
  const [dropTargetIndex, setDropTargetIndex] = useState(null);

  const handleSprintDragStart = useCallback((e, sprintIndex) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/sprint', JSON.stringify({ sprintIndex }));
    setDraggedSprintIndex(sprintIndex);

    requestAnimationFrame(() => {
      const cards = document.querySelectorAll('[data-sprint-index]');
      cards.forEach(card => {
        if (parseInt(card.dataset.sprintIndex) === sprintIndex) {
          card.classList.add('sprint-card-dragging');
        }
      });
    });
  }, []);

  const handleSprintDragEnd = useCallback(() => {
    setDraggedSprintIndex(null);
    setDropTargetIndex(null);
    document.querySelectorAll('.sprint-card-dragging').forEach(el => {
      el.classList.remove('sprint-card-dragging');
    });
  }, []);

  const handleSprintDragOver = useCallback((e, targetIndex) => {
    e.preventDefault();
    // Only handle sprint drags (not task drags)
    if (!e.dataTransfer.types.includes('application/sprint')) return;
    e.dataTransfer.dropEffect = 'move';

    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const insertIndex = e.clientY < midY ? targetIndex : targetIndex + 1;

    setDropTargetIndex(insertIndex);
  }, []);

  const handleSprintDrop = useCallback((e) => {
    e.preventDefault();
    if (!e.dataTransfer.types.includes('application/sprint')) return;

    try {
      const data = JSON.parse(e.dataTransfer.getData('application/sprint'));
      const sourceIndex = data.sprintIndex;
      let targetIndex = dropTargetIndex;

      if (targetIndex === null) return;

      // Adjust target if dragging downward
      if (sourceIndex < targetIndex) {
        targetIndex = targetIndex - 1;
      }

      moveSprint(sourceIndex, targetIndex);
    } catch (err) {
      console.warn('Error al mover sprint:', err);
    }

    setDraggedSprintIndex(null);
    setDropTargetIndex(null);
    document.querySelectorAll('.sprint-card-dragging').forEach(el => {
      el.classList.remove('sprint-card-dragging');
    });
  }, [moveSprint, dropTargetIndex]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <ProjectInfoCard />
      {calculatedSprints.length > 0 && <label className="pending-filter"><input type="checkbox" checked={onlyPending}
        onChange={e => setOnlyPending(e.target.checked)} />Solo tareas pendientes</label>}
      {calculatedSprints.length > 0 && <span className="sr-only" role="status">
        {calculatedSprints.reduce((sum, sprint) => sum + sprint.tasks.filter(isTaskComplete).length, 0)} tareas completadas en el proyecto.
      </span>}

      {calculatedSprints.length === 0 ? (
        <EmptyState />
      ) : (
        calculatedSprints.map((sprint, index) => (
          <React.Fragment key={sprint.id}>
            {/* Drop indicator before this sprint */}
            {dropTargetIndex === index && draggedSprintIndex !== index && draggedSprintIndex !== index - 1 && (
              <div className="sprint-drop-indicator" />
            )}

            <div
              data-sprint-index={index}
              onDragOver={(e) => handleSprintDragOver(e, index)}
              onDrop={handleSprintDrop}
            >
              <SprintCard
                onlyPending={onlyPending}
                sprint={sprint}
                index={index}
                onSprintDragStart={handleSprintDragStart}
                onSprintDragEnd={handleSprintDragEnd}
              />
            </div>

            {/* Drop indicator after last sprint */}
            {index === calculatedSprints.length - 1 &&
              dropTargetIndex === calculatedSprints.length &&
              draggedSprintIndex !== index && (
              <div className="sprint-drop-indicator" />
            )}
          </React.Fragment>
        ))
      )}
    </div>
  );
}
