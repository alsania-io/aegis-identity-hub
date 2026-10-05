import React from 'react';
import { ToastItemData } from './types';
import { ToastItem } from './ToastItem';

interface ToastContainerProps {
  toasts: ToastItemData[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      id="aegis-toast-container"
      aria-label="Notifications"
      className="fixed bottom-4 right-4 z-50 pointer-events-none flex flex-col gap-2.5 max-w-sm w-[calc(100vw-2rem)] sm:w-96"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};
