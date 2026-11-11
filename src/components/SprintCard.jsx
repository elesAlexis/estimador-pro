import React, { useState } from 'react';
import { useProjectActions } from '../context/ProjectContext';
import TaskRow from './TaskRow';
import TaskBankBar from './TaskBankBar';
import ConfirmModal from './ConfirmModal';
import SprintHeader from './sprint/SprintHeader';
import TaskColumnsHeader from './sprint/TaskColumnsHeader';
import { useTaskDragAndDrop } from './sprint/useTaskDragAndDrop';
import { isTaskComplete } from '../domain/metrics';

/** Tarjeta de un sprint: encabezado, lista de tareas (con arrastrar y soltar) y banco rápido. */
export default function SprintCard({ sprint, index, onSprintDragStart, onSprintDragEnd, onlyPending = false }) {
  const { moveTask, removeSprint } = useProjectActions();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { dragOverInfo, isDropZoneActive, rowHandlers, sprintHandlers, onListDrop } = useTaskDragAndDrop(sprint, moveTask);

  return (
    <section
      className="card sprint-card animate-fade-in-up"
      id={`sprint-${encodeURIComponent(sprint.id)}`}
      tabIndex={-1}
      data-focus-container
      style={{
        animationDelay: `${index * 80}ms`,
        animationFillMode: 'backwards',
      }}
      {...sprintHandlers}
    >
      <SprintHeader
        sprint={sprint}
        index={index}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
        onRequestDelete={() => setIsConfirmOpen(true)}
        onSprintDragStart={onSprintDragStart}
        onSprintDragEnd={onSprintDragEnd}
      />

      {/* Collapsible Content */}
      {!isCollapsed && (
        <div id={`sprint-content-${encodeURIComponent(sprint.id)}`}>
          <TaskColumnsHeader />

          {/* Task Rows */}
          <div onDrop={onListDrop}>
            {onlyPending && sprint.tasks.length > 0 && sprint.tasks.every(isTaskComplete) &&
              <p className="pending-empty" role="status">✓ Todas las tareas están completadas.</p>}
            {sprint.tasks.length === 0 ? (
              <div
                className={`drop-zone-empty ${isDropZoneActive ? 'drop-zone-empty-active' : ''}`}
              >
                {isDropZoneActive
                  ? '↓ Soltar tarea aquí'
                  : 'Sin tareas aún. Agrega una desde el banco rápido ↓'
                }
              </div>
            ) : (
              sprint.tasks.map((task, taskIndex) => onlyPending && isTaskComplete(task) ? null : (
                <TaskRow
                  key={task.id}
                  task={task}
                  sprintId={sprint.id}
                  index={taskIndex}
                  {...rowHandlers}
                  dragOverInfo={dragOverInfo}
                />
              ))
            )}
          </div>

          {/* Task Bank */}
          <TaskBankBar sprintId={sprint.id} />
        </div>
      )}

      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={() => removeSprint(sprint.id)}
        title="¿Eliminar Sprint completo?"
        message="Se eliminarán también todas las tareas dentro de este sprint. Esta acción no se puede deshacer."
        confirmText="Eliminar Sprint"
      />
    </section>
  );
}
