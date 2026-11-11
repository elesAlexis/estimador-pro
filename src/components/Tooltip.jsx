import React, { useState, useRef, useEffect, useLayoutEffect, useCallback, useId } from 'react';
import { createPortal } from 'react-dom';

/**
 * Tooltip — componente elegante de tooltip con posicionamiento inteligente.
 *
 * Props:
 *  - content     {string | ReactNode}  Texto o JSX a mostrar
 *  - placement   {'top'|'bottom'|'left'|'right'}  Posición preferida (default: 'top')
 *  - delay       {number}  Delay en ms antes de aparecer (default: 250)
 *  - maxWidth    {number}  Ancho máximo en px (default: 260)
 *  - children    El trigger element
 */
export default function Tooltip({
  content,
  placement = 'top',
  delay = 250,
  maxWidth = 260,
  showOnClick = false,
  children,
}) {
  const [visible, setVisible] = useState(false);
  const tooltipId = useId();
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [resolvedPlacement, setResolvedPlacement] = useState(placement);
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);
  const timerRef = useRef(null);

  const compute = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) return;
    const t = triggerRef.current.getBoundingClientRect();
    const tip = tooltipRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const gap = 8;

    // Determine best placement with fallback
    let place = placement;
    if (place === 'top' && t.top - tip.height - gap < 0) place = 'bottom';
    if (place === 'bottom' && t.bottom + tip.height + gap > vh) place = 'top';
    if (place === 'left' && t.left - tip.width - gap < 0) place = 'right';
    if (place === 'right' && t.right + tip.width + gap > vw) place = 'left';

    // El tooltip usa position: fixed, así que trabaja en coordenadas del
    // viewport igual que getBoundingClientRect (sin sumar el scroll).
    let top, left;
    if (place === 'top') {
      top = t.top - tip.height - gap;
      left = t.left + t.width / 2 - tip.width / 2;
    } else if (place === 'bottom') {
      top = t.bottom + gap;
      left = t.left + t.width / 2 - tip.width / 2;
    } else if (place === 'left') {
      top = t.top + t.height / 2 - tip.height / 2;
      left = t.left - tip.width - gap;
    } else {
      top = t.top + t.height / 2 - tip.height / 2;
      left = t.right + gap;
    }

    // Clamp to viewport
    left = Math.max(8, Math.min(left, vw - tip.width - 8));
    top = Math.max(8, Math.min(top, vh - tip.height - 8));

    setCoords({ top, left });
    setResolvedPlacement(place);
  }, [placement]);

  const show = useCallback(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setVisible(true);
    }, delay);
  }, [delay]);

  const hide = useCallback(() => {
    clearTimeout(timerRef.current);
    setVisible(false);
  }, []);

  useLayoutEffect(() => {
    if (!visible) return undefined;
    compute();
    // Con position: fixed el tooltip no sigue al elemento; se oculta al hacer scroll
    window.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);
    const dismissOutside = e => { if (!triggerRef.current?.contains(e.target)) hide(); };
    document.addEventListener('pointerdown', dismissOutside);
    return () => {
      window.removeEventListener('scroll', hide, true);
      window.removeEventListener('resize', hide);
      document.removeEventListener('pointerdown', dismissOutside);
    };
  }, [visible, compute, hide]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  if (!content) return children;

  const arrowStyles = getArrowStyle(resolvedPlacement);

  return (
    <>
      {React.cloneElement(React.Children.only(children), {
        ref: triggerRef,
        'aria-describedby': [children.props['aria-describedby'], visible ? tooltipId : null].filter(Boolean).join(' ') || undefined,
        onClick: e => {
          children.props.onClick?.(e);
          if (showOnClick) { clearTimeout(timerRef.current); setVisible(value => !value); }
        },
        onKeyDown: e => {
          children.props.onKeyDown?.(e);
          if (e.key === 'Escape' && visible) { e.preventDefault(); e.stopPropagation(); hide(); }
        },
        onMouseEnter: (e) => {
          children.props.onMouseEnter?.(e);
          show();
        },
        onMouseLeave: (e) => {
          children.props.onMouseLeave?.(e);
          hide();
        },
        onFocus: (e) => {
          children.props.onFocus?.(e);
          show();
        },
        onBlur: (e) => {
          children.props.onBlur?.(e);
          hide();
        },
      })}

      {/* Dentro de un diálogo, conservar el tooltip en su capa modal. */}
      {visible && createPortal(
        <div
          id={tooltipId}
          ref={tooltipRef}
          role="tooltip"
          style={{
            position: 'fixed',
            top: coords.top,
            left: coords.left,
            maxWidth: `min(${maxWidth}px, calc(100vw - 16px))`,
            zIndex: 9999,
            pointerEvents: 'none',
            // Animation
            animation: 'tooltipIn 0.15s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          }}
        >
          <div
            style={{
              background: 'rgba(0, 20, 55, 0.92)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              color: '#f0f4ff',
              padding: '0.45rem 0.75rem',
              borderRadius: '10px',
              fontSize: '0.75rem',
              fontWeight: 500,
              lineHeight: 1.5,
              whiteSpace: 'pre-line',
              overflowWrap: 'anywhere',
              boxShadow: '0 8px 32px rgba(0,0,0,0.28), 0 2px 8px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.1)',
              position: 'relative',
            }}
          >
            {content}
            {/* Arrow */}
            <span style={arrowStyles} />
          </div>
        </div>
      , triggerRef.current?.closest('dialog') || document.body)}
    </>
  );
}

function getArrowStyle(placement) {
  const base = {
    position: 'absolute',
    width: 0,
    height: 0,
    pointerEvents: 'none',
  };
  const color = 'rgba(0, 20, 55, 0.92)';
  switch (placement) {
    case 'top':
      return {
        ...base,
        bottom: -6,
        left: '50%',
        transform: 'translateX(-50%)',
        borderLeft: '6px solid transparent',
        borderRight: '6px solid transparent',
        borderTop: `6px solid ${color}`,
      };
    case 'bottom':
      return {
        ...base,
        top: -6,
        left: '50%',
        transform: 'translateX(-50%)',
        borderLeft: '6px solid transparent',
        borderRight: '6px solid transparent',
        borderBottom: `6px solid ${color}`,
      };
    case 'left':
      return {
        ...base,
        right: -6,
        top: '50%',
        transform: 'translateY(-50%)',
        borderTop: '6px solid transparent',
        borderBottom: '6px solid transparent',
        borderLeft: `6px solid ${color}`,
      };
    case 'right':
      return {
        ...base,
        left: -6,
        top: '50%',
        transform: 'translateY(-50%)',
        borderTop: '6px solid transparent',
        borderBottom: '6px solid transparent',
        borderRight: `6px solid ${color}`,
      };
    default:
      return base;
  }
}
