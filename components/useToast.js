'use client';
import { useCallback, useRef, useState } from 'react';

let nextId = 1;

// Transient success/error notifications. Usage: const { toast, toastUI } = useToast();
// render {toastUI} once, then toast('บันทึกแล้ว') or toast('ผิดพลาด', 'error').
export function useToast() {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    clearTimeout(timers.current[id]);
    delete timers.current[id];
  }, []);

  const toast = useCallback((message, type = 'success') => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, message, type }]);
    timers.current[id] = setTimeout(() => dismiss(id), 3000);
  }, [dismiss]);

  const toastUI = toasts.length > 0 ? (
    <div className="toast-stack">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`} onClick={() => dismiss(t.id)}>
          {t.message}
        </div>
      ))}
    </div>
  ) : null;

  return { toast, toastUI };
}
