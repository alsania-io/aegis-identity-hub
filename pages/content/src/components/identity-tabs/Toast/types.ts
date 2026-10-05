/**
 * Types for the Aegis Custom Toast Notification System
 */

export type ToastType = 'success' | 'sync' | 'info' | 'warning' | 'error';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastItemData {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number; // ms, default 3500
  timestamp: number;
  badge?: string;
  action?: ToastAction;
}

export interface ToastContextValue {
  toasts: ToastItemData[];
  addToast: (toast: Omit<ToastItemData, 'id' | 'timestamp'>) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
  success: (title: string, description?: string, options?: Partial<ToastItemData>) => string;
  sync: (title: string, description?: string, options?: Partial<ToastItemData>) => string;
  info: (title: string, description?: string, options?: Partial<ToastItemData>) => string;
  warning: (title: string, description?: string, options?: Partial<ToastItemData>) => string;
  error: (title: string, description?: string, options?: Partial<ToastItemData>) => string;
}
