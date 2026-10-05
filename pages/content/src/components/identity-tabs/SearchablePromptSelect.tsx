import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, Sparkles, X, Check, Star, Tag, ChevronDown, BookOpen } from 'lucide-react';
import { Prompt } from '../../types/identity';

export interface SearchablePromptSelectProps {
  prompts: Prompt[];
  onSelectPrompt: (content: string, title: string) => void;
  triggerLabel?: string;
  buttonClassName?: string;
  compact?: boolean;
}

export const SearchablePromptSelect: React.FC<SearchablePromptSelectProps> = ({
  prompts = [],
  onSelectPrompt,
  triggerLabel = 'Library Prompts',
  buttonClassName = '',
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Extract all tags across prompts
  const allTags = useMemo(() => {
    const set = new Set<string>();
    prompts.forEach((p) => {
      p.tags?.forEach((t) => set.add(t));
    });
    return Array.from(set).sort();
  }, [prompts]);

  // Filtered prompts
  const filteredPrompts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return prompts.filter((p) => {
      // Tag filter
      if (selectedTag === 'favorites' && !p.isFavorite) return false;
      if (selectedTag !== 'all' && selectedTag !== 'favorites') {
        if (!p.tags?.includes(selectedTag)) return false;
      }
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        p.content.toLowerCase().includes(q) ||
        p.tags?.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [prompts, search, selectedTag]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
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
      setSelectedTag('all');
    }
  }, [isOpen]);

  const handleSelect = (prompt: Prompt) => {
    onSelectPrompt(prompt.content, prompt.title);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 transition-all text-xs font-semibold rounded-xl ${
          buttonClassName ||
          'px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600'
        } ${isOpen ? 'ring-1 ring-[#10b981] border-[#10b981]' : ''}`}
        title="Select and insert a prompt template from library"
      >
        <BookOpen className="w-3.5 h-3.5 text-[#10b981]" />
        {!compact && <span>{triggerLabel}</span>}
        <ChevronDown
          className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[#10b981]' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 sm:left-auto top-full mt-2 z-50 w-80 sm:w-96 bg-[#0b1120] border border-slate-700/90 rounded-2xl shadow-[0_10px_35px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[420px] animate-in fade-in duration-150">
          {/* Header */}
          <div className="p-3 border-b border-slate-800 bg-slate-900/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#10b981]" /> Select from Prompt Library
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {filteredPrompts.length} found
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search prompts by title, content, tag..."
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

            {/* Tag Pills */}
            <div className="flex items-center gap-1.5 flex-wrap pb-1 scrollbar-none text-[10px]">
              <button
                type="button"
                onClick={() => setSelectedTag('all')}
                className={`px-2 py-0.5 rounded-lg whitespace-nowrap transition-colors ${
                  selectedTag === 'all'
                    ? 'bg-[#10b981]/20 text-[#10b981] font-bold border border-[#10b981]/40'
                    : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                }`}
              >
                All ({prompts.length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedTag('favorites')}
                className={`px-2 py-0.5 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1 ${
                  selectedTag === 'favorites'
                    ? 'bg-yellow-500/20 text-yellow-300 font-bold border border-yellow-500/40'
                    : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Star className="w-3 h-3 text-yellow-400 fill-current" /> Favorites
              </button>
              {allTags.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSelectedTag(t)}
                  className={`px-2 py-0.5 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1 ${
                    selectedTag === t
                      ? 'bg-[#10b981]/20 text-[#10b981] font-bold border border-[#10b981]/40'
                      : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Tag className="w-2.5 h-2.5" /> {t}
                </button>
              ))}
            </div>
          </div>

          {/* Prompts list */}
          <div className="overflow-y-auto flex-1 p-2 space-y-1.5 divide-y divide-slate-800/30">
            {filteredPrompts.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                {prompts.length === 0
                  ? 'No prompts saved yet in Library. Go to Prompts tab to create one.'
                  : 'No prompts match your search query.'}
              </div>
            ) : (
              filteredPrompts.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelect(p)}
                  className="w-full text-left p-2.5 rounded-xl hover:bg-slate-800/70 border border-transparent hover:border-slate-700/80 transition-all group space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {p.isFavorite && (
                        <Star className="w-3 h-3 text-yellow-400 fill-current shrink-0" />
                      )}
                      <span className="font-semibold text-xs text-slate-100 group-hover:text-emerald-300 truncate">
                        {p.title}
                      </span>
                    </div>
                    {p.tags && p.tags.length > 0 && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono shrink-0">
                        #{p.tags[0]}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {p.content}
                  </p>
                </button>
              ))
            )}
          </div>

          {/* Footer note */}
          <div className="p-2 border-t border-slate-800 bg-slate-900/60 text-[10px] text-slate-400 flex items-center justify-between">
            <span>Click any prompt to insert</span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
