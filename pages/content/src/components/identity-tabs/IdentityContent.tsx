import React, { useState, useEffect, useMemo } from 'react';
import { Navigation } from './Navigation';
import { MemoryTab } from './MemoryTab';
import { SwarmTab } from './SwarmTab';
import { McpTab } from './McpTab';
import { SyncTab } from './SyncTab';
import { ConfigTab } from './ConfigTab';
import { SettingsTab } from './SettingsTab';
import { AppState } from '../../types/identity';
import { loadLocalState, saveLocalState } from '../../lib/identity-storage';

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

export const IdentityContent: React.FC<IdentityContentProps> = ({ 
  initialCustomInstructions = ''
}) => {
  // Use the WORKING Nyx hooks — these work because the original sidebar uses them
  const { status: connectionStatus, isConnected } = useConnectionStatus();
  const communication = useMcpCommunication();
  const adapter = useCurrentAdapter();
  
  const [appState, setAppState] = useState<AppState>(() => {
    const state = loadLocalState();
    if (initialCustomInstructions && !state.customInstructions) {
      state.customInstructions = initialCustomInstructions;
    }
    return state;
  });
  
  // Get tools from the WORKING Nyx communication
  const availableTools = communication?.availableTools || [];
  const isRefreshing = communication?.isRefreshing || false;
  const refreshTools = communication?.refreshTools || (async () => []);
  const serverStatus = communication?.serverStatus || connectionStatus || 'disconnected';
  
  const [activeTab, setActiveTab] = useState('tools');
  const [showSavedToast, setShowSavedToast] = useState(false);

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
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 2000);
  };

  const handleRefresh = async () => {
    try {
      await refreshTools(true);
    } catch (error) {
      logMessage('[IdentityContent] Refresh failed:', error);
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
        showSavedToast={showSavedToast}
      />

      {/* Tab Content - using WORKING Nyx components */}
      <div className="flex-1 overflow-y-auto px-3 pt-3 pb-6 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent">
        {activeTab === 'tools' && (
          <div className="space-y-4">
            {/* WORKING Nyx ServerStatus */}
            <ServerStatus status={serverStatus} />
            
            {/* WORKING Nyx AvailableTools */}
            <AvailableTools 
              tools={availableTools} 
              onExecute={communication?.sendMessage || (() => Promise.resolve('No communication'))}
              onRefresh={handleRefresh}
              isRefreshing={isRefreshing}
            />
          </div>
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
            onConnect={async (config) => {
              logMessage('[IdentityContent] Connecting via Nyx:', config);
              if (communication?.forceReconnect) {
                return await communication.forceReconnect();
              }
              return false;
            }}
            connectionStatus={connectionStatus === 'connected' ? 'connected' : connectionStatus === 'reconnecting' ? 'connecting' : 'disconnected'}
            serverStatus={isConnected ? 'running' : 'stopped'}
          />
        )}
        
        {activeTab === 'sync' && (
          <SyncTab
            devices={appState.devices}
            syncState={{
              syncKey: appState.syncKey,
              updatedAt: appState.updatedAt,
              isSyncing: false,
              lastSyncedAt: null,
              error: null
            }}
            onSyncNow={() => {}}
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
          <Settings />
        )}
      </div>
    </div>
  );
};