import React, { useState, useEffect } from 'react';
import { Wrench, RefreshCw, Check, X, AlertCircle, Search, Terminal } from 'lucide-react';
import { NyxTool } from './App';

interface ToolsTabProps {
  tools: NyxTool[];
  isRefreshing?: boolean;
  onRefresh?: () => void;
  connectionStatus?: 'connected' | 'disconnected' | 'connecting' | 'error';
}

export const ToolsTab: React.FC<ToolsTabProps> = ({ 
  tools, 
  isRefreshing = false, 
  onRefresh,
  connectionStatus = 'disconnected'
}) => {
  const [search, setSearch] = useState('');
  const [selectedTool, setSelectedTool] = useState<NyxTool | null>(null);

  const filteredTools = tools.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    (t.description && t.description.toLowerCase().includes(search.toLowerCase()))
  );

  const isConnected = connectionStatus === 'connected';

  return (
    <div className="space-y-4 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wrench className="w-5 h-5 text-[#10b981]" />
          <h2 className="text-lg font-bold text-[#10b981]">Available Tools</h2>
          <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
            {tools.length}
          </span>
        </div>
        {onRefresh && (
          <button 
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium border border-slate-700 transition-all min-h-[36px] disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        )}
      </div>

      {/* Connection Status */}
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${
        isConnected 
          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
          : connectionStatus === 'connecting'
          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
          : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
      }`}>
        <div className={`w-2 h-2 rounded-full ${
          isConnected ? 'bg-emerald-400 animate-pulse' : 
          connectionStatus === 'connecting' ? 'bg-amber-400 animate-pulse' : 
          'bg-rose-400'
        }`} />
        <span>
          {isConnected ? `Connected — ${tools.length} tools available` : 
           connectionStatus === 'connecting' ? 'Connecting to MCP server...' : 
           'Disconnected — MCP server not available'}
        </span>
        {!isConnected && connectionStatus !== 'connecting' && (
          <span className="text-[10px] text-slate-500 ml-auto">
            Check MCP tab for configuration
          </span>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input 
          type="text" 
          placeholder="Search tools..." 
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl py-2 pl-9 pr-4 text-xs text-slate-200 focus:outline-none focus:border-[#10b981] min-h-[40px]"
          disabled={!isConnected}
        />
      </div>

      {/* Tools List */}
      {!isConnected ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center">
          <Terminal className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-sm text-slate-400">No MCP connection</p>
          <p className="text-xs text-slate-500 mt-1">Connect to an MCP server to see available tools</p>
        </div>
      ) : filteredTools.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center">
          <p className="text-sm text-slate-400">
            {search ? 'No tools match your search' : 'No tools available'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto pr-1">
          {filteredTools.map((tool, index) => (
            <div 
              key={tool.name + index}
              className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 hover:border-slate-700 transition-all cursor-pointer"
              onClick={() => setSelectedTool(selectedTool?.name === tool.name ? null : tool)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-[#10b981]">{tool.name}</span>
                    {tool.description && (
                      <span className="text-[10px] text-slate-400 truncate">{tool.description}</span>
                    )}
                  </div>
                  {selectedTool?.name === tool.name && tool.schema && (
                    <div className="mt-2 pt-2 border-t border-slate-800">
                      <div className="text-[10px] text-slate-400 font-mono bg-slate-950 p-2 rounded-lg overflow-x-auto whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                        {tool.schema}
                      </div>
                    </div>
                  )}
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedTool(selectedTool?.name === tool.name ? null : tool);
                  }}
                  className="text-slate-500 hover:text-slate-300 p-1 rounded"
                >
                  {selectedTool?.name === tool.name ? '▲' : '▼'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isConnected && tools.length > 0 && (
        <div className="text-[10px] text-slate-500 text-center pt-2 border-t border-slate-800">
          {tools.length} tool{tools.length !== 1 ? 's' : ''} available
        </div>
      )}
    </div>
  );
};