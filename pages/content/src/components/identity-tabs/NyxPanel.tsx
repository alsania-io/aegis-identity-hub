import React from 'react';
import ServerStatus from '../sidebar/ServerStatus/ServerStatus';
import AvailableTools from '../sidebar/AvailableTools/AvailableTools';
import InstructionManager from '../sidebar/Instructions/InstructionManager';
import Settings from '../sidebar/Settings/Settings';
import { useMcpCommunication } from '@src/hooks/useMcpCommunication';
import { useConnectionStatus, useCurrentAdapter } from '@src/hooks';
import { logMessage } from '@src/utils/helpers';

interface NyxPanelProps {
  activeTab: 'tools' | 'instructions' | 'settings';
}

export const NyxPanel: React.FC<NyxPanelProps> = ({ activeTab }) => {
  // Use the REAL Nyx hooks — these work in the sidebar context
  const { status: connectionStatus, isConnected } = useConnectionStatus();
  const communication = useMcpCommunication();
  const adapter = useCurrentAdapter();
  
  const availableTools = communication?.availableTools || [];
  const isRefreshing = (communication as any)?.isRefreshing || false;
  const refreshTools = communication?.refreshTools || (async () => []);
  const serverStatus = (communication as any)?.serverStatus || connectionStatus || 'disconnected';
  
  // Format tools for InstructionManager
  const formattedTools = availableTools.map(tool => ({
    name: tool.name,
    schema: tool.schema,
    description: tool.description || '',
  }));
  
  // Create adapter for InstructionManager
  const adapterCompat = {
    insertTextIntoInput: (text: string) => adapter?.insertText?.(text),
    triggerSubmission: () => adapter?.submitForm?.(),
    supportsFileUpload: () => adapter?.hasCapability?.('file-attachment') || false,
    attachFile: (file: File) => adapter?.attachFile?.(file),
    name: adapter?.activeAdapterName || 'Unknown',
    isReady: adapter?.isReady || false,
    status: adapter?.status || 'disconnected',
    capabilities: adapter?.capabilities || [],
  };
  
  const handleRefresh = async () => {
    try {
      await refreshTools(true);
    } catch (error) {
      logMessage(`[NyxPanel] Refresh failed: ${error}`);
    }
  };
  
  return (
    <div className="space-y-4">
      <ServerStatus status={serverStatus} />
      
      {activeTab === 'tools' && (
        <AvailableTools 
          tools={availableTools} 
          onExecute={communication?.sendMessage || (() => Promise.resolve('No communication'))}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
        />
      )}
      
      {activeTab === 'instructions' && (
        <InstructionManager 
          adapter={adapterCompat} 
          tools={formattedTools} 
        />
      )}
      
      {activeTab === 'settings' && (
        <Settings />
      )}
    </div>
  );
};