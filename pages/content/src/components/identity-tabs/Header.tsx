import React from 'react';
import { Moon, Sun, Laptop, RefreshCw, Layers } from 'lucide-react';

interface HeaderProps {
  theme: 'system' | 'dark' | 'light' | 'glass';
  onToggleTheme: () => void;
  syncState: { isSyncing: boolean };
  onSyncNow: () => void;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  viewMode: 'full' | 'popup' | 'sidepanel';
  onChangeViewMode: (mode: 'full' | 'popup' | 'sidepanel') => void;
  onOpenExportModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  theme, onToggleTheme, syncState, onSyncNow,
  activeTab, onSelectTab, viewMode, onChangeViewMode, onOpenExportModal
}) => {
  const themeIcon = theme === 'light' ? <Sun className="w-4 h-4" /> :
    theme === 'dark' ? <Moon className="w-4 h-4" /> :
    theme === 'glass' ? <Laptop className="w-4 h-4" /> :
    <Laptop className="w-4 h-4" />;

  const themeLabel = theme.charAt(0).toUpperCase() + theme.slice(1);

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#0a0f1d]/90 border-b border-[#10b981]/30 shadow-2xl transition-all duration-300">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex items-center justify-between gap-2">
        {/* Left: Aegis Logo + Brand */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="relative group cursor-pointer shrink-0" onClick={() => onSelectTab('prompts')}>
            <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-tr from-[#05111e] via-[#0d2836] to-[#00f2fe]/30 border border-[#10b981]/60 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.35)] group-hover:shadow-[0_0_25px_rgba(16,185,129,0.6)] transition-all duration-300">
              {/* Aegis Logo - Eye of Aegis from content/logo.svg */}
              <img
                src="/content/logo.svg"
                alt="Aegis Logo"
                className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-300"
              />
            </div>
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10b981] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#10b981]"></span>
            </span>
          </div>
          <div>
            <h1 className="text-base sm:text-xl font-extrabold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-[#10b981]">
              AEGIS IDENTITY
            </h1>
            <p className="text-[11px] text-slate-400 font-medium hidden md:block">
              Cross-Device Automation Browser Extension
            </p>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Sync Button */}
          <button onClick={onSyncNow}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all min-h-[44px] sm:min-h-[38px] active:scale-95 ${
              syncState.isSyncing
                ? 'bg-[#10b981]/20 border-[#10b981] text-[#10b981] shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                : 'bg-slate-900/90 hover:bg-slate-800 border-slate-700/80 text-slate-300'
            }`}>
            <RefreshCw className={`w-4 h-4 ${syncState.isSyncing ? 'animate-spin text-[#10b981]' : 'text-emerald-400'}`} />
            <span className="hidden sm:inline">{syncState.isSyncing ? 'Syncing...' : 'Sync'}</span>
          </button>

          {/* Export Button */}
          <button onClick={onOpenExportModal}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-[#10b981]/40 hover:border-[#10b981]/80 text-xs font-bold text-[#10b981] transition-all min-h-[44px] sm:min-h-[38px] active:scale-95">
            <Layers className="w-4 h-4" />
            <span className="hidden lg:inline">Export</span>
          </button>

          {/* View Mode Switcher */}
          <div className="hidden sm:flex items-center bg-slate-900 p-0.5 rounded-xl border border-slate-800">
            {(['full', 'popup', 'sidepanel'] as const).map((mode) => (
              <button key={mode} onClick={() => onChangeViewMode(mode)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono capitalize transition-all ${
                  viewMode === mode
                    ? 'bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/40 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}>
                {mode === 'popup' ? 'Popup' : mode === 'sidepanel' ? 'Side' : 'Full'}
              </button>
            ))}
          </div>

          {/* Theme Toggle */}
          <button onClick={onToggleTheme}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-700/80 text-slate-300 hover:bg-slate-800 transition-all min-h-[44px] sm:min-h-[38px] active:scale-95">
            {themeIcon}
            <span className="hidden sm:inline text-xs font-medium">{themeLabel}</span>
          </button>
        </div>
      </div>
    </header>
  );
};