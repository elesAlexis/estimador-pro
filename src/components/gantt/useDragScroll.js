import { useRef, useState } from 'react';

/**
 * Permite desplazar horizontalmente un contenedor arrastrándolo con el mouse.
 * Devuelve el ref del contenedor, si se está arrastrando (para el cursor) y los
 * manejadores de eventos a esparcir sobre el elemento.
 */
export function useDragScroll(speed = 1.5) {
  const ref = useRef(null);
  const origin = useRef({ x: 0, scrollLeft: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const onMouseDown = (e) => {
    if (e.target.closest('button, input, select, textarea, a')) return;
    setIsDragging(true);
    origin.current = { x: e.pageX - ref.current.offsetLeft, scrollLeft: ref.current.scrollLeft };
  };

  const stop = () => setIsDragging(false);

  const onMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - ref.current.offsetLeft;
    ref.current.scrollLeft = origin.current.scrollLeft - (x - origin.current.x) * speed;
  };

  return { ref, isDragging, handlers: { onMouseDown, onMouseLeave: stop, onMouseUp: stop, onMouseMove } };
}
