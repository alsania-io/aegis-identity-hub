import React, { useState, useEffect, useRef } from 'react';
import { Header } from './Header';
import { Navigation } from './Navigation';
import { PromptsTab } from './PromptsTab';
import { MemoryTab } from './MemoryTab';
import { SwarmTab } from './SwarmTab';
import { McpTab } from './McpTab';
import { InstructionsTab } from './InstructionsTab';
import { SyncTab } from './SyncTab';
import { ConfigTab } from './ConfigTab';
import { SettingsTab } from './SettingsTab';
import { ExtensionExportModal } from './ExtensionExportModal';
import { AppState, defaultAppState, SwarmTask, SwarmConfig } from '../../types/identity';
import { loadLocalState, saveLocalState, getDeviceInfo, hydrateFromChromeStorage } from '../../lib/identity-storage';
import { getHubUrlFromExtension, registerDevice, syncToServer } from '../../lib/identity-api';
import { mcpClient } from '../../core/mcp-client';
import { useConnectionStatus, useAvailableTools } from '../../hooks';

export interface NyxTool {
  name: string;
  schema: string;
  description: string;
}

interface IdentityAppProps {
  initialTools?: NyxTool[];
  initialCustomInstructions?: string;
}

export const IdentityApp: React.FC<IdentityAppProps> = ({ 
  initialTools = [], 
  initialCustomInstructions = '' 
}) => {
  const [appState, setAppState] = useState<AppState>(() => {
    const state = loadLocalState();
    if (initialCustomInstructions && !state.customInstructions) {
      state.customInstructions = initialCustomInstructions;
    }
    return state;
  });
  // Real MCP connection + tool state, sourced from the same Zustand stores
  // the extension sidebar uses (populated by mcpClient via the background
  // script). Replaces the old fake 'nyx-tools-updated' window event, which
  // nothing in the codebase ever dispatched.
  const connection = useConnectionStatus();
  const { tools: storeTools } = useAvailableTools();
  const availableTools: NyxTool[] = (storeTools.length > 0 ? storeTools : initialTools).map(t => ({
    name: t.name,
    description: t.description || '',
    schema: typeof (t as any).schema === 'string' ? (t as any).schema : JSON.stringify((t as any).input_schema || {})
  }));
  const [activeTab, setActiveTab] = useState('prompts');
  const [viewMode, setViewMode] = useState<'full' | 'popup' | 'sidepanel'>('full');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [systemTheme, setSystemTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    return 'dark';
  });
  const saveTimerRef = useRef<any>(null);

  // Hydrate from extension-scoped chrome.storage.local (survives per-site
  // localStorage clears/partitioning — the fix for state "resetting" on refresh
  // or when the sidebar is opened on a different host page).
  useEffect(() => {
    let cancelled = false;
    hydrateFromChromeStorage().then(hydrated => {
      if (!cancelled && hydrated) {
        setAppState(prev => (hydrated.updatedAt && prev.updatedAt && hydrated.updatedAt < prev.updatedAt ? prev : hydrated));
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Track system theme
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'light' : 'dark');
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Detect view mode
  useEffect(() => {
    const isExtension = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;
    if (window.innerWidth < 500 || isExtension) {
      setViewMode('popup');
    }
  }, []);

  // Register device
  useEffect(() => {
    const register = async () => {
      const info = getDeviceInfo();
      const hubUrl = await getHubUrlFromExtension();
      await registerDevice(appState.syncKey, {
        id: info.id,
        name: info.name,
        type: info.type,
        browser: info.browser
      }, hubUrl);
    };
    register();
  }, [appState.syncKey]);

  // Auto-sync every interval
  useEffect(() => {
    const interval = setInterval(() => {
      handleSync();
    }, (appState.settings.syncIntervalSeconds || 10) * 1000);
    return () => clearInterval(interval);
  }, [appState.syncKey, appState.settings.syncIntervalSeconds]);

  const handleStateUpdate = (updates: Partial<AppState>) => {
    const updated = { ...appState, ...updates, updatedAt: new Date().toISOString() };
    setAppState(updated);
    saveLocalState(updated);
    setShowSavedToast(true);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => setShowSavedToast(false), 2000);
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const hubUrl = await getHubUrlFromExtension();
      const result = await syncToServer(appState.syncKey, {
        prompts: appState.prompts,
        memory: appState.memory,
        settings: appState.settings,
        mcpConfig: appState.mcpConfig,
        enabledTools: appState.enabledTools,
        customInstructions: appState.customInstructions,
        workspaceFiles: appState.workspaceFiles,
        swarmTasks: appState.swarmTasks,
        swarmConfig: appState.swarmConfig,
        profiles: appState.profiles,
        activeProfileId: appState.activeProfileId
      }, hubUrl);
      if (!result.success) {
        console.warn('Sync failed:', result.error);
      }
    } catch (e) {
      console.warn('Sync error:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleToggleTheme = () => {
    const themes: Array<'system' | 'dark' | 'light' | 'glass'> = ['system', 'dark', 'light', 'glass'];
    const idx = themes.indexOf(appState.settings.theme);
    const next = themes[(idx + 1) % themes.length];
    handleStateUpdate({ settings: { ...appState.settings, theme: next } });
  };

  const effectiveTheme = appState.settings.theme === 'system' ? systemTheme : appState.settings.theme;

  const themeClasses = effectiveTheme === 'light'
    ? 'bg-slate-50 text-slate-800'
    : effectiveTheme === 'glass'
    ? 'theme-glass text-cyan-50'
    : 'bg-[#030d14] text-slate-200';

  return (
    <div className={`min-h-screen font-sans selection:bg-[#00f5d4]/30 selection:text-white transition-colors duration-300 ${themeClasses}`}>
      <Header
        theme={appState.settings.theme}
        onToggleTheme={handleToggleTheme}
        syncState={{ isSyncing }}
        onSyncNow={handleSync}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        viewMode={viewMode}
        onChangeViewMode={setViewMode}
        onOpenExportModal={() => setIsExportModalOpen(true)}
      />

      <Navigation
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        promptCount={appState.prompts.length}
        showSavedToast={showSavedToast}
      />

      <main className="max-w-7xl mx-auto px-3 sm:px-6 py-4">
        {activeTab === 'prompts' && (
          <PromptsTab prompts={appState.prompts} onUpdate={(p) => handleStateUpdate({ prompts: p })} />
        )}
        {activeTab === 'memory' && (
          <MemoryTab memory={appState.memory} onUpdate={(m) => handleStateUpdate({ memory: m })} />
        )}
        {activeTab === 'swarm' && (
          <SwarmTab
            tasks={appState.swarmTasks}
            config={appState.swarmConfig}
            onUpdateTasks={(t) => handleStateUpdate({ swarmTasks: t })}
            onUpdateConfig={(c) => handleStateUpdate({ swarmConfig: c })}
          />
        )}
        {activeTab === 'mcp' && (
          <McpTab
            config={appState.mcpConfig}
            onUpdate={(c) => handleStateUpdate({ mcpConfig: c })}
            onConnect={async (c) => {
              try {
                return await mcpClient.updateServerConfig({ uri: c.serverUrl, connectionType: c.transportType });
              } catch (e) {
                console.error('[IdentityApp] MCP connect failed:', e);
                return false;
              }
            }}
            onForceReconnect={() => mcpClient.forceReconnect()}
            connectionStatus={connection.status}
            connectionError={connection.error}
            toolCount={availableTools.length}
          />
        )}
        {activeTab === 'instructions' && (
          <InstructionsTab
            customInstructions={appState.customInstructions}
            enabled={appState.customInstructionsEnabled}
            onUpdate={(instructions, enabled) => handleStateUpdate({ customInstructions: instructions, customInstructionsEnabled: enabled })}
            appState={appState}
            availableTools={availableTools}
          />
        )}
        {activeTab === 'sync' && (
          <SyncTab
            devices={appState.devices}
            syncState={{
              syncKey: appState.syncKey,
              updatedAt: appState.updatedAt,
              isSyncing,
              lastSyncedAt: null,
              error: null
            }}
            onSyncNow={handleSync}
            appState={appState}
          />
        )}
        {activeTab === 'config' && (
          <ConfigTab
            profiles={appState.profiles}
            activeProfileId={appState.activeProfileId}
            onUpdate={(profiles, activeId) => handleStateUpdate({ profiles, activeProfileId: activeId })}
            appState={appState}
          />
        )}
        {activeTab === 'settings' && (
          <SettingsTab 
            settings={appState.settings} 
            onUpdate={(s) => handleStateUpdate({ settings: s })}
            availableTools={availableTools}
          />
        )}
      </main>

      <ExtensionExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        syncKey={appState.syncKey}
      />
    </div>
  );
};