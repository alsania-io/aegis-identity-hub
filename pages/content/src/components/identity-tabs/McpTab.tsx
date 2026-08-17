import React, { useState } from 'react';
import { Plug, RefreshCw, CheckCircle2, XCircle, Loader2, Plus, Trash2, Server } from 'lucide-react';
import { McpConfig } from '../../types/identity';

type McpConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'reconnecting' | 'error';

interface McpTabProps {
  config: McpConfig;
  onUpdate: (config: McpConfig) => void;
  onConnect: (config: McpConfig) => Promise<boolean>;
  onForceReconnect: () => void;
  connectionStatus: McpConnectionStatus;
  connectionError?: string | null;
  toolCount: number;
}

const TRANSPORT_OPTIONS: Array<{ value: McpConfig['transportType']; label: string }> = [
  { value: 'sse', label: 'SSE' },
  { value: 'websocket', label: 'WebSocket' },
  { value: 'streamable-http', label: 'Streamable HTTP' }
];

export const McpTab: React.FC<McpTabProps> = ({
  config,
  onUpdate,
  onConnect,
  onForceReconnect,
  connectionStatus,
  connectionError,
  toolCount
}) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [newJsonName, setNewJsonName] = useState('');

  const isConnected = connectionStatus === 'connected';
  const isBusy = connectionStatus === 'connecting' || connectionStatus === 'reconnecting' || isConnecting;

  const handleField = <K extends keyof McpConfig>(key: K, value: McpConfig[K]) => {
    onUpdate({ ...config, [key]: value });
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      await onConnect(config);
    } finally {
      setIsConnecting(false);
    }
  };

  const addJsonConfig = () => {
    const name = newJsonName.trim() || `config-${(config.customJsonConfigs?.length || 0) + 1}`;
    const next = [...(config.customJsonConfigs || []), { name, content: '{}' }];
    handleField('customJsonConfigs', next);
    setNewJsonName('');
  };

  const updateJsonConfig = (index: number, patch: Partial<{ name: string; content: string }>) => {
    const next = (config.customJsonConfigs || []).map((c, i) => (i === index ? { ...c, ...patch } : c));
    handleField('customJsonConfigs', next);
  };

  const removeJsonConfig = (index: number) => {
    const next = (config.customJsonConfigs || []).filter((_, i) => i !== index);
    handleField('customJsonConfigs', next);
  };

  const statusMeta: Record<McpConnectionStatus, { label: string; classes: string; icon: React.ReactNode }> = {
    connected: {
      label: `Connected — ${toolCount} tool${toolCount !== 1 ? 's' : ''} available`,
      classes: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30',
      icon: <CheckCircle2 className="w-4 h-4" />
    },
    connecting: {
      label: 'Connecting to MCP server...',
      classes: 'bg-amber-500/10 text-amber-400 border border-amber-500/30',
      icon: <Loader2 className="w-4 h-4 animate-spin" />
    },
    reconnecting: {
      label: 'Reconnecting to MCP server...',
      classes: 'bg-amber-500/10 text-amber-400 border border-amber-500/30',
      icon: <Loader2 className="w-4 h-4 animate-spin" />
    },
    error: {
      label: connectionError || 'Connection error',
      classes: 'bg-rose-500/10 text-rose-400 border border-rose-500/30',
      icon: <XCircle className="w-4 h-4" />
    },
    disconnected: {
      label: 'Disconnected — MCP server not available',
      classes: 'bg-rose-500/10 text-rose-400 border border-rose-500/30',
      icon: <XCircle className="w-4 h-4" />
    }
  };

  const status = statusMeta[connectionStatus] || statusMeta.disconnected;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-[#10b981] flex items-center gap-2">
          <Plug className="w-5 h-5" /> MCP Connection
        </h2>
        <button
          onClick={onForceReconnect}
          disabled={isBusy}
          className="flex items-center gap-2 px-3 py-2 bg-slate-800 text-slate-300 hover:bg-slate-700 rounded-xl text-xs font-medium border border-slate-700 transition-all min-h-[40px] disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isBusy ? 'animate-spin' : ''}`} />
          Force Reconnect
        </button>
      </div>

      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${status.classes}`}>
        {status.icon}
        <span>{status.label}</span>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
        <label className="block text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <Server className="w-4 h-4" /> Server Configuration
        </label>

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Server URL</label>
            <input
              type="text"
              value={config.serverUrl}
              onChange={(e) => handleField('serverUrl', e.target.value)}
              placeholder="http://localhost:3000"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm font-mono text-slate-300 focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981]/30 focus:outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Transport</label>
            <div className="flex gap-2">
              {TRANSPORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleField('transportType', opt.value)}
                  className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                    config.transportType === opt.value
                      ? 'bg-[#10b981]/15 text-[#10b981] border-[#10b981]/30'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Custom Args (optional)</label>
            <input
              type="text"
              value={config.customArgs || ''}
              onChange={(e) => handleField('customArgs', e.target.value)}
              placeholder="--flag value"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm font-mono text-slate-300 focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981]/30 focus:outline-none transition-all"
            />
          </div>
        </div>

        <button
          onClick={handleConnect}
          disabled={isBusy || !config.serverUrl}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#10b981] text-slate-950 hover:bg-[#0ea371] rounded-xl text-sm font-bold transition-all disabled:opacity-50 min-h-[44px]"
        >
          {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plug className="w-4 h-4" />}
          {isConnected ? 'Reconnect' : 'Connect'}
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-bold text-slate-200 uppercase tracking-wider">
            Custom JSON Configs
          </label>
        </div>
        <p className="text-xs text-slate-400">
          Additional named MCP server configs (mirrors the mcpServers block used by Claude Desktop / Nyx).
        </p>

        <div className="space-y-3">
          {(config.customJsonConfigs || []).map((jc, i) => (
            <div key={`${jc.name}-${i}`} className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={jc.name}
                  onChange={(e) => updateJsonConfig(i, { name: e.target.value })}
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs font-mono text-slate-300 focus:border-[#10b981] focus:outline-none"
                />
                <button
                  onClick={() => removeJsonConfig(i)}
                  className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <textarea
                value={jc.content}
                onChange={(e) => updateJsonConfig(i, { content: e.target.value })}
                rows={4}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-[11px] font-mono text-slate-300 focus:border-[#10b981] focus:outline-none"
              />
            </div>
          ))}

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newJsonName}
              onChange={(e) => setNewJsonName(e.target.value)}
              placeholder="config name..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-300 focus:border-[#10b981] focus:outline-none"
            />
            <button
              onClick={addJsonConfig}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#10b981]/15 text-[#10b981] hover:bg-[#10b981]/25 rounded-xl text-xs font-bold uppercase transition-all border border-[#10b981]/30"
            >
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
