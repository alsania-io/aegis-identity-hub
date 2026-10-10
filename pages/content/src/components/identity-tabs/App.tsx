import React, { useState, useEffect, useRef } from 'react';
import { Header } from './Header';
import { Navigation } from './Navigation';
import { PromptsTab } from './PromptsTab';
import { SkillsTab } from './SkillsTab';
import { PluginsTab } from './PluginsTab';
import { SecretsTab } from './SecretsTab';
import { AgentsTab } from './AgentsTab';
import { ToolsTab } from './ToolsTab';
import { MemoryTab } from './MemoryTab';
import { SwarmTab } from './SwarmTab';
import { McpTab } from './McpTab';
import { InstructionsTab } from './InstructionsTab';
import { SyncTab } from './SyncTab';
import { ConfigTab } from './ConfigTab';
import { SettingsTab } from './SettingsTab';
import { ExtensionExportModal } from './ExtensionExportModal';
import { AppState, defaultAppState, SwarmTask, SwarmConfig } from '../../types/identity';
import { loadLocalState, saveLocalState, getDeviceInfo, hydrateFromChromeStorage, getSyncKey, ensureSyncKey } from '../../lib/identity-storage';
import { getHubUrlFromExtension, registerDevice, syncToServer } from '../../lib/identity-api';
import { mcpClient } from '../../core/mcp-client';
import { useConnectionStatus, useAvailableTools } from '../../hooks';
import { ToastProvider, useToast } from './Toast';

export interface NyxTool {
  name: string;
  schema: string;
  description: string;
}

interface IdentityAppProps {
  initialTools?: NyxTool[];
  initialCustomInstructions?: string;
}

const IdentityAppInner: React.FC<IdentityAppProps> = ({ 
  initialTools = [], 
  initialCustomInstructions = '' 
}) => {
  const [appState, setAppState] = useState<AppState>(() => {
    const state = loadLocalState();
    if (initialCustomInstructions && !state.customInstructions) {
      state.customInstructions = initialCustomInstructions;
    }
    // Ensure a sync key exists — without it, sync posts to /api/sync/ (empty)
    // and the backend rejects it. getSyncKey() generates + persists one.
    if (!state.syncKey || state.syncKey.trim() === '') {
      state.syncKey = getSyncKey();
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
  const [isSyncing, setIsSyncing] = useState(false);
  const [systemTheme, setSystemTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    return 'dark';
  });
  const toast = useToast();

  // Hydrate from extension-scoped chrome.storage.local (survives per-site
  // localStorage clears/partitioning — the fix for state "resetting" on refresh
  // or when the sidebar is opened on a different host page).
  useEffect(() => {
    let cancelled = false;
    hydrateFromChromeStorage().then(hydrated => {
      if (!cancelled && hydrated) {
        setAppState(prev => {
          const chosen = hydrated.updatedAt && prev.updatedAt && hydrated.updatedAt < prev.updatedAt ? prev : hydrated;
          // Never let hydration wipe a valid sync key with an empty one —
          // the key is an identity anchor, not content to be overwritten.
          if ((!chosen.syncKey || chosen.syncKey.trim() === '') && prev.syncKey) {
            return { ...chosen, syncKey: prev.syncKey };
          }
          return chosen;
        });
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
      handleSync(false);
    }, (appState.settings.syncIntervalSeconds || 10) * 1000);
    return () => clearInterval(interval);
  }, [appState.syncKey, appState.settings.syncIntervalSeconds]);

  const handleStateUpdate = (updates: Partial<AppState>) => {
    // Use the functional form so rapid successive updates (e.g. a provider
    // toggle immediately followed by its async model-fetch merge) merge against
    // the LATEST state instead of a stale render-scope snapshot. The previous
    // spread-from-`appState` form caused a lost-update race that reverted the
    // provider's enabled flag right after the toggle.
    setAppState(prev => {
      const updated = { ...prev, ...updates, updatedAt: new Date().toISOString() };
      saveLocalState(updated);
      return updated;
    });

    if (updates.prompts) {
      toast.success('Prompts Saved', `Updated ${updates.prompts.length} prompt templates`);
    } else if (updates.skills) {
      toast.success('Skills Saved', `Saved ${updates.skills.length} agent skills`);
    } else if (updates.plugins) {
      toast.success('Plugins Saved', `Saved ${updates.plugins.length} plugins & adapters`);
    } else if (updates.secrets) {
      toast.success('Secrets Saved', `Saved ${updates.secrets.length} secrets & env variables`);
    } else if (updates.agents) {
      toast.success('Agents Saved', `Saved ${updates.agents.length} sovereign agents`);
    } else if (updates.memory) {
      toast.success('Memory Bank Saved', `Saved ${updates.memory.length} memory entries`);
    } else if (updates.settings) {
      toast.success('Settings Saved', 'Theme and sync preferences updated');
    } else if (updates.customInstructions !== undefined || updates.customInstructionsEnabled !== undefined) {
      toast.success('Instructions Saved', 'Custom AI instructions updated');
    } else if (updates.swarmTasks || updates.swarmConfig) {
      toast.success('Swarm Config Saved', 'Agent tasks and swarm configuration saved');
    } else if (updates.mcpConfig) {
      toast.success('MCP Config Saved', 'Server configuration saved');
    } else if (updates.profiles || updates.activeProfileId) {
      toast.success('Profiles Saved', 'Identity profile state updated');
    } else {
      toast.success('State Saved', 'Changes persisted to storage');
    }
  };

  const handleSync = async (isManual = false) => {
    setIsSyncing(true);
    try {
      const hubUrl = await getHubUrlFromExtension();
      // Ensure a non-empty sync key — chrome.storage-first, since the content
      // script's localStorage is the HOST PAGE's and is not a stable home.
      let key = appState.syncKey;
      if (!key || key.trim() === '') {
        key = await ensureSyncKey();
        handleStateUpdate({ syncKey: key });
      }
      const result = await syncToServer(key, {
        prompts: appState.prompts,
        memory: appState.memory,
        skills: appState.skills,
        plugins: appState.plugins,
        secrets: appState.secrets,
        agents: appState.agents,
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
      if (result.success) {
        toast.sync(
          'Cloud Sync Complete',
          `All identity state synchronized with Aegis Hub (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })})`
        );
      } else {
        if (isManual) {
          toast.error('Sync Incomplete', result.error || 'Failed to reach Aegis Hub sync endpoint');
        } else {
          console.warn('Sync failed:', result.error);
        }
      }
    } catch (e: any) {
      if (isManual) {
        toast.error('Sync Error', e?.message || 'Failed to execute sync operation');
      } else {
        console.warn('Sync error:', e);
      }
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
        onSyncNow={() => handleSync(true)}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        viewMode={viewMode}
        onChangeViewMode={setViewMode}
        onOpenExportModal={() => setIsExportModalOpen(true)}
      />

      <Navigation
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        toolCount={availableTools.length}
        skillCount={appState.skills?.length ?? 0}
        pluginCount={appState.plugins?.length ?? 0}
        secretCount={appState.secrets?.length ?? 0}
        agentCount={appState.agents?.length ?? 0}
        modelCount={appState.modelsState?.models?.length ?? 0}
        promptCount={appState.prompts.length}
      />

      <main className="max-w-7xl mx-auto px-3 sm:px-6 py-4">
        {activeTab === 'agents' && (
          <AgentsTab
            agents={appState.agents || []}
            skills={appState.skills || []}
            models={appState.modelsState?.models || []}
            modelAssignments={appState.modelsState?.assignments}
            modelsState={appState.modelsState}
            prompts={appState.prompts || []}
            onUpdate={(agents) => handleStateUpdate({ agents })}
          />
        )}
        {activeTab === 'tools' && (
          <ToolsTab
            tools={availableTools}
            connectionStatus={connection.status}
            onRefresh={() => mcpClient.getAvailableTools(true)}
          />
        )}
        {activeTab === 'skills' && (
          <SkillsTab
            skills={appState.skills || []}
            onUpdate={(skills) => handleStateUpdate({ skills })}
            availableTools={availableTools}
          />
        )}
        {activeTab === 'plugins' && (
          <PluginsTab
            plugins={appState.plugins || []}
            onUpdate={(plugins) => handleStateUpdate({ plugins })}
          />
        )}
        {activeTab === 'secrets' && (
          <SettingsTab 
            settings={appState.settings}
            modelsState={appState.modelsState}
            profiles={appState.profiles}
            activeProfileId={appState.activeProfileId}
            secrets={appState.secrets || []}
            onUpdate={(s) => handleStateUpdate({ settings: s })}
            onUpdateModelsState={(ms) => handleStateUpdate({ modelsState: ms })}
            onUpdateProfiles={(profiles, activeId) => handleStateUpdate({ profiles, activeProfileId: activeId })}
            onUpdateSecrets={(secrets) => handleStateUpdate({ secrets })}
            availableTools={availableTools}
            initialSection="secrets"
          />
        )}
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
            models={appState.modelsState?.models || []}
            modelAssignments={appState.modelsState?.assignments}
            prompts={appState.prompts || []}
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
                const res = await mcpClient.updateServerConfig({ uri: c.serverUrl, connectionType: c.transportType });
                if (res) {
                  toast.success('MCP Connected', `Connected to server via ${c.transportType}`);
                } else {
                  toast.warning('MCP Connection Pending', 'Could not establish immediate connection');
                }
                return res;
              } catch (e) {
                console.error('[IdentityApp] MCP connect failed:', e);
                toast.error('MCP Connect Failed', 'Failed to connect to MCP server');
                return false;
              }
            }}
            onForceReconnect={() => {
              mcpClient.forceReconnect();
              toast.info('MCP Reconnecting', 'Resetting connection to MCP server');
            }}
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
            onSyncNow={() => handleSync(true)}
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
            modelsState={appState.modelsState}
            profiles={appState.profiles}
            activeProfileId={appState.activeProfileId}
            secrets={appState.secrets || []}
            onUpdate={(s) => handleStateUpdate({ settings: s })}
            onUpdateModelsState={(ms) => handleStateUpdate({ modelsState: ms })}
            onUpdateProfiles={(profiles, activeId) => handleStateUpdate({ profiles, activeProfileId: activeId })}
            onUpdateSecrets={(secrets) => handleStateUpdate({ secrets })}
            availableTools={availableTools}
            initialSection="models"
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

export const IdentityApp: React.FC<IdentityAppProps> = (props) => {
  return (
    <ToastProvider>
      <IdentityAppInner {...props} />
    </ToastProvider>
  );
};