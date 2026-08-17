import React from 'react';
import { Sparkles, Brain, Terminal, FileCode, Settings, Bot, RefreshCcw, Sliders, Wrench, Check } from 'lucide-react';

interface NavigationProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  toolCount?: number;
  promptCount?: number;
  showSavedToast?: boolean;
}

interface Tab {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab, onSelectTab, toolCount = 0, promptCount = 0, showSavedToast = false
}) => {
  const tabs: Tab[] = [
    { id: 'tools', label: 'Tools', icon: <Wrench className="w-3.5 h-3.5" />, badge: toolCount },
    { id: 'prompts', label: 'Prompts', icon: <Sparkles className="w-3.5 h-3.5" />, badge: promptCount },
    { id: 'memory', label: 'Memory', icon: <Brain className="w-3.5 h-3.5" /> },
    { id: 'swarm', label: 'Swarm', icon: <Bot className="w-3.5 h-3.5" /> },
    { id: 'mcp', label: 'MCP', icon: <Terminal className="w-3.5 h-3.5" /> },
    { id: 'instructions', label: 'Instructions', icon: <FileCode className="w-3.5 h-3.5" /> },
    { id: 'sync', label: 'Sync', icon: <RefreshCcw className="w-3.5 h-3.5" /> },
    { id: 'config', label: 'Profiles', icon: <Sliders className="w-3.5 h-3.5" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-3.5 h-3.5" /> },
  ];

  return (
    <nav className="sticky top-0 z-20 bg-[#0a0f1d]/95 backdrop-blur-lg border-b border-[#10b981]/20 px-1 py-1 flex-shrink-0">
      <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-none">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => onSelectTab(tab.id)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all whitespace-nowrap min-h-[30px] ${
              activeTab === tab.id
                ? 'bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/40 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}>
            {tab.icon}
            <span>{tab.label}</span>
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className="text-[9px] bg-[#10b981]/30 text-[#10b981] px-1.5 py-0.5 rounded-full font-bold">
                {tab.badge}
              </span>
            )}
          </button>
        ))}

        {showSavedToast && (
          <div className="flex items-center gap-1 px-3 py-1 bg-[#10b981]/15 border border-[#10b981]/30 rounded-full text-[10px] text-[#10b981] font-mono animate-in fade-in slide-in-from-right-2 duration-300 shrink-0 ml-auto">
            <Check className="w-3 h-3" /> Saved
          </div>
        )}
      </div>
    </nav>
  );
};