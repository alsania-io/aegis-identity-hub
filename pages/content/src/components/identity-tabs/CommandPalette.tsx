import React, { useState, useEffect, useRef } from 'react';
import {
  Search, Sparkles, Bot, Wrench, ShieldCheck, Cpu,
  History, RefreshCw, ArrowRight, CornerDownLeft, X,
  Layers, Terminal, Send, Check
} from 'lucide-react';
import { AppState, Prompt, AgentSkill } from '../../types/identity';
import { NyxTool } from './App';
import { resolvePromptVariables } from '../../lib/prompt-variables';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  appState: AppState;
  availableTools: NyxTool[];
  onSelectTab: (tab: string) => void;
  onSwitchAgent?: (agentId: string) => void;
  onOpenToolModal?: (tool: NyxTool) => void;
  onOpenLocalBridge?: () => void;
  onOpenSnapshots?: () => void;
  onSyncNow?: () => void;
  onToast?: (title: string, message: string) => void;
}

interface PaletteItem {
  id: string;
  category: 'prompt' | 'agent' | 'tool' | 'skill' | 'action' | 'navigation';
  title: string;
  subtitle: string;
  badge?: string;
  icon: React.ReactNode;
  action: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  appState,
  availableTools,
  onSelectTab,
  onSwitchAgent,
  onOpenToolModal,
  onOpenLocalBridge,
  onOpenSnapshots,
  onSyncNow,
  onToast
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeFilter, setActiveFilter] = useState<'all' | 'prompt' | 'agent' | 'tool' | 'action'>('all');
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Build items list
  const items: PaletteItem[] = [];

  // Actions
  items.push({
    id: 'act-sync',
    category: 'action',
    title: 'Synchronize Identity Hub',
    subtitle: 'Push local configuration and pull latest cloud state',
    badge: 'Sync',
    icon: <RefreshCw className="w-4 h-4 text-emerald-400" />,
    action: () => {
      onSyncNow?.();
      onClose();
    }
  });

  items.push({
    id: 'act-local-bridge',
    category: 'action',
    title: 'Local Model Bridge (Ollama / Local LLM)',
    subtitle: 'Zero-egress offline inference & discovered model registry',
    badge: 'Offline',
    icon: <Cpu className="w-4 h-4 text-cyan-400" />,
    action: () => {
      onOpenLocalBridge?.();
      onClose();
    }
  });

  items.push({
    id: 'act-snapshots',
    category: 'action',
    title: 'Snapshot & Rollback History',
    subtitle: 'Create state checkpoint or rollback to previous versions',
    badge: 'History',
    icon: <History className="w-4 h-4 text-purple-400" />,
    action: () => {
      onOpenSnapshots?.();
      onClose();
    }
  });

  // Navigation
  const tabs = [
    { id: 'home', label: 'Home Overview' },
    { id: 'prompts', label: 'Prompt Library' },
    { id: 'agents', label: 'Sovereign Agents' },
    { id: 'tools', label: 'MCP Tools' },
    { id: 'swarm', label: 'Swarm Orchestrator' },
    { id: 'memory', label: 'Echo Memory Engine' },
    { id: 'skills', label: 'Agent Skills' },
    { id: 'mcp', label: 'MCP Server Config' },
    { id: 'settings', label: 'Hub Settings' },
  ];
  tabs.forEach(t => {
    items.push({
      id: `nav-${t.id}`,
      category: 'navigation',
      title: `Jump to ${t.label}`,
      subtitle: `Open ${t.label} tab`,
      badge: 'Navigate',
      icon: <Layers className="w-4 h-4 text-slate-400" />,
      action: () => {
        onSelectTab(t.id);
        onClose();
      }
    });
  });

  // Agents
  (appState.agents || []).forEach(agent => {
    items.push({
      id: `agent-${agent.id}`,
      category: 'agent',
      title: agent.name,
      subtitle: agent.role || agent.description || 'Sovereign agent',
      badge: agent.status || 'Active',
      icon: <Bot className="w-4 h-4 text-emerald-400" />,
      action: () => {
        onSwitchAgent?.(agent.id);
        onToast?.('Agent Activated', `Switched active agent to ${agent.name}`);
        onClose();
      }
    });
  });

  // Tools
  availableTools.forEach(tool => {
    items.push({
      id: `tool-${tool.name}`,
      category: 'tool',
      title: tool.name,
      subtitle: tool.description || 'MCP Tool',
      badge: 'MCP',
      icon: <Wrench className="w-4 h-4 text-amber-400" />,
      action: () => {
        onOpenToolModal?.(tool);
        onClose();
      }
    });
  });

  // Prompts
  (appState.prompts || []).forEach(p => {
    items.push({
      id: `prompt-${p.id}`,
      category: 'prompt',
      title: p.title,
      subtitle: p.content.slice(0, 70) + (p.content.length > 70 ? '...' : ''),
      badge: p.tags?.[0] || 'Prompt',
      icon: <Sparkles className="w-4 h-4 text-emerald-400" />,
      action: async () => {
        const { resolved, resolvedVars } = await resolvePromptVariables(p.content);
        if (typeof chrome !== 'undefined' && chrome.tabs) {
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]?.id) {
              chrome.tabs.sendMessage(tabs[0].id, { action: 'PASTE_TEXT', text: resolved });
            }
          });
        }
        navigator.clipboard.writeText(resolved).catch(() => {});
        const detail = resolvedVars.length > 0 ? ` (resolved ${resolvedVars.join(', ')})` : '';
        onToast?.('Prompt Injected', `Injected "${p.title}"${detail}`);
        onClose();
      }
    });
  });

  // Filter items
  const filtered = items.filter(item => {
    if (activeFilter !== 'all' && item.category !== activeFilter) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.subtitle.toLowerCase().includes(q) ||
      (item.badge && item.badge.toLowerCase().includes(q))
    );
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, filtered.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-3 sm:pt-20 px-2 sm:px-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-100 pb-[env(safe-area-inset-bottom,0px)]"
      onClick={onClose}
    >
      <div
        className="bg-[#090e1a] border border-slate-800 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden ring-1 ring-slate-700/60"
        onClick={e => e.stopPropagation()}
      >
        {/* Search input bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-800/80 gap-3 bg-slate-900/60">
          <Search className="w-5 h-5 text-emerald-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command, prompt, tool, or agent..."
            className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none font-medium"
          />
          <kbd className="hidden sm:inline-flex text-[10px] font-mono bg-slate-950 border border-slate-800 px-1.5 py-0.5 rounded text-slate-400">
            ESC
          </kbd>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 px-3 py-2 border-b border-slate-800/60 bg-slate-950/40 text-[11px] flex-wrap">
          {(['all', 'prompt', 'agent', 'tool', 'action'] as const).map(f => (
            <button
              key={f}
              type="button"
              onClick={() => {
                setActiveFilter(f);
                setSelectedIndex(0);
              }}
              className={`px-2.5 py-1 rounded-md font-medium capitalize transition-colors ${
                activeFilter === f
                  ? 'bg-emerald-500/15 text-emerald-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {f === 'all' ? 'All Items' : f + 's'}
            </button>
          ))}
          <span className="ml-auto text-[10px] font-mono text-slate-500">
            {filtered.length} matches
          </span>
        </div>

        {/* Results List */}
        <div ref={listRef} className="max-h-[380px] overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-xs">
              No results found for "{query}".
            </div>
          ) : (
            filtered.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-slate-800/90 border border-slate-700 shadow-xs'
                      : 'hover:bg-slate-900/60 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="shrink-0 p-1.5 rounded-lg bg-slate-950 border border-slate-800">
                      {item.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold truncate ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                          {item.title}
                        </span>
                        {item.badge && (
                          <span className="text-[10px] font-mono text-slate-500">
                            · {item.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {item.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 pl-2">
                    {isSelected && (
                      <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                        <span>Press</span>
                        <CornerDownLeft className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>Esc Close</span>
          </div>
          <span className="text-emerald-400">Alsania Aegis Command</span>
        </div>
      </div>
    </div>
  );
};
