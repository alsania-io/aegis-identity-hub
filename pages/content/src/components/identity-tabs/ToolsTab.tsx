import React, { useState, useEffect } from 'react';
import { Wrench, RefreshCw, Check, X, AlertCircle, Search, Terminal, ChevronDown, ChevronUp, Copy, Code2 } from 'lucide-react';
import { NyxTool } from './App';
import type { ConnectionStatus } from '../../types/stores';

interface ToolsTabProps {
  tools: NyxTool[];
  isRefreshing?: boolean;
  onRefresh?: () => void;
  connectionStatus?: ConnectionStatus;
  onRunTool?: (tool: NyxTool) => void;
}

export const ToolsTab: React.FC<ToolsTabProps> = ({ 
  tools, 
  isRefreshing = false, 
  onRefresh,
  connectionStatus = 'disconnected',
  onRunTool
}) => {
  const [search, setSearch] = useState('');
  const [expandedToolNames, setExpandedToolNames] = useState<Set<string>>(new Set());
  const [copiedToolName, setCopiedToolName] = useState<string | null>(null);

  const toggleToolExpand = (name: string) => {
    setExpandedToolNames(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const expandAllTools = () => {
    setExpandedToolNames(new Set(filteredTools.map(t => t.name)));
  };

  const collapseAllTools = () => {
    setExpandedToolNames(new Set());
  };

  const handleCopySchema = (tool: NyxTool, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!tool.schema) return;
    navigator.clipboard.writeText(tool.schema).catch(() => {});
    setCopiedToolName(tool.name);
    setTimeout(() => setCopiedToolName(null), 2000);
  };

  const filteredTools = tools.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    (t.description && t.description.toLowerCase().includes(search.toLowerCase()))
  );

  const isConnected = connectionStatus === 'connected';

  return (
    <div className="space-y-4 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Wrench className="w-5 h-5 text-[#10b981]" />
          <h2 className="text-lg font-bold text-[#10b981]">Available Tools</h2>
          <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full font-mono">
            {tools.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isConnected && tools.length > 0 && (
            <button
              onClick={() => {
                if (expandedToolNames.size > 0) collapseAllTools();
                else expandAllTools();
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium border border-slate-700 transition-all min-h-[34px]"
              title={expandedToolNames.size > 0 ? "Collapse all tool schemas" : "Expand all tool schemas"}
            >
              {expandedToolNames.size > 0 ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5 text-[#10b981]" />
                  <span>Collapse</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  <span>Expand</span>
                </>
              )}
            </button>
          )}
          {onRefresh && (
            <button 
              onClick={onRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium border border-slate-700 transition-all min-h-[34px] disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          )}
        </div>
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
          placeholder="Search tools by name or description..." 
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
        <div className="grid grid-cols-1 gap-2.5 max-h-[480px] overflow-y-auto pr-1">
          {filteredTools.map((tool, index) => {
            const isExpanded = expandedToolNames.has(tool.name);
            const isCopied = copiedToolName === tool.name;

            return (
              <div 
                key={tool.name + index}
                className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 hover:border-slate-700 transition-all cursor-pointer"
                onClick={() => toggleToolExpand(tool.name)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-xs text-[#10b981]">{tool.name}</span>
                      {tool.schema && (
                        <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">
                          schema
                        </span>
                      )}
                    </div>
                    {tool.description && (
                      <p className={`text-xs text-slate-300 mt-1 leading-relaxed ${isExpanded ? '' : 'line-clamp-1'}`}>
                        {tool.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {onRunTool && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRunTool(tool);
                        }}
                        className="flex items-center gap-1 px-2 py-1 text-white bg-[#10b981] hover:bg-[#0ea472] rounded-lg text-xs font-medium transition-all border border-[#10b981]/80"
                        title="Execute this tool"
                      >
                        <span>Run</span>
                      </button>
                    )}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleToolExpand(tool.name);
                      }}
                      className="flex items-center gap-1 px-2 py-1 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-medium transition-all border border-slate-700/80"
                      title={isExpanded ? 'Collapse schema' : 'Expand schema'}
                    >
                      <span>{isExpanded ? 'Less' : 'Details'}</span>
                      {isExpanded ? <ChevronUp className="w-3 h-3 text-[#10b981]" /> : <ChevronDown className="w-3 h-3 text-slate-400" />}
                    </button>
                  </div>
                </div>

                {/* Collapsible Schema details */}
                {isExpanded && tool.schema && (
                  <div className="mt-3 pt-2.5 border-t border-slate-800">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                        <Code2 className="w-3 h-3 text-[#10b981]" /> Parameter Schema
                      </span>
                      <button
                        onClick={(e) => handleCopySchema(tool, e)}
                        className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-[#10b981] transition-colors"
                        title="Copy schema JSON"
                      >
                        {isCopied ? <Check className="w-3 h-3 text-[#10b981]" /> : <Copy className="w-3 h-3" />}
                        <span>{isCopied ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <div className="text-[10px] text-slate-300 font-mono bg-slate-950 p-2.5 rounded-lg overflow-x-auto whitespace-pre-wrap max-h-[240px] overflow-y-auto border border-slate-800/80 select-text">
                      {tool.schema}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
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