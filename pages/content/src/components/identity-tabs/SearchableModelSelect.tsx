import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, Plus, X, Cpu, Globe, Server, Sparkles } from 'lucide-react';
import { AiModelItem } from '../../types/identity';

export interface SearchableModelSelectProps {
  value: string;
  onChange: (modelId: string) => void;
  models?: AiModelItem[];
  presets?: Array<{ value: string; label: string }>;
  placeholder?: string;
  label?: string;
  helperText?: string;
  disabled?: boolean;
  allowCustom?: boolean;
  className?: string;
  size?: 'sm' | 'md';
}

export const SearchableModelSelect: React.FC<SearchableModelSelectProps> = ({
  value,
  onChange,
  models = [],
  presets = [],
  placeholder = 'Select a model...',
  label,
  helperText,
  disabled = false,
  allowCustom = true,
  className = '',
  size = 'md',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<string>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Normalize models list: combine passed models with presets if models is empty
  const allModels: Array<{
    id: string;
    name: string;
    rawId: string;
    providerName: string;
    providerId?: string;
    category?: string;
    contextWindow?: number;
  }> = useMemo(() => {
    if (models && models.length > 0) {
      return models.map((m) => ({
        id: m.id,
        name: m.name,
        rawId: m.rawId,
        providerName: m.providerName,
        providerId: m.providerId,
        category: m.category,
        contextWindow: m.contextWindow,
      }));
    }
    return presets.map((p) => {
      const parts = p.value.split('/');
      const provider = parts.length > 1 ? parts[0] : 'System';
      return {
        id: p.value,
        name: p.label.replace(/^\[.*?\]\s*/, ''),
        rawId: p.value,
        providerName: provider.toUpperCase(),
        providerId: provider.toLowerCase(),
      };
    });
  }, [models, presets]);

  // Unique providers for filter chips
  const providers = useMemo(() => {
    const set = new Set<string>();
    allModels.forEach((m) => {
      if (m.providerName) set.add(m.providerName);
    });
    return Array.from(set).sort();
  }, [allModels]);

  // Current selected model object
  const currentModel = useMemo(() => {
    return allModels.find((m) => m.id === value);
  }, [allModels, value]);

  // Filtered models
  const filteredModels = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allModels.filter((m) => {
      // Provider filter
      if (selectedProvider !== 'all' && m.providerName !== selectedProvider) {
        return false;
      }
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) ||
        m.rawId.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q) ||
        m.providerName.toLowerCase().includes(q) ||
        (m.category && m.category.toLowerCase().includes(q))
      );
    });
  }, [allModels, search, selectedProvider]);

  // Close dropdown on click outside.
  // NOTE: the hub renders inside a Shadow DOM (#mcp-sidebar-shadow-host), so
  // `contains(e.target)` is unreliable — events retarget to the shadow HOST as
  // they cross the boundary, making the host appear "outside" dropdownRef even
  // when the click originated inside it. composedPath() sees through the
  // boundary and reports the true original target chain.
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const path = typeof e.composedPath === 'function' ? e.composedPath() : [];
      const inside = path.length
        ? path.includes(dropdownRef.current as EventTarget)
        : !!dropdownRef.current && dropdownRef.current.contains(e.target as Node);
      if (!inside) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside, true);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, [isOpen]);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearch('');
      setSelectedProvider('all');
    }
  }, [isOpen]);

  const handleSelect = (id: string) => {
    onChange(id);
    setIsOpen(false);
  };

  const handleCustomSubmit = () => {
    const trimmed = search.trim();
    if (trimmed) {
      onChange(trimmed);
      setIsOpen(false);
    }
  };

  const isCustomValue = value && !currentModel;

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {label && (
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs font-semibold text-slate-300">{label}</label>
          {helperText && <span className="text-[10px] text-slate-500">{helperText}</span>}
        </div>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-[#0f172a] border transition-all text-left flex items-center justify-between gap-2 rounded-xl ${
          isOpen
            ? 'border-[#10b981] ring-1 ring-[#10b981]/40'
            : 'border-slate-800 hover:border-slate-700'
        } ${
          size === 'sm' ? 'px-2.5 py-1.5 text-xs min-h-[36px]' : 'px-3 py-2 text-xs min-h-[42px]'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {currentModel ? (
            <>
              <span className="shrink-0 text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                {currentModel.providerName}
              </span>
              <span className="truncate font-medium text-slate-100">{currentModel.name}</span>
              <span className="hidden sm:inline text-[11px] font-mono text-slate-500 truncate max-w-[140px]">
                ({currentModel.rawId})
              </span>
            </>
          ) : isCustomValue ? (
            <>
              <span className="shrink-0 text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                Custom
              </span>
              <span className="truncate font-mono text-slate-200">{value}</span>
            </>
          ) : (
            <span className="text-slate-500">{placeholder}</span>
          )}
        </div>

        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[#10b981]' : ''
          }`}
        />
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-[#0b1120] border border-slate-700/90 rounded-2xl shadow-[0_10px_35px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[380px] animate-in fade-in duration-150">
          {/* Search Header */}
          <div className="p-2.5 border-b border-slate-800 bg-slate-900/80 space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (filteredModels.length > 0) {
                      handleSelect(filteredModels[0].id);
                    } else if (allowCustom && search.trim()) {
                      handleCustomSubmit();
                    }
                  } else if (e.key === 'Escape') {
                    setIsOpen(false);
                  }
                }}
                placeholder="Search models by name, raw ID, provider..."
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#10b981]"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white p-0.5 rounded"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Provider Filter Chips */}
            {providers.length > 1 && (
              <div className="flex items-center gap-1.5 flex-wrap pb-1 scrollbar-none text-[10px]">
                <button
                  type="button"
                  onClick={() => setSelectedProvider('all')}
                  className={`px-2 py-0.5 rounded-lg whitespace-nowrap transition-colors ${
                    selectedProvider === 'all'
                      ? 'bg-[#10b981]/20 text-[#10b981] font-bold border border-[#10b981]/40'
                      : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All ({allModels.length})
                </button>
                {providers.map((p) => {
                  const count = allModels.filter((m) => m.providerName === p).length;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setSelectedProvider(p)}
                      className={`px-2 py-0.5 rounded-lg whitespace-nowrap transition-colors ${
                        selectedProvider === p
                          ? 'bg-[#10b981]/20 text-[#10b981] font-bold border border-[#10b981]/40'
                          : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {p} ({count})
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Model Options List */}
          <div className="overflow-y-auto flex-1 p-1.5 space-y-1 divide-y divide-slate-800/30">
            {filteredModels.length === 0 ? (
              <div className="p-4 text-center space-y-2">
                <p className="text-xs text-slate-400">No matching models found.</p>
                {allowCustom && search.trim() && (
                  <button
                    type="button"
                    onClick={handleCustomSubmit}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#10b981]/20 text-[#10b981] hover:bg-[#10b981]/30 border border-[#10b981]/40 text-xs font-semibold transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Use custom ID: &quot;{search.trim()}&quot;</span>
                  </button>
                )}
              </div>
            ) : (
              filteredModels.map((m) => {
                const isSelected = m.id === value;
                return (
                  <button
                    type="button"
                    key={m.id}
                    onMouseDown={(e) => {
                      // Commit on mousedown: the document-level click-outside
                      // listener also runs on mousedown, and across the Shadow
                      // DOM boundary it may close the menu before a 'click'
                      // ever fires. stopPropagation keeps this selection from
                      // also being seen as an outside-click by host handlers.
                      e.stopPropagation();
                      handleSelect(m.id);
                    }}
                    className={`w-full text-left p-2 rounded-xl transition-all flex items-center justify-between gap-3 group ${
                      isSelected
                        ? 'bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30'
                        : 'hover:bg-slate-800/60 text-slate-300 hover:text-white'
                    }`}
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 group-hover:text-slate-300">
                          {m.providerName}
                        </span>
                        <span className="font-semibold text-xs text-slate-100 group-hover:text-emerald-300 truncate">
                          {m.name}
                        </span>
                        {m.category && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-950/60 text-cyan-400 border border-cyan-800/40">
                            {m.category}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] font-mono text-slate-500 truncate group-hover:text-slate-400">
                        {m.rawId}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {m.contextWindow && (
                        <span className="text-[10px] font-mono text-slate-500">
                          {Math.round(m.contextWindow / 1024)}k ctx
                        </span>
                      )}
                      {isSelected && <Check className="w-4 h-4 text-[#10b981]" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer summary & quick custom add */}
          <div className="p-2 border-t border-slate-800 bg-slate-900/60 text-[10px] text-slate-400 flex items-center justify-between">
            <span>
              Showing {filteredModels.length} of {allModels.length} models
            </span>
            {allowCustom && search.trim() && !filteredModels.some((m) => m.id === search.trim()) && (
              <button
                type="button"
                onClick={handleCustomSubmit}
                className="text-[#10b981] hover:underline flex items-center gap-1 font-medium"
              >
                <Plus className="w-3 h-3" /> Set &quot;{search.trim().slice(0, 15)}...&quot;
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
