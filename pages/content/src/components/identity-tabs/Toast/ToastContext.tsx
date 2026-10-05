import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { ToastContextValue, ToastItemData, ToastType } from './types';
import { ToastContainer } from './ToastContainer';

const ToastContext = createContext<ToastContextValue | null>(null);

const MAX_TOASTS = 4;
const TOAST_EVENT_NAME = 'aegis:toast:dispatch';

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItemData[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const addToast = useCallback(
    (toastInput: Omit<ToastItemData, 'id' | 'timestamp'>) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const newToast: ToastItemData = {
        ...toastInput,
        id,
        timestamp: Date.now(),
        duration: toastInput.duration ?? 3800,
      };

      setToasts((prev) => {
        // Keep max visible toasts to prevent visual clutter
        const next = [...prev, newToast];
        return next.length > MAX_TOASTS ? next.slice(-MAX_TOASTS) : next;
      });

      return id;
    },
    []
  );

  const success = useCallback(
    (title: string, description?: string, options?: Partial<ToastItemData>) => {
      return addToast({
        type: 'success',
        title,
        description,
        ...options,
      });
    },
    [addToast]
  );

  const sync = useCallback(
    (title: string, description?: string, options?: Partial<ToastItemData>) => {
      return addToast({
        type: 'sync',
        title,
        description,
        badge: options?.badge || 'SYNCED',
        ...options,
      });
    },
    [addToast]
  );

  const info = useCallback(
    (title: string, description?: string, options?: Partial<ToastItemData>) => {
      return addToast({
        type: 'info',
        title,
        description,
        ...options,
      });
    },
    [addToast]
  );

  const warning = useCallback(
    (title: string, description?: string, options?: Partial<ToastItemData>) => {
      return addToast({
        type: 'warning',
        title,
        description,
        ...options,
      });
    },
    [addToast]
  );

  const error = useCallback(
    (title: string, description?: string, options?: Partial<ToastItemData>) => {
      return addToast({
        type: 'error',
        title,
        description,
        duration: options?.duration ?? 5000,
        ...options,
      });
    },
    [addToast]
  );

  // Listen for global custom events to allow triggering toasts from anywhere
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleCustomToast = (event: Event) => {
      const customEvent = event as CustomEvent<Omit<ToastItemData, 'id' | 'timestamp'>>;
      if (customEvent.detail) {
        addToast(customEvent.detail);
      }
    };

    window.addEventListener(TOAST_EVENT_NAME, handleCustomToast);
    return () => {
      window.removeEventListener(TOAST_EVENT_NAME, handleCustomToast);
    };
  }, [addToast]);

  const value: ToastContextValue = {
    toasts,
    addToast,
    removeToast,
    clearToasts,
    success,
    sync,
    info,
    warning,
    error,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext);
  if (!context) {
    // Return fallback that uses global custom event so hooks outside provider still work
    return {
      toasts: [],
      addToast: (t) => {
        dispatchGlobalToast(t);
        return '';
      },
      removeToast: () => {},
      clearToasts: () => {},
      success: (title, description, options) => {
        dispatchGlobalToast({ type: 'success', title, description, ...options });
        return '';
      },
      sync: (title, description, options) => {
        dispatchGlobalToast({ type: 'sync', title, description, badge: options?.badge || 'SYNCED', ...options });
        return '';
      },
      info: (title, description, options) => {
        dispatchGlobalToast({ type: 'info', title, description, ...options });
        return '';
      },
      warning: (title, description, options) => {
        dispatchGlobalToast({ type: 'warning', title, description, ...options });
        return '';
      },
      error: (title, description, options) => {
        dispatchGlobalToast({ type: 'error', title, description, duration: options?.duration ?? 5000, ...options });
        return '';
      },
    };
  }
  return context;
};

function dispatchGlobalToast(toast: Omit<ToastItemData, 'id' | 'timestamp'>) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(TOAST_EVENT_NAME, {
        detail: toast,
      })
    );
  }
}

/**
 * Imperative helper for triggering toasts from non-component modules
 */
export const toast = {
  success: (title: string, description?: string, options?: Partial<ToastItemData>) => {
    dispatchGlobalToast({ type: 'success', title, description, ...options });
  },
  sync: (title: string, description?: string, options?: Partial<ToastItemData>) => {
    dispatchGlobalToast({ type: 'sync', title, description, badge: options?.badge || 'SYNCED', ...options });
  },
  info: (title: string, description?: string, options?: Partial<ToastItemData>) => {
    dispatchGlobalToast({ type: 'info', title, description, ...options });
  },
  warning: (title: string, description?: string, options?: Partial<ToastItemData>) => {
    dispatchGlobalToast({ type: 'warning', title, description, ...options });
  },
  error: (title: string, description?: string, options?: Partial<ToastItemData>) => {
    dispatchGlobalToast({ type: 'error', title, description, duration: options?.duration ?? 5000, ...options });
  },
};
