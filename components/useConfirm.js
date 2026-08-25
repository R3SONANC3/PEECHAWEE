'use client';
import { useState } from 'react';

// Promise-based confirm dialog, replacing window.confirm()/alert() with the
// site's own modal styling. Usage: const { confirm, modal } = useConfirm();
// render {modal} once, then `if (await confirm({...})) { ... }`.
export function useConfirm() {
  const [state, setState] = useState(null);

  function confirm({ title, message, confirmText = 'ยืนยัน', cancelText = 'ยกเลิก', danger = false, onlyOk = false }) {
    return new Promise((resolve) => {
      setState({ title, message, confirmText, cancelText, danger, onlyOk, resolve });
    });
  }

  function handle(result) {
    state?.resolve(result);
    setState(null);
  }

  const modal = state ? (
    <div
      className="modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget && !state.onlyOk) handle(false); }}
    >
      <div className="modal-box">
        <div className={`modal-title${state.danger ? ' danger' : ''}`}>{state.title}</div>
        <div className="modal-message">{state.message}</div>
        <div className="modal-actions">
          {!state.onlyOk && (
            <button type="button" className="modal-btn modal-btn-cancel" onClick={() => handle(false)}>
              {state.cancelText}
            </button>
          )}
          <button
            type="button"
            className={`modal-btn modal-btn-confirm${state.danger ? ' danger' : ''}`}
            onClick={() => handle(true)}
            autoFocus
          >
            {state.confirmText}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { confirm, modal };
}
