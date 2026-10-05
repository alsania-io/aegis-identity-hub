import React, { useState, useEffect, useMemo } from 'react';
import { Navigation } from './Navigation';
import { PromptsTab } from './PromptsTab';
import { MemoryTab } from './MemoryTab';
import { SkillsTab } from './SkillsTab';
import { SelfImproveTab } from './SelfImproveTab';
import { SnapshotManagerModal } from './SnapshotManagerModal';
import { ToolExecutionModal } from './ToolExecutionModal';
import type { NyxTool } from './App';
import { CommandPalette } from './CommandPalette';
import { LocalModelBridgeModal } from './LocalModelBridgeModal';
import { HomeTab } from './HomeTab';
import { FreeAiRouterSection } from './FreeAiRouterSection';
import { PluginsTab } from './PluginsTab';
import { SecretsTab } from './SecretsTab';
import { AgentsTab } from './AgentsTab';
import { SwarmTab } from './SwarmTab';
import { McpTab } from './McpTab';
import { SyncTab } from './SyncTab';
import { ConfigTab } from './ConfigTab';
import { SettingsTab } from './SettingsTab';
import { AppState } from '../../types/identity';
import { loadLocalState, saveLocalState, hydrateFromChromeStorage, ensureSyncKey } from '../../lib/identity-storage';
import { getHubUrlFromExtension, syncToServer } from '../../lib/identity-api';
import { ToastProvider, useToast } from './Toast';

// Import the WORKING Nyx components
import ServerStatus from '../sidebar/ServerStatus/ServerStatus';
import AvailableTools from '../sidebar/AvailableTools/AvailableTools';
import InstructionManager from '../sidebar/Instructions/InstructionManager';
import Settings from '../sidebar/Settings/Settings';

// Import the WORKING Nyx hooks
import { useConnectionStatus, useCurrentAdapter } from '@src/hooks';
import { useMcpCommunication } from '@src/hooks/useMcpCommunication';
import { logMessage } from '@src/utils/helpers';

interface IdentityContentProps {
  initialCustomInstructions?: string;
}

const IdentityContentInner: React.FC<IdentityContentProps> = ({ 
  initialCustomInstructions = ''
}) => {
  // Use the WORKING Nyx hooks — these work because the original sidebar uses them
  const { status: connectionStatus, isConnected } = useConnectionStatus();
  const communication = useMcpCommunication();
  const adapter = useCurrentAdapter();
  const toast = useToast();
  
  const [appState, setAppState] = useState<AppState>(() => {
    const state = loadLocalState();
    if (initialCustomInstructions && !state.customInstructions) {
      state.customInstructions = initialCustomInstructions;
    }
    return state;
  });
  
  // Get tools from the WORKING Nyx communication
  const availableTools = communication?.availableTools || [];
  const isRefreshing = (communication as any)?.isRefreshing || false;
  const refreshTools = communication?.refreshTools || (async () => []);
  const serverStatus = (communication as any)?.serverStatus || connectionStatus || 'disconnected';
  
  const [activeTab, setActiveTab] = useState('tools');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSnapshotModalOpen, setIsSnapshotModalOpen] = useState(false);
  const [activeToolForExecution, setActiveToolForExecution] = useState<NyxTool | null>(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isLocalBridgeOpen, setIsLocalBridgeOpen] = useState(false);

  // Global hotkey: Cmd+K / Ctrl+K opens the command palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    // Capture phase so the host page's own Ctrl+K (e.g. DeepSeek search)
    // doesn't swallow the event before we see it.
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, []);

  // Hydrate from extension-scoped chrome.storage.local — same fix as
  // IdentityApp. Without this, the sidebar only ever reads the CURRENT
  // page's own per-origin localStorage, which is empty on every new site
  // the extension is used on, making saved prompts/memory/config/etc.
  // appear to reset constantly even though saveLocalState() writes them
  // correctly to chrome.storage.local.
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

  // Format tools for InstructionManager (same as original sidebar)
  const formattedTools = useMemo(() => {
    return availableTools.map(tool => ({
      name: tool.name,
      schema: tool.schema,
      description: tool.description || '',
    }));
  }, [availableTools]);

  // Create a compatibility adapter for legacy components (same as original sidebar)
  const adapterCompat = useMemo(() => ({
    insertTextIntoInput: (text: string) => adapter?.insertText?.(text),
    triggerSubmission: () => adapter?.submitForm?.(),
    supportsFileUpload: () => adapter?.hasCapability?.('file-attachment') || false,
    attachFile: (file: File) => adapter?.attachFile?.(file),
    name: adapter?.activeAdapterName || 'Unknown',
    isReady: adapter?.isReady || false,
    status: adapter?.status || 'disconnected',
    capabilities: adapter?.capabilities || [],
  }), [adapter]);

  const handleStateUpdate = (updates: Partial<AppState>) => {
    const updated = { ...appState, ...updates, updatedAt: new Date().toISOString() };
    setAppState(updated);
    saveLocalState(updated);

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
      toast.success('Settings Saved', 'Theme and preferences updated');
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

  const handleSync = async () => {
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
        toast.error('Sync Incomplete', result.error || 'Failed to reach Aegis Hub sync endpoint');
      }
    } catch (e: any) {
      toast.error('Sync Error', e?.message || 'Failed to execute sync operation');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRefresh = async () => {
    try {
      const tools = await refreshTools(true);
      toast.info('Tools Refreshed', `Found ${tools?.length ?? 0} active MCP tools`);
    } catch (error) {
      logMessage(`[IdentityContent] Refresh failed: ${error}`);
      toast.error('Refresh Failed', 'Unable to refresh available MCP tools');
    }
  };

  // Log status for debugging
  useEffect(() => {
    logMessage(`[IdentityContent] Status - Connected: ${isConnected}, Tools: ${availableTools.length}`);
  }, [isConnected, availableTools]);

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-900 overflow-hidden">
      {/* Navigation - identity tabs */}
      <Navigation
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        promptCount={appState.prompts.length}
        toolCount={availableTools.length}
        skillCount={appState.skills?.length ?? 0}
        pluginCount={appState.plugins?.length ?? 0}
        secretCount={appState.secrets?.length ?? 0}
        agentCount={appState.agents?.length ?? 0}
        onOpenSnapshots={() => setIsSnapshotModalOpen(true)}
      />

      {/* Tab Content - using WORKING Nyx components */}
      <div className="flex-1 overflow-y-auto px-3 pt-3 pb-6 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent">
        {activeTab === 'home' && (
          <HomeTab
            appState={appState}
            availableTools={availableTools}
            connectionStatus={connectionStatus === 'connected' ? 'connected' : connectionStatus === 'reconnecting' ? 'connecting' : connectionStatus === 'error' ? 'error' : 'disconnected'}
            isSyncing={isSyncing}
            onSelectTab={setActiveTab}
            onSyncNow={handleSync}
            onUpdateState={handleStateUpdate}
            onReconnectMcp={() => (communication as any)?.forceReconnect?.()}
            onOpenToolModal={(t) => setActiveToolForExecution(t as unknown as NyxTool)}
            onOpenLocalBridge={() => setIsLocalBridgeOpen(true)}
            onOpenSnapshots={() => setIsSnapshotModalOpen(true)}
          />
        )}

        {activeTab === 'ai-router' && (
          <FreeAiRouterSection
            modelsState={appState.modelsState as any}
            onUpdateModelsState={(ms) => handleStateUpdate({ modelsState: ms })}
          />
        )}

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
          <div className="space-y-4">
            {/* WORKING Nyx ServerStatus */}
            <ServerStatus status={serverStatus} />
            
            {/* WORKING Nyx AvailableTools */}
            <AvailableTools 
              tools={availableTools} 
              onExecute={(tool) => setActiveToolForExecution(tool as unknown as NyxTool)}
              onRefresh={handleRefresh}
              isRefreshing={isRefreshing}
            />
          </div>
        )}

        {activeTab === 'skills' && (
          <SkillsTab
            skills={appState.skills || []}
            onUpdate={(skills) => handleStateUpdate({ skills })}
            availableTools={availableTools}
          />
        )}

        {activeTab === 'self-improve' && (
          <SelfImproveTab />
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
            onUpdate={(settings) => handleStateUpdate({ settings })}
            onUpdateModelsState={(modelsState) => handleStateUpdate({ modelsState })}
            onUpdateProfiles={(profiles, activeId) => handleStateUpdate({ profiles, activeProfileId: activeId })}
            onUpdateSecrets={(secrets) => handleStateUpdate({ secrets })}
            availableTools={availableTools}
            initialSection="secrets"
          />
        )}
        
        {activeTab === 'instructions' && (
          <div className="space-y-4">
            <ServerStatus status={serverStatus} />
            {/* WORKING Nyx InstructionManager */}
            <InstructionManager 
              adapter={adapterCompat} 
              tools={formattedTools} 
            />
          </div>
        )}
        
        {activeTab === 'memory' && (
          <MemoryTab memory={appState.memory} onUpdate={(m) => handleStateUpdate({ memory: m })} />
        )}
        
        {activeTab === 'prompts' && (
          <PromptsTab prompts={appState.prompts} onUpdate={(p) => handleStateUpdate({ prompts: p })} />
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
            onConnect={async (config) => {
              logMessage(`[IdentityContent] Connecting via Nyx: ${JSON.stringify(config)}`);
              if (communication?.forceReconnect) {
                const res = await communication.forceReconnect();
                if (res) {
                  toast.success('MCP Connected', 'Successfully reconnected to MCP server');
                }
                return res;
              }
              return false;
            }}
            onForceReconnect={() => {
              if (communication?.forceReconnect) {
                communication.forceReconnect();
                toast.info('MCP Reconnecting', 'Resetting connection to MCP server');
              }
            }}
            connectionStatus={connectionStatus === 'connected' ? 'connected' : connectionStatus === 'reconnecting' ? 'reconnecting' : connectionStatus === 'error' ? 'error' : connectionStatus === 'connecting' ? 'connecting' : 'disconnected'}
            toolCount={availableTools.length}
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
            modelsState={appState.modelsState}
            profiles={appState.profiles}
            activeProfileId={appState.activeProfileId}
            secrets={appState.secrets || []}
            onUpdate={(settings) => handleStateUpdate({ settings })}
            onUpdateModelsState={(modelsState) => handleStateUpdate({ modelsState })}
            onUpdateProfiles={(profiles, activeId) => handleStateUpdate({ profiles, activeProfileId: activeId })}
            onUpdateSecrets={(secrets) => handleStateUpdate({ secrets })}
            availableTools={availableTools}
          />
        )}
      </div>

      <SnapshotManagerModal
        isOpen={isSnapshotModalOpen}
        onClose={() => setIsSnapshotModalOpen(false)}
        currentState={appState}
        onRestoreState={(restored) => {
          setAppState(restored);
          saveLocalState(restored);
          toast.success('State Restored', 'Rolled back identity hub to snapshot');
        }}
      />

      <ToolExecutionModal
        tool={activeToolForExecution}
        isOpen={!!activeToolForExecution}
        onClose={() => setActiveToolForExecution(null)}
      />

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        appState={appState}
        availableTools={availableTools}
        onSelectTab={setActiveTab}
        onSwitchAgent={(agentId) => {
          const updated = (appState.agents || []).map(a => ({
            ...a,
            status: a.id === agentId ? ('active' as const) : ('idle' as const),
          }));
          handleStateUpdate({ agents: updated });
        }}
        onOpenToolModal={(tool) => setActiveToolForExecution(tool)}
        onOpenSnapshots={() => setIsSnapshotModalOpen(true)}
        onOpenLocalBridge={() => setIsLocalBridgeOpen(true)}
        onSyncNow={handleSync}
        onToast={(title, message) => toast.success(title, message)}
      />

      <LocalModelBridgeModal
        isOpen={isLocalBridgeOpen}
        onClose={() => setIsLocalBridgeOpen(false)}
        modelsState={appState.modelsState}
        onRegisterModels={(newModels) => {
          const existing = appState.modelsState?.models || [];
          const merged = [...existing, ...newModels];
          handleStateUpdate({
            modelsState: {
              ...(appState.modelsState || ({} as any)),
              models: merged,
            },
          });
          toast.success('Local Models Registered', `Added ${newModels.length} models`);
        }}
      />
    </div>
  );
};

export const IdentityContent: React.FC<IdentityContentProps> = (props) => {
  return (
    <ToastProvider>
      <IdentityContentInner {...props} />
    </ToastProvider>
  );
};