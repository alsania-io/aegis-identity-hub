import React, { useRef, useCallback } from 'react';
import { useTheme, useSidebarState, useUserPreferences } from '@src/hooks';
import { logMessage } from '@src/utils/helpers';
import { cn } from '@src/lib/utils';
import { createLogger } from '@extension/shared/lib/logger';
import { IdentityContent } from '../identity-tabs';
import { loadLocalState } from '../../lib/identity-storage';

const logger = createLogger('IdentitySidebar');

const SIDEBAR_MINIMIZED_WIDTH = 56;
const SIDEBAR_DEFAULT_WIDTH = 420;

type Theme = 'light' | 'dark' | 'system';
const THEME_CYCLE: Theme[] = ['light', 'dark', 'system'];

interface IdentitySidebarProps {
  initialPreferences?: any;
}

const IdentitySidebar: React.FC<IdentitySidebarProps> = ({ initialPreferences }) => {
  const componentId = useRef(`identity-sidebar-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`);
  logMessage(`[IdentitySidebar] Initializing (ID: ${componentId.current})`);

  const { theme, setTheme } = useTheme();
  const { isMinimized: storeSidebarMinimized, width: storeSidebarWidth, toggleMinimize, resizeSidebar } = useSidebarState();
  const { preferences, updatePreferences } = useUserPreferences();

  const [appState] = React.useState(() => loadLocalState());

  const isMinimized = storeSidebarMinimized ?? (initialPreferences?.isMinimized ?? false);
  // Clamp to the viewport on narrow (mobile) screens — the stored/default
  // 420px width otherwise overflows a ~360-414px phone viewport entirely,
  // since nothing here previously accounted for window.innerWidth.
  const [viewportWidth, setViewportWidth] = React.useState(
    typeof window !== 'undefined' ? window.innerWidth : SIDEBAR_DEFAULT_WIDTH
  );
  React.useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const isNarrowViewport = viewportWidth < 480;
  const rawSidebarWidth = storeSidebarWidth || initialPreferences?.sidebarWidth || SIDEBAR_DEFAULT_WIDTH;
  const sidebarWidth = isNarrowViewport ? viewportWidth : rawSidebarWidth;
  const isPushMode = preferences.isPushMode ?? initialPreferences?.isPushMode ?? false;

  const sidebarRef = useRef<HTMLDivElement>(null);

  const applyTheme = useCallback(async (selectedTheme: Theme) => {
    try {
      const sidebarManager = (window as any).activeSidebarManager;
      if (sidebarManager && typeof sidebarManager.applyThemeClass === 'function') {
        sidebarManager.applyThemeClass(selectedTheme);
      }
    } catch (error) {
      logMessage(`[IdentitySidebar] Theme application error: ${error}`);
    }
  }, []);

  React.useEffect(() => {
    applyTheme(theme);
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => { if (theme === 'system') applyTheme('system'); };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, applyTheme]);

  React.useEffect(() => {
    const applyPushMode = async () => {
      try {
        const sidebarManager = (window as any).activeSidebarManager;
        if (sidebarManager) {
          const visible = sidebarManager.getIsVisible?.() ?? true;
          if (visible) {
            sidebarManager.setPushContentMode(isPushMode, isMinimized ? SIDEBAR_MINIMIZED_WIDTH : sidebarWidth, isMinimized);
          }
        }
      } catch (error) {
        logMessage(`[IdentitySidebar] Push mode error: ${error}`);
      }
    };
    applyPushMode();
  }, [isPushMode, sidebarWidth, isMinimized]);

  const handleToggleMinimize = () => {
    toggleMinimize('user action');
  };

  const handleThemeToggle = () => {
    const currentIndex = THEME_CYCLE.indexOf(theme as Theme);
    const nextIndex = (currentIndex + 1) % THEME_CYCLE.length;
    setTheme(THEME_CYCLE[nextIndex]);
  };

  const handleResize = useCallback((width: number) => {
    const constrainedWidth = Math.max(SIDEBAR_DEFAULT_WIDTH, width);
    resizeSidebar(constrainedWidth);
  }, [resizeSidebar]);

  return (
    <div
      ref={sidebarRef}
      className={cn(
        'fixed top-0 right-0 h-screen bg-white dark:bg-slate-900 shadow-2xl z-50 flex flex-col border-l border-slate-200 dark:border-slate-700',
        isPushMode ? 'push-mode' : '',
        isMinimized ? 'collapsed' : ''
      )}
      style={{ width: isMinimized ? `${SIDEBAR_MINIMIZED_WIDTH}px` : `${sidebarWidth}px` }}>

      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-900 border-b border-[#10b981]/30 p-3 flex items-center justify-between flex-shrink-0 shadow-lg z-10" style={{ minHeight: '56px' }}>
        {!isMinimized ? (
          <>
            <div className="flex items-center space-x-2.5 min-w-0">
              <img
                src={chrome.runtime.getURL('icon-34.png')}
                alt="Aegis Logo"
                className="w-8 h-8 rounded-md border border-[#10b981]/30 flex-shrink-0"
              />
              <div className="flex flex-col min-w-0">
                <span className="text-white font-bold text-sm tracking-wider truncate">
                  AEGIS IDENTITY
                </span>
                <span className="text-[10px] text-slate-400 truncate">
                  {appState.prompts?.length || 0} prompts · {appState.memory?.length || 0} memories
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-1 flex-shrink-0">
              <button
                onClick={handleThemeToggle}
                className="p-2 hover:bg-slate-700 rounded-full transition-all duration-200 text-slate-400 hover:text-white"
                aria-label="Toggle theme">
                {theme === 'dark' ? '🌙' : theme === 'light' ? '☀️' : '💻'}
              </button>
              <button
                onClick={handleToggleMinimize}
                className="p-2 hover:bg-slate-700 rounded-full transition-all duration-200 text-slate-400 hover:text-white"
                aria-label="Minimize sidebar">
                ▶
              </button>
            </div>
          </>
        ) : (
          <button
            onClick={handleToggleMinimize}
            className="mx-auto p-2 hover:bg-slate-700 rounded-full transition-all duration-200 text-slate-400 hover:text-white"
            aria-label="Expand sidebar">
            ◀
          </button>
        )}
      </div>

      {/* IdentityContent - uses real Nyx hooks internally */}
      <div className="flex-1 overflow-hidden bg-white dark:bg-slate-900">
        <div
          className={cn(
            'h-full transition-transform duration-200 ease-in-out',
            isMinimized ? 'translate-x-full' : 'translate-x-0'
          )}
          style={{ width: `${sidebarWidth}px` }}>
          <IdentityContent />
        </div>
      </div>
    </div>
  );
};

export default IdentitySidebar;