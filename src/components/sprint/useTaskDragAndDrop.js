import { useCallback, useRef, useState } from 'react';

// Tipo MIME propio para tareas; los sprints usan 'application/sprint' (EstimatorPage).
const TASK_MIME = 'application/task';
const isTaskDrag = (e) => e.dataTransfer.types.includes(TASK_MIME);

/**
 * Arrastrar y soltar tareas dentro de un sprint y entre sprints.
 *
 * Solo reacciona a arrastres de tareas: los de sprints siguen burbujeando hasta
 * EstimatorPage, que es quien los reordena.
 *
 * @param {Object} sprint - Sprint que recibe las tareas
 * @param {Function} moveTask - Acción `moveTask({ taskId, sourceSprintId, targetSprintId, targetIndex })`
 * @returns {{
 *   dragOverInfo: ({taskId: string, position: 'top'|'bottom'}|null),
 *   isDropZoneActive: boolean,
 *   rowHandlers: Object,
 *   sprintHandlers: Object,
 *   onListDrop: Function,
 * }} `rowHandlers` va en cada TaskRow, `sprintHandlers` en el contenedor del
 *   sprint y `onListDrop` en la lista (suelta al final).
 */
export function useTaskDragAndDrop(sprint, moveTask) {
  const [dragOverInfo, setDragOverInfo] = useState(null);
  const [isDropZoneActive, setIsDropZoneActive] = useState(false);
  const dragCounterRef = useRef(0);

  const resetDragState = useCallback(() => {
    setDragOverInfo(null);
    setIsDropZoneActive(false);
    dragCounterRef.current = 0;
  }, []);

  const moveDroppedTask = useCallback((e, targetIndex) => {
    try {
      const data = JSON.parse(e.dataTransfer.getData(TASK_MIME));
      // targetIndex es una frontera antes de quitar la tarea de su posición.
      const insertionIndex = data.sourceSprintId === sprint.id && data.taskIndex < targetIndex ? targetIndex - 1 : targetIndex;
      moveTask({
        taskId: data.taskId,
        sourceSprintId: data.sourceSprintId,
        targetSprintId: sprint.id,
        targetIndex: insertionIndex,
      });
    } catch (err) {
      console.warn('Error al mover tarea:', err);
    }
  }, [moveTask, sprint.id]);

  // ── Fila de tarea ──
  const handleDragStart = useCallback((e, task, sourceSprintId, taskIndex) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData(TASK_MIME, JSON.stringify({ taskId: task.id, sourceSprintId, taskIndex }));

    // Set drag image offset
    if (e.dataTransfer.setDragImage) {
      const el = e.currentTarget;
      e.dataTransfer.setDragImage(el, el.offsetWidth / 2, 20);
    }

    // Add dragging class after a frame
    requestAnimationFrame(() => {
      e.target.classList.add('task-row-dragging');
    });
  }, []);

  const handleDragEnd = useCallback((e) => {
    e.target.classList.remove('task-row-dragging');
    resetDragState();
  }, [resetDragState]);

  const handleDragOverTask = useCallback((e, task, taskIndex) => {
    if (!isTaskDrag(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    // Mitad superior o inferior de la fila
    const rect = e.currentTarget.getBoundingClientRect();
    const position = e.clientY < rect.top + rect.height / 2 ? 'top' : 'bottom';
    setDragOverInfo({ taskId: task.id, position, index: taskIndex });
  }, []);

  const handleDropOnTask = useCallback((e, targetIndex) => {
    // Sin stopPropagation para sprints: su drop lo maneja EstimatorPage
    if (!isTaskDrag(e)) return;
    e.preventDefault();
    e.stopPropagation();
    moveDroppedTask(e, dragOverInfo?.position === 'bottom' ? targetIndex + 1 : targetIndex);
    resetDragState();
  }, [moveDroppedTask, resetDragState, dragOverInfo]);

  // ── Contenedor del sprint (permite soltar en sprints vacíos) ──
  const handleSprintDragEnter = useCallback((e) => {
    if (!isTaskDrag(e)) return;
    e.preventDefault();
    dragCounterRef.current++;
    setIsDropZoneActive(true);
  }, []);

  const handleSprintDragLeave = useCallback((e) => {
    if (!isTaskDrag(e)) return;
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDropZoneActive(false);
      setDragOverInfo(null);
    }
  }, []);

  const handleSprintDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  // Soltar sobre la lista (fuera de una fila): al final del sprint
  const handleListDrop = useCallback((e) => {
    if (!isTaskDrag(e)) return;
    e.preventDefault();
    moveDroppedTask(e, sprint.tasks.length);
    resetDragState();
  }, [moveDroppedTask, resetDragState, sprint.tasks.length]);

  return {
    dragOverInfo,
    isDropZoneActive,
    rowHandlers: {
      onDragStart: handleDragStart,
      onDragEnd: handleDragEnd,
      onDragOver: handleDragOverTask,
      onDrop: handleDropOnTask,
    },
    sprintHandlers: {
      onDragEnter: handleSprintDragEnter,
      onDragLeave: handleSprintDragLeave,
      onDragOver: handleSprintDragOver,
    },
    onListDrop: handleListDrop,
  };
}
