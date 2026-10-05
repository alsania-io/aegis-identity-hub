import type { ConnectionType } from '../../../types/stores';
import type React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { useMcpCommunication } from '@src/hooks/useMcpCommunication';
import { useConnectionStatus, useServerConfig } from '../../../hooks';
import { logMessage } from '@src/utils/helpers';
import { eventBus } from '@src/events/event-bus';
import { Typography, Icon, Button } from '../ui';
import { cn } from '@src/lib/utils';
import { Card, CardContent } from '@src/components/ui/card';
import { createLogger } from '@extension/shared/lib/logger';

const logger = createLogger('ServerStatus');

interface ServerStatusProps {
  status: string;
}

const ServerStatus: React.FC<ServerStatusProps> = ({ status: initialStatus }) => {
  const { status: connectionStatus, isConnected, isReconnecting: storeIsReconnecting, error: connectionError } = useConnectionStatus();
  const { config: serverConfig, setConfig: setServerConfig } = useServerConfig();

  const [showDetails, setShowDetails] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [lastReconnectTime, setLastReconnectTime] = useState('');
  const [serverUri, setServerUri] = useState<string>(serverConfig.uri || 'http://localhost:3055/sse');
  const [connectionType, setConnectionType] = useState<ConnectionType>(serverConfig.connectionType || 'sse');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [hasBackgroundError, setHasBackgroundError] = useState<boolean>(false);
  const [isEditingUri, setIsEditingUri] = useState<boolean>(false);
  const [isEditingConnectionType, setIsEditingConnectionType] = useState<boolean>(false);
  const [lastErrorMessage, setLastErrorMessage] = useState<string>('');
  const [configFetched, setConfigFetched] = useState<boolean>(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [settingsAnimating, setSettingsAnimating] = useState(false);
  const [detailsAnimating, setDetailsAnimating] = useState(false);

  const communicationMethods = useMcpCommunication();

  const status = connectionStatus || initialStatus || 'unknown';

  useEffect(() => {
    logger.debug(`Status update - connectionStatus: ${connectionStatus}, initialStatus: ${initialStatus}, final: ${status}`);
  }, [connectionStatus, initialStatus, status]);

  const forceReconnect = useCallback(async () => {
    try {
      if (!communicationMethods.forceReconnect) {
        throw new Error('Communication method unavailable');
      }
      const result = await communicationMethods.forceReconnect();
      setHasBackgroundError(false);
      return result;
    } catch (error) {
      logMessage(`[ServerStatus] Force reconnect error: ${error instanceof Error ? error.message : String(error)}`);
      setHasBackgroundError(true);
      return false;
    }
  }, [communicationMethods]);

  const refreshTools = useCallback(async (forceRefresh = false) => {
    try {
      if (!communicationMethods.refreshTools) {
        throw new Error('Communication method unavailable');
      }
      return await communicationMethods.refreshTools(forceRefresh);
    } catch (error) {
      logMessage(`[ServerStatus] Refresh tools error: ${error instanceof Error ? error.message : String(error)}`);
      setHasBackgroundError(true);
      return [];
    }
  }, [communicationMethods]);

  const getServerConfig = useCallback(async () => {
    try {
      if (!communicationMethods.getServerConfig) {
        throw new Error('Communication method unavailable');
      }
      const cfg = await communicationMethods.getServerConfig();
      setHasBackgroundError(false);
      return cfg;
    } catch (error) {
      logMessage(`[ServerStatus] Get server config error: ${error instanceof Error ? error.message : String(error)}`);
      setHasBackgroundError(true);
      throw error;
    }
  }, [communicationMethods]);

  const updateServerConfig = useCallback(async (config: { uri: string; connectionType: ConnectionType }) => {
    try {
      if (!communicationMethods.updateServerConfig) {
        throw new Error('Communication method unavailable');
      }
      return await communicationMethods.updateServerConfig(config);
    } catch (error) {
      logMessage(`[ServerStatus] Update server config error: ${error instanceof Error ? error.message : String(error)}`);
      setHasBackgroundError(true);
      return false;
    }
  }, [communicationMethods]);

  useEffect(() => {
    if (serverConfig.uri && !isEditingUri) {
      setServerUri(serverConfig.uri);
    }
    if (serverConfig.connectionType && !isEditingConnectionType) {
      setConnectionType(serverConfig.connectionType);
    }
  }, [serverConfig.uri, serverConfig.connectionType, isEditingUri, isEditingConnectionType]);

  useEffect(() => {
    const checkImmediateStatus = async () => {
      if (communicationMethods.forceConnectionStatusCheck) {
        try {
          await communicationMethods.forceConnectionStatusCheck();
        } catch (error) {
          logMessage(`[ServerStatus] Immediate status check failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    };
    const timeoutId = setTimeout(checkImmediateStatus, 100);
    return () => clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (isReconnecting || storeIsReconnecting) return;
    if (hasBackgroundError) {
      setStatusMessage('Extension background services unavailable. Try reloading the page.');
    } else {
      switch (status) {
        case 'connected':
          setStatusMessage('MCP Server is connected and ready');
          if (!isConnected) {
            setShowSuccessAnimation(true);
            setTimeout(() => setShowSuccessAnimation(false), 1000);
          }
          break;
        case 'disconnected':
          setStatusMessage('MCP Server is unavailable. Some features will be limited.');
          break;
        case 'error':
          setStatusMessage(connectionError || 'Error connecting to extension services.');
          break;
        default:
          setStatusMessage('Checking MCP Server status...');
      }
    }
  }, [status, connectionError, hasBackgroundError, isReconnecting, storeIsReconnecting, isConnected]);

  useEffect(() => {
    const unsubscribeCallbacks: (() => void)[] = [];
    const unsubscribeConnection = eventBus.on('connection:status-changed', (data) => {
      logMessage(`[ServerStatus] Connection status event: ${data.status}`);
      if (data.error) setLastErrorMessage(data.error);
      if (data.status === 'connected') {
        setLastReconnectTime(new Date().toLocaleTimeString());
        setShowSuccessAnimation(true);
        setTimeout(() => setShowSuccessAnimation(false), 1000);
      }
    });
    unsubscribeCallbacks.push(unsubscribeConnection);
    return () => unsubscribeCallbacks.forEach(unsubscribe => unsubscribe());
  }, []);

  const handleReconnect = async () => {
    const startTime = Date.now();
    const minDisplayDuration = 1200;
    try {
      setIsReconnecting(true);
      setStatusMessage('Attempting to reconnect...');
      const success = await forceReconnect();
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, minDisplayDuration - elapsed);
      if (remaining > 0) await new Promise(r => setTimeout(r, remaining));
      if (success) {
        setStatusMessage('Successfully reconnected');
        await refreshTools(true);
      } else {
        setStatusMessage('Failed to reconnect');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setLastErrorMessage(errorMessage);
      setStatusMessage(`Connection failed: ${errorMessage}`);
    } finally {
      setIsReconnecting(false);
    }
  };

  const handleSaveServerConfig = async () => {
    if (!communicationMethods.updateServerConfig) return;
    setIsReconnecting(true);
    setStatusMessage('Saving configuration...');
    setLastErrorMessage('');
    try {
      setServerConfig({ uri: serverUri, connectionType });
      await updateServerConfig({ uri: serverUri, connectionType });
      setIsEditingUri(false);
      setIsEditingConnectionType(false);
      const success = await forceReconnect();
      if (success) {
        setStatusMessage('Successfully connected');
        await refreshTools(true);
      } else {
        setStatusMessage('Failed to connect to server');
      }
      setShowSettings(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setLastErrorMessage(errorMessage);
      setStatusMessage(`Configuration failed: ${errorMessage}`);
    } finally {
      setIsReconnecting(false);
    }
  };

  const getStatusInfo = () => {
    const baseColors = {
      emerald: { text: 'text-emerald-500', bg: 'bg-emerald-100', darkBg: 'dark:bg-emerald-900/20' },
      amber: { text: 'text-amber-500', bg: 'bg-amber-100', darkBg: 'dark:bg-amber-900/20' },
      rose: { text: 'text-rose-500', bg: 'bg-rose-100', darkBg: 'dark:bg-rose-900/20' },
      slate: { text: 'text-slate-500', bg: 'bg-slate-100', darkBg: 'dark:bg-slate-900/20' },
    };
    const displayStatus = isReconnecting ? 'reconnecting' : status;
    switch (displayStatus) {
      case 'connected':
        return { color: baseColors.emerald.text, bgColor: cn(baseColors.emerald.bg, baseColors.emerald.darkBg), icon: <Icon name="check" />, label: 'Connected' };
      case 'reconnecting':
        return { color: baseColors.amber.text, bgColor: cn(baseColors.amber.bg, baseColors.amber.darkBg), icon: <Icon name="refresh" className="animate-spin" />, label: 'Reconnecting' };
      case 'disconnected':
        return { color: baseColors.rose.text, bgColor: cn(baseColors.rose.bg, baseColors.rose.darkBg), icon: <Icon name="x" />, label: 'Disconnected' };
      case 'error':
        return { color: baseColors.rose.text, bgColor: cn(baseColors.rose.bg, baseColors.rose.darkBg), icon: <Icon name="info" />, label: 'Error' };
      default:
        return { color: baseColors.slate.text, bgColor: cn(baseColors.slate.bg, baseColors.slate.darkBg), icon: <Icon name="info" />, label: 'Unknown' };
    }
  };

  const statusInfo = getStatusInfo();
  const isDisconnectedOrError = status === 'disconnected' || status === 'error';

  return (
    <div className="relative px-4 py-3 border-b border-slate-200 dark:border-slate-800 transition-all duration-300">
      {showSuccessAnimation && (
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-100 to-green-100 dark:from-emerald-900/20 dark:to-green-900/20 opacity-30 animate-pulse rounded-sm" />
      )}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn('flex items-center justify-center w-8 h-8 rounded-full', statusInfo.bgColor)}>
            {statusInfo.icon}
          </div>
          <div className="flex flex-col">
            <Typography variant="body" className={cn('font-semibold', isDisconnectedOrError ? 'text-rose-700 dark:text-rose-400' : status === 'connected' ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-200')}>
              Server {statusInfo.label}
            </Typography>
            <div className="text-xs mt-0.5 text-slate-500 dark:text-slate-400">{statusMessage}</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={handleReconnect} disabled={isReconnecting} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
            <Icon name="refresh" size="sm" className={isReconnecting ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setShowSettings(!showSettings)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
            <Icon name="settings" size="sm" />
          </button>
          <button onClick={() => setShowDetails(!showDetails)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
            <Icon name="info" size="sm" />
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="mt-3">
          <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg">
            <CardContent className="p-4 text-xs text-slate-700 dark:text-slate-300">
              <Typography variant="h4" className="mb-3 text-slate-800 dark:text-slate-100 font-semibold">Server Configuration</Typography>
              <div className="mb-4">
                <label className="block mb-2 text-slate-600 dark:text-slate-400 font-medium">Connection Type</label>
                <select value={connectionType} onChange={e => setConnectionType(e.target.value as ConnectionType)} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200">
                  <option value="sse">SSE (mcpnyx - port 3055)</option>
                  <option value="streamable-http">Streamable HTTP (mcpnyx-u - port 3057)</option>
                  <option value="websocket">WebSocket</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="block mb-2 text-slate-600 dark:text-slate-400 font-medium">Server URI</label>
                <input type="text" value={serverUri} onChange={e => setServerUri(e.target.value)} placeholder={connectionType === 'sse' ? 'http://localhost:3055/sse' : connectionType === 'websocket' ? 'ws://localhost:3055/message' : 'http://localhost:3057/sse'} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200" />
              </div>
              <div className="flex justify-end gap-2">
                <Button onClick={() => { setShowSettings(false); }} variant="outline" size="sm">Cancel</Button>
                <Button onClick={handleSaveServerConfig} variant="default" size="sm" disabled={isReconnecting}>
                  {isReconnecting ? 'Connecting...' : 'Save & Reconnect'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showDetails && (
        <div className="mt-3">
          <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg">
            <CardContent className="p-4 text-xs text-slate-700 dark:text-slate-300">
              <Typography variant="h4" className="mb-3 text-slate-800 dark:text-slate-100 font-semibold">Connection Details</Typography>
              <div className="space-y-2">
                <div className="flex justify-between py-1"><span className="font-medium">Status:</span><span>{statusInfo.label}</span></div>
                <div className="flex justify-between py-1"><span className="font-medium">Server URI:</span><span className="break-all">{serverUri || 'Not configured'}</span></div>
                <div className="flex justify-between py-1"><span className="font-medium">Connection Type:</span><span>{connectionType}</span></div>
                {lastReconnectTime && <div className="flex justify-between py-1"><span className="font-medium">Last reconnect:</span><span>{lastReconnectTime}</span></div>}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ServerStatus;