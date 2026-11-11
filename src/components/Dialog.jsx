import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

/** El diálogo nativo mantiene el fondo inerte y contiene el foco. */
export default function Dialog({ isOpen, onClose, title, children, className = '', initialFocus = '[data-dialog-initial]' }) {
  const ref = useRef(null);
  const titleId = useId();
  useEffect(() => {
    if (!isOpen) return;
    const element = ref.current;
    const opener = document.activeElement;
    const container = opener?.closest('[data-focus-container]');
    element.showModal();
    (element.querySelector(initialFocus) ?? element.querySelector('button') ?? element).focus();
    return () => {
      element.close();
      requestAnimationFrame(() => {
        if (ref.current?.open) return;
        const target = opener?.isConnected ? opener : container?.isConnected ? container : document.getElementById('main-content');
        target?.focus();
      });
    };
  }, [isOpen, initialFocus]);
  if (!isOpen) return null;
  return createPortal(
    <dialog ref={ref} className={`app-dialog ${className}`} aria-labelledby={titleId}
      onKeyDown={e => {
        if (e.key !== 'Tab') return;
        const focusable = [...e.currentTarget.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]')].filter(el => el.getClientRects().length);
        const first = focusable[0], last = focusable.at(-1);
        if (!first) { e.preventDefault(); e.currentTarget.focus(); return; }
        if (e.shiftKey && (document.activeElement === first || !e.currentTarget.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && (document.activeElement === last || !e.currentTarget.contains(document.activeElement))) { e.preventDefault(); first.focus(); }
      }}
      onCancel={e => { e.preventDefault(); onClose(); }}>
      <h2 id={titleId} className="dialog-title">{title}</h2>
      {children}
    </dialog>, document.body,
  );
}
