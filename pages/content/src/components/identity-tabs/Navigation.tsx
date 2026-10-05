import React, { useRef, useState, useEffect } from 'react';
import {
  Sparkles,
  Brain,
  Terminal,
  FileCode,
  Settings,
  Bot,
  RefreshCcw,
  Sliders,
  Wrench,
  Zap,
  Blocks,
  KeyRound,
  Workflow,
  Cpu,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  ChevronDown,
} from 'lucide-react';

interface NavigationProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  toolCount?: number;
  promptCount?: number;
  skillCount?: number;
  pluginCount?: number;
  secretCount?: number;
  agentCount?: number;
  modelCount?: number;
  showSavedToast?: boolean;
  onOpenSnapshots?: () => void;
}

type TabCategory = 'all' | 'agents' | 'capabilities' | 'system';

interface Tab {
  id: string;
  label: string;
  category: 'agents' | 'capabilities' | 'system';
  icon: React.ReactNode;
  badge?: number;
  shortLabel?: string;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onSelectTab,
  toolCount = 0,
  promptCount = 0,
  skillCount = 0,
  pluginCount = 0,
  secretCount = 0,
  agentCount = 0,
  modelCount = 0,
  onOpenSnapshots,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isGridOpen, setIsGridOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<TabCategory>('all');

  const tabs: Tab[] = [
    // Home
    { id: 'home', label: 'Home', category: 'system', icon: <Sparkles className="w-3.5 h-3.5" /> },

    // Agents & Orchestration
    { id: 'agents', label: 'Agents', category: 'agents', icon: <Bot className="w-3.5 h-3.5" />, badge: agentCount },
    { id: 'swarm', label: 'Swarm', category: 'agents', icon: <Workflow className="w-3.5 h-3.5" /> },
    { id: 'prompts', label: 'Prompts', category: 'agents', icon: <Sparkles className="w-3.5 h-3.5" />, badge: promptCount },
    { id: 'instructions', label: 'Instructions', category: 'agents', icon: <FileCode className="w-3.5 h-3.5" /> },

    // Capabilities & Tools
    { id: 'tools', label: 'Tools', category: 'capabilities', icon: <Wrench className="w-3.5 h-3.5" />, badge: toolCount },
    { id: 'skills', label: 'Skills', category: 'capabilities', icon: <Zap className="w-3.5 h-3.5" />, badge: skillCount },
    { id: 'plugins', label: 'Plugins', category: 'capabilities', icon: <Blocks className="w-3.5 h-3.5" />, badge: pluginCount },
    { id: 'self-improve', label: 'Evolve', category: 'capabilities', icon: <Sparkles className="w-3.5 h-3.5" /> },
    { id: 'ai-router', label: 'AI Router', category: 'capabilities', icon: <Zap className="w-3.5 h-3.5" /> },
    { id: 'mcp', label: 'MCP', category: 'capabilities', icon: <Terminal className="w-3.5 h-3.5" /> },

    // System & Config
    { id: 'memory', label: 'Memory', category: 'system', icon: <Brain className="w-3.5 h-3.5" /> },
    { id: 'sync', label: 'Sync', category: 'system', icon: <RefreshCcw className="w-3.5 h-3.5" /> },
    { id: 'config', label: 'Profiles', category: 'system', icon: <Sliders className="w-3.5 h-3.5" /> },
    { id: 'settings', label: 'Settings', category: 'system', icon: <Settings className="w-3.5 h-3.5" />, badge: modelCount + secretCount },
  ];

  const checkScroll = () => {
    const el = scrollContainerRef.current;
    if (el) {
      const hasLeft = el.scrollLeft > 4;
      const hasRight = el.scrollLeft + el.clientWidth < el.scrollWidth - 4;
      setCanScrollLeft(hasLeft);
      setCanScrollRight(hasRight);
    }
  };

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    checkScroll();
    const handleResize = () => checkScroll();
    window.addEventListener('resize', handleResize);
    el.addEventListener('scroll', checkScroll, { passive: true });

    return () => {
      window.removeEventListener('resize', handleResize);
      el.removeEventListener('scroll', checkScroll);
    };
  }, [categoryFilter]);

  // Auto-scroll active tab into view when activeTab changes
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const activeBtn = el.querySelector<HTMLButtonElement>(`[data-tab-id="${activeTab}"]`);
    if (activeBtn) {
      activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [activeTab]);

  const scrollBy = (offset: number) => {
    const el = scrollContainerRef.current;
    if (el) {
      el.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  const filteredTabs = categoryFilter === 'all'
    ? tabs
    : tabs.filter((t) => t.category === categoryFilter);

  const activeCategory = tabs.find((t) => t.id === activeTab)?.category || 'agents';

  return (
    <nav className="sticky top-0 z-40 bg-[#06121d]/95 backdrop-blur-xl border-b border-[#10b981]/25 px-2 sm:px-4 py-1.5 flex-shrink-0 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center gap-1 sm:gap-2">
        {/* Mobile / Quick category selector or All Tabs Menu */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setIsGridOpen(!isGridOpen)}
            className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              isGridOpen
                ? 'bg-[#10b981]/20 text-[#10b981] border-[#10b981]/50 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                : 'bg-slate-900/90 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
            }`}
            title="Overview all tabs"
            aria-label="Toggle all tabs menu"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-[#10b981]" />
            <span className="hidden sm:inline text-[11px]">Menu</span>
            <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isGridOpen ? 'rotate-180 text-[#10b981]' : 'text-slate-400'}`} />
          </button>

          {/* Quick Dropdown Modal for all tabs */}
          {isGridOpen && (
            <>
              <div
                className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs"
                onClick={() => setIsGridOpen(false)}
              />
              <div className="absolute left-0 top-full mt-2 w-72 sm:w-84 p-3 bg-[#0a1522] border border-[#10b981]/30 rounded-2xl shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#10b981]">All Hub Modules</span>
                  <span className="text-[10px] text-slate-400 font-mono">{tabs.length} tabs</span>
                </div>

                <div className="space-y-3 max-h-[70vh] overflow-y-auto no-scrollbar">
                  <div>
                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-1 mb-1.5">Agents & Swarm</div>
                    <div className="grid grid-cols-1 gap-1.5">
                      {tabs.filter(t => t.category === 'agents').map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => {
                            onSelectTab(tab.id);
                            setIsGridOpen(false);
                          }}
                          className={`flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-medium transition-all text-left ${
                            activeTab === tab.id
                              ? 'bg-[#10b981]/25 text-[#10b981] border border-[#10b981]/50 font-bold'
                              : 'bg-slate-900/60 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800/80'
                          }`}
                        >
                          {tab.icon}
                          <span className="truncate">{tab.label}</span>
                          {tab.badge !== undefined && tab.badge > 0 && (
                            <span className="ml-auto text-[9px] bg-[#10b981]/30 text-[#10b981] px-1.5 py-0.5 rounded-full font-bold">
                              {tab.badge}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-1 mb-1.5">Capabilities & Tools</div>
                    <div className="grid grid-cols-1 gap-1.5">
                      {tabs.filter(t => t.category === 'capabilities').map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => {
                            onSelectTab(tab.id);
                            setIsGridOpen(false);
                          }}
                          className={`flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-medium transition-all text-left ${
                            activeTab === tab.id
                              ? 'bg-[#10b981]/25 text-[#10b981] border border-[#10b981]/50 font-bold'
                              : 'bg-slate-900/60 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800/80'
                          }`}
                        >
                          {tab.icon}
                          <span className="truncate">{tab.label}</span>
                          {tab.badge !== undefined && tab.badge > 0 && (
                            <span className="ml-auto text-[9px] bg-[#10b981]/30 text-[#10b981] px-1.5 py-0.5 rounded-full font-bold">
                              {tab.badge}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-1 mb-1.5">System & Hub</div>
                    <div className="grid grid-cols-1 gap-1.5">
                      {tabs.filter(t => t.category === 'system').map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => {
                            onSelectTab(tab.id);
                            setIsGridOpen(false);
                          }}
                          className={`flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-medium transition-all text-left ${
                            activeTab === tab.id
                              ? 'bg-[#10b981]/25 text-[#10b981] border border-[#10b981]/50 font-bold'
                              : 'bg-slate-900/60 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800/80'
                          }`}
                        >
                          {tab.icon}
                          <span className="truncate">{tab.label}</span>
                          {tab.badge !== undefined && tab.badge > 0 && (
                            <span className="ml-auto text-[9px] bg-[#10b981]/30 text-[#10b981] px-1.5 py-0.5 rounded-full font-bold">
                              {tab.badge}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Scroll Left Button */}
        {false && canScrollLeft && (
          <button
            onClick={() => scrollBy(-180)}
            className="hidden sm:flex items-center justify-center w-7 h-7 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-[#10b981] transition-all flex-shrink-0 shadow-md"
            title="Scroll left"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}

        {/* Scrollable Tabs Wrapper — hidden; the "Tabs" dropdown above is the
            single tab navigation. Kept in DOM to avoid touching scroll logic. */}
        <div className="relative flex-1 min-w-0 overflow-hidden hidden">
          {/* Subtle edge fades for indication */}
          {false && canScrollLeft && (
            <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-[#06121d] to-transparent z-10" />
          )}
          {false && canScrollRight && (
            <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-[#06121d] to-transparent z-10" />
          )}

          <div
            ref={scrollContainerRef}
            className="flex items-center gap-1 sm:gap-1.5 flex-wrap no-scrollbar scroll-smooth py-0.5"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  data-tab-id={tab.id}
                  onClick={() => onSelectTab(tab.id)}
                  className={`group relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap min-h-[34px] flex-shrink-0 select-none ${
                    isActive
                      ? 'bg-gradient-to-r from-[#10b981]/25 to-[#06b6d4]/20 text-[#10b981] border border-[#10b981]/50 shadow-[0_0_14px_rgba(16,185,129,0.2)] font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent hover:border-slate-700/50'
                  }`}
                >
                  <span className={`transition-colors ${isActive ? 'text-[#10b981]' : 'text-slate-400 group-hover:text-slate-200'}`}>
                    {tab.icon}
                  </span>
                  <span className="tracking-wide">{tab.label}</span>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold transition-colors ${
                        isActive
                          ? 'bg-[#10b981]/30 text-[#10b981] border border-[#10b981]/40'
                          : 'bg-slate-800 text-slate-300 group-hover:bg-slate-700'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Scroll Right Button */}
        {false && canScrollRight && (
          <button
            onClick={() => scrollBy(180)}
            className="hidden sm:flex items-center justify-center w-7 h-7 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-[#10b981] transition-all flex-shrink-0 shadow-md"
            title="Scroll right"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

        {/* Snapshots — right-aligned in the tab bar */}
        {onOpenSnapshots && (
          <button
            onClick={onOpenSnapshots}
            className="ml-auto flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-[#10b981] rounded-lg text-xs font-semibold border border-slate-800 hover:border-slate-700 transition-all min-h-[34px] flex-shrink-0"
            title="Manage state snapshots"
            aria-label="Open snapshots"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span>Snapshots</span>
          </button>
        )}
      </div>
    </nav>
  );
};
