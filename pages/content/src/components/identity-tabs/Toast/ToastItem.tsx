import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle2, RefreshCw, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { ToastItemData, ToastType } from './types';

interface ToastItemProps {
  toast: ToastItemData;
  onDismiss: (id: string) => void;
}

const TYPE_CONFIG: Record<
  ToastType,
  {
    icon: React.ComponentType<{ className?: string }>;
    accentBorder: string;
    accentBg: string;
    iconColor: string;
    badgeBg: string;
    badgeText: string;
    defaultBadge: string;
    progressBarColor: string;
  }
> = {
  success: {
    icon: CheckCircle2,
    accentBorder: 'border-emerald-500/40 hover:border-emerald-500/60',
    accentBg: 'bg-[#0a1520]/95 shadow-[0_4px_24px_rgba(16,185,129,0.18)]',
    iconColor: 'text-emerald-400',
    badgeBg: 'bg-emerald-950/80 border-emerald-800/80',
    badgeText: 'text-emerald-300',
    defaultBadge: 'SAVED',
    progressBarColor: 'bg-emerald-400',
  },
  sync: {
    icon: RefreshCw,
    accentBorder: 'border-teal-500/40 hover:border-teal-500/60',
    accentBg: 'bg-[#081724]/95 shadow-[0_4px_24px_rgba(20,184,166,0.22)]',
    iconColor: 'text-teal-300',
    badgeBg: 'bg-teal-950/80 border-teal-800/80',
    badgeText: 'text-teal-200',
    defaultBadge: 'SYNCED',
    progressBarColor: 'bg-gradient-to-r from-emerald-400 to-teal-300',
  },
  info: {
    icon: Info,
    accentBorder: 'border-cyan-500/40 hover:border-cyan-500/60',
    accentBg: 'bg-[#071526]/95 shadow-[0_4px_20px_rgba(6,182,212,0.18)]',
    iconColor: 'text-cyan-400',
    badgeBg: 'bg-cyan-950/80 border-cyan-800/80',
    badgeText: 'text-cyan-300',
    defaultBadge: 'INFO',
    progressBarColor: 'bg-cyan-400',
  },
  warning: {
    icon: AlertTriangle,
    accentBorder: 'border-amber-500/40 hover:border-amber-500/60',
    accentBg: 'bg-[#181308]/95 shadow-[0_4px_20px_rgba(245,158,11,0.18)]',
    iconColor: 'text-amber-400',
    badgeBg: 'bg-amber-950/80 border-amber-800/80',
    badgeText: 'text-amber-300',
    defaultBadge: 'WARNING',
    progressBarColor: 'bg-amber-400',
  },
  error: {
    icon: AlertCircle,
    accentBorder: 'border-rose-500/40 hover:border-rose-500/60',
    accentBg: 'bg-[#1a0c10]/95 shadow-[0_4px_24px_rgba(244,63,94,0.2)]',
    iconColor: 'text-rose-400',
    badgeBg: 'bg-rose-950/80 border-rose-800/80',
    badgeText: 'text-rose-300',
    defaultBadge: 'ERROR',
    progressBarColor: 'bg-rose-400',
  },
};

export const ToastItem: React.FC<ToastItemProps> = ({ toast, onDismiss }) => {
  const [isExiting, setIsExiting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(100);

  const duration = toast.duration ?? 3800;
  const remainingTimeRef = useRef(duration);
  const lastTickRef = useRef<number>(Date.now());
  const config = TYPE_CONFIG[toast.type] || TYPE_CONFIG.info;
  const IconComponent = config.icon;

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss(toast.id);
    }, 220);
  };

  useEffect(() => {
    if (duration <= 0) return;

    lastTickRef.current = Date.now();
    const interval = setInterval(() => {
      if (isPaused) {
        lastTickRef.current = Date.now();
        return;
      }

      const now = Date.now();
      const delta = now - lastTickRef.current;
      lastTickRef.current = now;

      remainingTimeRef.current = Math.max(0, remainingTimeRef.current - delta);
      const newProgress = (remainingTimeRef.current / duration) * 100;
      setProgress(newProgress);

      if (remainingTimeRef.current <= 0) {
        clearInterval(interval);
        handleClose();
      }
    }, 30);

    return () => clearInterval(interval);
  }, [duration, isPaused]);

  const formattedTime = new Date(toast.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <div
      id={`toast-${toast.id}`}
      role="status"
      aria-live="polite"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className={`relative overflow-hidden pointer-events-auto w-full rounded-xl border backdrop-blur-xl transition-all duration-200 transform ${
        config.accentBg
      } ${config.accentBorder} ${
        isExiting
          ? 'opacity-0 translate-x-4 scale-95'
          : 'opacity-100 translate-x-0 scale-100'
      }`}
    >
      <div className="p-3.5 flex items-start gap-3">
        {/* Type Icon */}
        <div
          className={`p-2 rounded-lg bg-slate-900/90 border border-slate-800/80 shrink-0 ${
            toast.type === 'sync' ? 'animate-pulse' : ''
          }`}
        >
          <IconComponent className={`w-4 h-4 ${config.iconColor}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`text-[9px] font-mono font-bold tracking-wider px-1.5 py-0.5 rounded border ${config.badgeBg} ${config.badgeText}`}
            >
              {toast.badge || config.defaultBadge}
            </span>
            <span className="text-[10px] font-mono text-slate-400 ml-auto">
              {formattedTime}
            </span>
          </div>

          <h4 className="text-xs font-semibold text-slate-100 leading-snug">
            {toast.title}
          </h4>

          {toast.description && (
            <p className="text-[11px] text-slate-300/90 mt-0.5 leading-relaxed break-words">
              {toast.description}
            </p>
          )}

          {toast.action && (
            <div className="mt-2 pt-2 border-t border-slate-800/60">
              <button
                id={`toast-action-${toast.id}`}
                onClick={() => {
                  toast.action?.onClick();
                  handleClose();
                }}
                className="text-xs font-bold text-[#10b981] hover:underline"
              >
                {toast.action.label}
              </button>
            </div>
          )}
        </div>

        {/* Dismiss Button */}
        <button
          id={`toast-close-${toast.id}`}
          onClick={handleClose}
          aria-label="Dismiss notification"
          className="p-1 text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 rounded-md transition-colors shrink-0 -mr-1 -mt-1"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Remaining Duration Progress Bar */}
      {duration > 0 && (
        <div className="h-0.5 w-full bg-slate-900/80">
          <div
            className={`h-full transition-all duration-75 ${config.progressBarColor}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
};
