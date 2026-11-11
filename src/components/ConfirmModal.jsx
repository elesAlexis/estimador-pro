import React from 'react';
import Dialog from './Dialog';

export default function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmText = 'Eliminar', showCancel = true }) {
  return <Dialog isOpen={isOpen} onClose={onClose} title={title}>
    <p className="dialog-message">{message}</p>
    <div className="dialog-actions">
      {showCancel && <button data-dialog-initial className="btn btn-secondary" onClick={onClose}>Cancelar</button>}
      <button data-dialog-initial={showCancel ? undefined : true}
        className={showCancel ? 'btn btn-confirm-danger' : 'btn btn-primary'}
        onClick={() => { onConfirm?.(); onClose(); }}>{confirmText}</button>
    </div>
  </Dialog>;
}
