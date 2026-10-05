import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useCurrentAdapter } from '@src/hooks/useAdapter';
import { useTheme, useUserPreferences, useConnectionStatus } from '@src/hooks';
import ServerStatus from './ServerStatus/ServerStatus';
import AvailableTools from './AvailableTools/AvailableTools';
import InstructionManager from './Instructions/InstructionManager';
import Settings from './Settings/Settings';
import { useMcpCommunication } from '@src/hooks/useMcpCommunication';
import { logMessage } from '@src/utils/helpers';
import { Typography, Icon } from './ui';
import { cn } from '@src/lib/utils';
import type { UserPreferences } from '@src/types/stores';
import { createLogger } from '@extension/shared/lib/logger';
// Bundled into content/index.css and injected into the Shadow DOM alongside the
// Tailwind output (see injectTailwindToShadowDom in utils/shadowDom.ts). Anything
// imported at the page level instead (manifest content_scripts css[]) never reaches
// this component because it renders inside a closed-off Shadow DOM tree.
import '../../mobile-sidebar.css';

const logger = createLogger('MobileSidebar');

interface MobileSidebarProps {
  initialPreferences?: UserPreferences | null;
}

type MobileTab = 'tools' | 'instructions' | 'settings';

const SIDEBAR_WIDTH = 340;

const TABS: { id: MobileTab; label: string; icon: 'tools' | 'file-text' | 'settings' }[] = [
  { id: 'tools', label: 'Tools', icon: 'tools' },
  { id: 'instructions', label: 'Instructions', icon: 'file-text' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

const MobileSidebar: React.FC<MobileSidebarProps> = ({ initialPreferences }) => {
  const componentId = useRef(`mobile-sidebar-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`);
  logMessage(`[MobileSidebar] Initializing (ID: ${componentId.current})`);

  const currentAdapter = useCurrentAdapter();

  const adapter = useMemo(
    () => ({
      insertTextIntoInput: (text: string) => currentAdapter.insertText(text),
      triggerSubmission: () => currentAdapter.submitForm(),
      supportsFileUpload: () => currentAdapter.hasCapability('file-attachment'),
      attachFile: (file: File) => currentAdapter.attachFile(file),
      name: currentAdapter.activeAdapterName || 'Unknown',
      isReady: currentAdapter.isReady,
      status: currentAdapter.status,
      capabilities: currentAdapter.capabilities,
    }),
    [currentAdapter],
  );

  const { theme, setTheme } = useTheme();
  const { preferences, updatePreferences } = useUserPreferences();
  const { status: connectionStatus } = useConnectionStatus();

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<MobileTab>('tools');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [touchStartX, setTouchStartX] = useState(0);
  const [touchStartY, setTouchStartY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);

  // Get communication methods
  let communicationMethods;
  try {
    communicationMethods = useMcpCommunication();
  } catch (error) {
    communicationMethods = {
      availableTools: [],
      sendMessage: async () => 'Communication error',
      refreshTools: async () => [],
      forceReconnect: async () => false,
      serverStatus: 'disconnected' as const,
      updateServerConfig: async () => false,
      getServerConfig: async () => ({ uri: '' }),
    };
  }

  const serverStatus = connectionStatus || communicationMethods?.serverStatus || 'disconnected';
  const availableTools = communicationMethods?.availableTools || [];
  const sendMessage = communicationMethods?.sendMessage || (async () => 'Communication not available');
  const refreshTools = communicationMethods?.refreshTools || (async () => []);
  const isPushMode = preferences.isPushMode ?? initialPreferences?.isPushMode ?? false;
  const autoSubmit = preferences.autoSubmit ?? initialPreferences?.autoSubmit ?? false;

  // Toggle sidebar open/close
  const toggleSidebarOpen = useCallback(() => {
    setIsOpen(prev => !prev);
    if (!isOpen) {
      refreshTools(true).catch(() => {});
    }
  }, [isOpen, refreshTools]);

  const closeSidebar = useCallback(() => {
    setIsOpen(false);
  }, []);

  // --- Swipe-to-close (horizontal drag from anywhere on the panel) ---
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    setTouchStartX(touch.clientX);
    setTouchStartY(touch.clientY);
    setIsDragging(false);
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStartX;
      const deltaY = touch.clientY - touchStartY;

      // Only hijack horizontal drags so vertical scrolling keeps working
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
        setIsDragging(true);
        const offset = Math.min(Math.max(deltaX, 0), SIDEBAR_WIDTH);
        setDragOffset(offset);
      }
    },
    [touchStartX, touchStartY],
  );

  const handleTouchEnd = useCallback(() => {
    if (isDragging && dragOffset > SIDEBAR_WIDTH * 0.3) {
      setIsOpen(false);
    }
    setDragOffset(0);
    setIsDragging(false);
  }, [isDragging, dragOffset]);

  const handleRefreshTools = async () => {
    setIsRefreshing(true);
    try {
      await refreshTools(true);
    } catch (error) {
      logMessage(`[MobileSidebar] Error refreshing tools: ${error}`);
    } finally {
      setIsRefreshing(false);
    }
  };

  const formattedTools = availableTools.map(tool => ({
    name: tool.name,
    schema: tool.schema,
    description: tool.description || '',
  }));

  // Close on Escape (external keyboards / desktop-mode fallback)
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) closeSidebar();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeSidebar]);

  // Lock page scroll behind the overlay while open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const getCurrentThemeIcon = (): 'sun' | 'moon' | 'laptop' => {
    switch (theme) {
      case 'light':
        return 'sun';
      case 'dark':
        return 'moon';
      default:
        return 'laptop';
    }
  };

  const handleThemeToggle = () => {
    const cycle: ('light' | 'dark' | 'system')[] = ['light', 'dark', 'system'];
    const nextIndex = (cycle.indexOf(theme) + 1) % cycle.length;
    setTheme(cycle[nextIndex]);
  };

  const dragTransform = isDragging ? `translateX(${dragOffset}px)` : undefined;

  return (
    <div className="mobile-sidebar">
      {/* Floating toggle button */}
      <button
        onClick={toggleSidebarOpen}
        className={cn(
          'fab-button fixed z-[100] rounded-full shadow-lg transition-all duration-300',
          'bg-indigo-600 active:bg-indigo-800',
          'text-white border-2 border-white/20',
          'flex items-center justify-center',
          'touch-target select-none',
          isOpen ? 'scale-90 opacity-0 pointer-events-none' : 'scale-100 opacity-100',
        )}
        style={{
          bottom: 'max(env(safe-area-inset-bottom), 16px)',
          right: 'max(env(safe-area-inset-right), 16px)',
          width: '60px',
          height: '60px',
          boxShadow: '0 4px 20px rgba(99, 102, 241, 0.45)',
        }}
        aria-label="Open Nyx Control">
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </button>

      {/* Overlay */}
      <div
        className={cn(
          'overlay fixed inset-0 bg-black/50 z-[90] transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
        onClick={closeSidebar}
        style={{ touchAction: 'none' }}
      />

      {/* Sidebar Panel */}
      <div
        className={cn(
          'fixed right-0 top-0 bottom-0 z-[95]',
          'bg-white dark:bg-slate-900',
          'flex flex-col',
          'shadow-2xl',
          !isDragging && 'transition-transform duration-300 ease-out',
          'will-change-transform',
        )}
        style={{
          width: `${SIDEBAR_WIDTH}px`,
          maxWidth: '88vw',
          transform: dragTransform ?? (isOpen ? 'translateX(0)' : `translateX(${SIDEBAR_WIDTH + 20}px)`),
          touchAction: 'pan-y',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}>
        {/* Swipe indicator */}
        <div className="swipe-indicator" />

        {/* Header */}
        <div className="flex-shrink-0 safe-top bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 pb-3 pt-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 min-w-0">
              <img
                src={chrome.runtime.getURL('icon-34.png')}
                alt="Nyx Control Logo"
                className="w-8 h-8 rounded-md flex-shrink-0"
              />
              <Typography variant="h4" className="font-semibold truncate text-slate-800 dark:text-slate-100">
                Nyx Control
              </Typography>
            </div>
            <div className="flex items-center space-x-1 flex-shrink-0">
              <button
                onClick={handleRefreshTools}
                disabled={isRefreshing}
                aria-label="Refresh tools"
                className="touch-target flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 active:bg-slate-200 dark:active:bg-slate-600">
                <Icon
                  name="refresh"
                  size="sm"
                  className={cn('text-slate-600 dark:text-slate-300', isRefreshing && 'animate-spin')}
                />
              </button>
              <button
                onClick={handleThemeToggle}
                aria-label="Toggle theme"
                className="touch-target flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 active:bg-slate-200 dark:active:bg-slate-600">
                <Icon name={getCurrentThemeIcon()} size="sm" className="text-indigo-600 dark:text-indigo-400" />
              </button>
              <button
                onClick={closeSidebar}
                aria-label="Close sidebar"
                className="touch-target flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 active:bg-slate-200 dark:active:bg-slate-600">
                <Icon name="x" size="sm" className="text-slate-700 dark:text-slate-300" />
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="scroll-content flex-1 overflow-y-auto overflow-x-hidden px-4 py-3">
          <div className="mb-3">
            <ServerStatus status={serverStatus} />
          </div>

          {/* Push content + Auto-submit toggles, side by side */}
          <div className="mb-3 grid grid-cols-2 gap-2">
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
              <div className="flex items-center justify-between gap-2">
                <Typography variant="subtitle" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Push Content
                </Typography>
                <button
                  onClick={() => updatePreferences({ isPushMode: !isPushMode })}
                  className={cn(
                    'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out touch-manipulation',
                    isPushMode ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600',
                  )}>
                  <span className="sr-only">Toggle push mode</span>
                  <span
                    className={cn(
                      'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out',
                      isPushMode ? 'translate-x-5' : 'translate-x-0',
                    )}
                  />
                </button>
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
              <div className="flex items-center justify-between gap-2">
                <Typography variant="subtitle" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Auto-Submit
                </Typography>
                <button
                  onClick={() => updatePreferences({ autoSubmit: !autoSubmit })}
                  className={cn(
                    'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out touch-manipulation',
                    autoSubmit ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600',
                  )}>
                  <span className="sr-only">Toggle auto-submit</span>
                  <span
                    className={cn(
                      'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out',
                      autoSubmit ? 'translate-x-5' : 'translate-x-0',
                    )}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Tab content */}
          <div className="flex-1 pb-4">
            {activeTab === 'tools' && (
              <AvailableTools
                tools={availableTools}
                onExecute={sendMessage}
                onRefresh={handleRefreshTools}
                isRefreshing={isRefreshing}
              />
            )}
            {activeTab === 'instructions' && <InstructionManager adapter={adapter} tools={formattedTools} />}
            {activeTab === 'settings' && <Settings />}
          </div>
        </div>

        {/* Bottom navigation - primary nav lives within thumb reach */}
        <nav className="flex-shrink-0 safe-bottom border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'tab-button flex-1 flex flex-col items-center justify-center gap-1 touch-manipulation select-none',
                activeTab === tab.id
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-500 dark:text-slate-400',
              )}
              aria-label={tab.label}
              aria-current={activeTab === tab.id ? 'page' : undefined}>
              <Icon name={tab.icon} size="sm" />
              <span className="text-[11px] font-medium leading-none">{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
};

export default MobileSidebar;
