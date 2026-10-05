import React, { useState, useEffect } from 'react';
import {
  Plus, Edit2, Trash2, Star, Sparkles, Copy, Send,
  Check, Tag, Search, GripVertical, Lock, Unlock, X,
  ChevronDown, ChevronUp
} from 'lucide-react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  TouchSensor, useSensor, useSensors, DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  rectSortingStrategy, useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Prompt, defaultPrompts } from '../../types/identity';
import { enhancePrompt } from '../../lib/identity-api';
import { getUiLocked, setUiLocked, generateId } from '../../lib/identity-storage';
import { EnhanceWithAiButton } from './EnhanceWithAiButton';

interface PromptsTabProps {
  prompts: Prompt[];
  onUpdate: (prompts: Prompt[]) => void;
}

// Sortable prompt card component
const SortablePromptCard: React.FC<{
  prompt: Prompt;
  isUiLocked: boolean;
  editingId: string | null;
  editTitle: string;
  setEditTitle: (v: string) => void;
  editContent: string;
  setEditContent: (v: string) => void;
  editTags: string;
  setEditTags: (v: string) => void;
  isEnhancing: boolean;
  copiedId: string | null;
  injectedId: string | null;
  onToggleFavorite: (id: string) => void;
  onStartEdit: (p: Prompt) => void;
  onCancelEdit: () => void;
  onSave: () => void;
  onDelete: (id: string) => void;
  onCopy: (id: string, content: string) => void;
  onInject: (id: string, content: string) => void;
  onEnhance: () => void;
  onUnlockRequest: () => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}> = ({
  prompt, isUiLocked, editingId, editTitle, setEditTitle,
  editContent, setEditContent, editTags, setEditTags,
  isEnhancing, copiedId, injectedId,
  onToggleFavorite, onStartEdit, onCancelEdit, onSave,
  onDelete, onCopy, onInject, onEnhance, onUnlockRequest,
  isExpanded, onToggleExpand
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: prompt.id, disabled: isUiLocked });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 'auto',
  };

  const isEditing = editingId === prompt.id;

  return (
    <div ref={setNodeRef} style={style}
      className={`bg-slate-900/90 border rounded-2xl p-4 transition-all flex flex-col ${
        isDragging ? 'border-[#10b981] shadow-[0_0_25px_rgba(16,185,129,0.3)] ring-2 ring-[#10b981]/50 scale-[1.02]' :
        'border-slate-800 hover:border-slate-700/90'
      }`}>
      {isEditing ? (
        <div className="space-y-3">
          <div className="text-xs font-bold text-[#10b981]">Edit Prompt</div>
          <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)}
            placeholder="Prompt Title"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-200 focus:border-[#10b981] focus:outline-none min-h-[44px]" />
          <textarea value={editContent} onChange={e => setEditContent(e.target.value)}
            placeholder="Prompt Content" rows={6}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-200 focus:border-[#10b981] focus:outline-none font-mono" />
          <div>
            <label className="text-[11px] text-slate-400 mb-1 block">Tags (comma separated)</label>
            <input type="text" value={editTags} onChange={e => setEditTags(e.target.value)}
              placeholder="e.g. coding, refactor, swarm"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-200 focus:border-[#10b981] focus:outline-none min-h-[44px]" />
          </div>
          <div className="flex items-center gap-2 justify-end pt-2">
            <EnhanceWithAiButton
              type="prompt"
              currentText={editContent}
              onEnhanced={setEditContent}
              contextTitle={editTitle}
              size="sm"
            />
            <button onClick={onCancelEdit} className="px-3 py-2 text-slate-400 hover:text-slate-200 text-xs min-h-[40px]">Cancel</button>
            <button onClick={onSave}
              className="px-4 py-2 bg-[#10b981]/20 text-[#10b981] rounded-xl hover:bg-[#10b981]/30 text-xs font-bold border border-[#10b981]/50 min-h-[40px]">Save</button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col h-full justify-between space-y-3">
          <div>
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                {isUiLocked ? (
                  <button onClick={onUnlockRequest}
                    className="p-1.5 text-amber-400 hover:bg-amber-500/10 rounded-lg min-h-[38px] min-w-[28px] flex items-center justify-center shrink-0"
                    title="UI locked. Click to unlock.">
                    <Lock className="w-4 h-4 text-amber-400" />
                  </button>
                ) : (
                  <button {...attributes} {...listeners}
                    className="p-1.5 text-slate-500 hover:text-[#10b981] cursor-grab active:cursor-grabbing rounded-lg hover:bg-slate-800/80 transition-colors touch-none min-h-[38px] min-w-[28px] flex items-center justify-center shrink-0"
                    title="Drag to reorder">
                    <GripVertical className="w-4 h-4" />
                  </button>
                )}
                <h3 className="font-bold text-sm text-slate-100 truncate">{prompt.title}</h3>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => onToggleFavorite(prompt.id)}
                  className={`p-2 rounded-lg transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center ${
                    prompt.isFavorite ? 'text-yellow-400 bg-yellow-400/10' : 'text-slate-500 hover:text-yellow-400'
                  }`}>
                  <Star className="w-4 h-4" fill={prompt.isFavorite ? 'currentColor' : 'none'} />
                </button>
                <button onClick={() => onStartEdit(prompt)}
                  className="p-2 text-slate-400 hover:text-cyan-400 rounded-lg min-h-[38px] min-w-[38px] flex items-center justify-center transition-colors">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => onDelete(prompt.id)}
                  className="p-2 text-slate-400 hover:text-red-400 rounded-lg min-h-[38px] min-w-[38px] flex items-center justify-center transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            {/* Truncated snippet when collapsed, full scrollable view when expanded */}
            {isExpanded ? (
              <div className="space-y-2 mb-3">
                <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-xs text-slate-200 font-mono whitespace-pre-wrap max-h-64 overflow-y-auto select-text leading-relaxed">
                  {prompt.content}
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono px-1">
                  <span>{prompt.content.length} characters</span>
                  <span>{prompt.content.trim().split(/\s+/).filter(Boolean).length} words</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-300 whitespace-pre-wrap line-clamp-2 leading-relaxed font-sans bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/80 mb-2.5 select-text">
                {prompt.content}
              </p>
            )}

            {prompt.tags && prompt.tags.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap mb-3">
                {(isExpanded ? prompt.tags : prompt.tags.slice(0, 3)).map(t => (
                  <span key={t} className="text-[10px] bg-slate-800/80 text-slate-300 px-2 py-0.5 rounded-full font-mono">#{t}</span>
                ))}
                {!isExpanded && prompt.tags.length > 3 && (
                  <span className="text-[10px] text-slate-500 font-mono">+{prompt.tags.length - 3}</span>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
            <button
              onClick={onToggleExpand}
              className="flex items-center justify-center gap-1 px-3 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all min-h-[44px]"
              title={isExpanded ? 'Collapse prompt details' : 'Expand full prompt details'}
            >
              <span>{isExpanded ? 'Less' : 'Details'}</span>
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-[#10b981]" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
            </button>

            <button onClick={() => onCopy(prompt.id, prompt.content)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all min-h-[44px] active:scale-95 ${
                copiedId === prompt.id ? 'bg-[#10b981]/20 border-[#10b981] text-[#10b981]' :
                'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
              }`}>
              {copiedId === prompt.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedId === prompt.id ? 'Copied!' : 'Copy'}</span>
            </button>
            <button onClick={() => onInject(prompt.id, prompt.content)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-extrabold border transition-all min-h-[44px] active:scale-95 ${
                injectedId === prompt.id ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300' :
                'bg-gradient-to-r from-[#10b981]/20 to-teal-500/20 hover:from-[#10b981]/30 text-[#10b981] border border-[#10b981]/40'
              }`}
              title="Inject prompt into active browser input">
              {injectedId === prompt.id ? <Check className="w-4 h-4" /> : <Send className="w-4 h-4" />}
              <span>{injectedId === prompt.id ? 'Injected!' : 'Inject'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const PromptsTab: React.FC<PromptsTabProps> = ({ prompts, onUpdate }) => {
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editTags, setEditTags] = useState('');
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [injectedId, setInjectedId] = useState<string | null>(null);
  const [isUiLocked, setIsUiLocked] = useState<boolean>(getUiLocked());
  const [expandedPromptIds, setExpandedPromptIds] = useState<Set<string>>(new Set());

  const togglePromptExpand = (id: string) => {
    setExpandedPromptIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAllPrompts = () => {
    setExpandedPromptIds(new Set(prompts.map((p) => p.id)));
  };

  const collapseAllPrompts = () => {
    setExpandedPromptIds(new Set());
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const allTags = Array.from(new Set(prompts.flatMap(p => p.tags || [])));

  const filtered = prompts.filter(p => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      p.title.toLowerCase().includes(q) ||
      p.content.toLowerCase().includes(q) ||
      p.tags?.some(t => t.toLowerCase().includes(q));
    if (!matchesSearch) return false;
    if (selectedTag === 'favorites') return p.isFavorite;
    if (selectedTag !== 'all') return p.tags?.includes(selectedTag);
    return true;
  });

  const handleDragEnd = (event: DragEndEvent) => {
    if (isUiLocked) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = prompts.findIndex(p => p.id === active.id);
    const newIndex = prompts.findIndex(p => p.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      onUpdate(arrayMove(prompts, oldIndex, newIndex));
    }
  };

  const handleAdd = () => {
    const newPrompt: Prompt = {
      id: generateId(),
      title: 'New Automation Prompt',
      content: 'Enter prompt instructions for AI models or web extension automation...',
      tags: ['general'],
      updatedAt: new Date().toISOString(),
      isFavorite: false
    };
    onUpdate([newPrompt, ...prompts]);
    setEditingId(newPrompt.id);
    setEditTitle(newPrompt.title);
    setEditContent(newPrompt.content);
    setEditTags('general');
  };

  const handleSave = () => {
    if (!editingId) return;
    const parsedTags = editTags.split(',').map(t => t.trim()).filter(Boolean);
    const updated = prompts.map(p => {
      if (p.id === editingId) {
        return { ...p, title: editTitle, content: editContent, tags: parsedTags, updatedAt: new Date().toISOString() };
      }
      return p;
    });
    onUpdate(updated);
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Delete this prompt?')) {
      onUpdate(prompts.filter(p => p.id !== id));
    }
  };

  const handleToggleFavorite = (id: string) => {
    onUpdate(prompts.map(p => p.id === id ? { ...p, isFavorite: !p.isFavorite } : p));
  };

  const handleCopy = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleInject = (id: string, content: string) => {
    // Try to inject into active browser input
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, { action: 'PASTE_TEXT', text: content });
        }
      });
    }
    setInjectedId(id);
    setTimeout(() => setInjectedId(null), 2500);
  };

  const handleEnhance = async () => {
    if (!editContent) return;
    setIsEnhancing(true);
    try {
      const result = await enhancePrompt(editContent);
      if (result) setEditContent(result);
    } catch (e) {
      console.error('Enhance failed:', e);
    } finally {
      setIsEnhancing(false);
    }
  };

  const toggleLock = () => {
    const newLock = !isUiLocked;
    setIsUiLocked(newLock);
    setUiLocked(newLock);
  };

  const handleLoadDefaults = () => {
    const existingIds = new Set(prompts.map(p => p.id));
    const toAdd = defaultPrompts.filter(p => !existingIds.has(p.id));
    if (toAdd.length > 0) {
      onUpdate([...prompts, ...toAdd]);
    } else {
      onUpdate([...defaultPrompts]);
    }
  };

  return (
    <div className="space-y-5 pb-16 md:pb-6">
      <div className="flex flex-col flex-col items-start items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-[#10b981] flex items-center gap-2">
            <Sparkles className="w-5 h-5" /> Prompt Library
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
            <span>Store, enhance, and 1-tap inject prompts.</span>
            {isUiLocked ? (
              <span className="text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/30 font-mono text-[11px] inline-flex items-center gap-1 font-semibold">
                <Lock className="w-3 h-3" /> Locked
              </span>
            ) : (
              <span className="text-[#10b981] font-medium inline-flex items-center gap-1">
                <GripVertical className="w-3 h-3" /> Drag to reorder
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 w-full w-full">
          <button onClick={handleLoadDefaults}
            title="Load or restore built-in Alsania prompt presets"
            className="flex-1  flex items-center justify-center gap-2 px-3.5 py-2.5 bg-slate-800 text-slate-300 hover:text-emerald-400 hover:bg-slate-700 rounded-xl border border-slate-700 transition-all font-bold text-xs min-h-[44px] active:scale-95">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Starter Presets</span>
          </button>
          <button onClick={toggleLock}
            className={`flex-1  flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[44px] active:scale-95 border ${
              isUiLocked ? 'bg-amber-500/15 text-amber-300 border-amber-500/40' :
              'bg-slate-800 text-slate-300 hover:bg-slate-700 border-slate-700'
            }`}>
            {isUiLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
            <span>{isUiLocked ? 'Locked' : 'Unlocked'}</span>
          </button>
          <button
            onClick={() => {
              if (expandedPromptIds.size > 0) collapseAllPrompts();
              else expandAllPrompts();
            }}
            title={expandedPromptIds.size > 0 ? "Collapse all prompt details" : "Expand all prompt details"}
            className="flex-1  flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-800 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-all font-bold text-xs min-h-[44px] active:scale-95"
          >
            {expandedPromptIds.size > 0 ? (
              <>
                <ChevronUp className="w-4 h-4 text-[#10b981]" />
                <span>Collapse</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 text-slate-400" />
                <span>Expand</span>
              </>
            )}
          </button>
          <button onClick={handleAdd}
            className="flex-1  flex items-center justify-center gap-2 px-4 py-2.5 bg-[#10b981]/20 text-[#10b981] hover:bg-[#10b981]/30 rounded-xl border border-[#10b981]/50 transition-all font-bold text-xs min-h-[44px] active:scale-95">
            <Plus className="w-4 h-4" /> New
          </button>
        </div>
      </div>

      <div className="space-y-2.5">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search prompts by title, content, or #tag..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl py-2.5 pl-10 pr-28 text-xs text-slate-200 focus:outline-none focus:border-[#10b981] min-h-[44px]"
          />
          <div className="absolute right-3 top-2.5 flex items-center gap-1.5">
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            {search && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                {filtered.length} found
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap pb-1.5 scrollbar-none">
          <button onClick={() => setSelectedTag('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap min-h-[36px] transition-all ${
              selectedTag === 'all' ? 'bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/50 font-bold' :
              'bg-slate-900 border border-slate-800 text-slate-400'
            }`}>All ({prompts.length})</button>
          <button onClick={() => setSelectedTag('favorites')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap min-h-[36px] transition-all flex items-center gap-1 ${
              selectedTag === 'favorites' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/50 font-bold' :
              'bg-slate-900 border border-slate-800 text-slate-400'
            }`}>
            <Star className="w-3.5 h-3.5 fill-current text-yellow-400" /> Favorites
          </button>
          {allTags.map(tag => (
            <button key={tag} onClick={() => setSelectedTag(tag)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap min-h-[36px] transition-all capitalize flex items-center gap-1 ${
                selectedTag === tag ? 'bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/50 font-bold' :
                'bg-slate-900 border border-slate-800 text-slate-400'
              }`}>
              <Tag className="w-3 h-3" /> {tag}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
          <p className="text-sm text-slate-400">No prompts found.</p>
          <div className="flex items-center justify-center gap-3">
            <button onClick={() => { setSearch(''); setSelectedTag('all'); }}
              className="text-xs text-[#10b981] hover:underline">Reset Filters</button>
            <button onClick={handleLoadDefaults}
              className="px-3 py-1.5 rounded-xl bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/40 text-xs font-semibold hover:bg-[#10b981]/30 transition-all flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Load Starter Prompts
            </button>
          </div>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={filtered.map(p => p.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 grid-cols-1 gap-4">
              {filtered.map(prompt => (
                <SortablePromptCard key={prompt.id}
                  prompt={prompt} isUiLocked={isUiLocked}
                  editingId={editingId} editTitle={editTitle} setEditTitle={setEditTitle}
                  editContent={editContent} setEditContent={setEditContent}
                  editTags={editTags} setEditTags={setEditTags}
                  isEnhancing={isEnhancing} copiedId={copiedId} injectedId={injectedId}
                  onToggleFavorite={handleToggleFavorite}
                  onStartEdit={(p) => { setEditingId(p.id); setEditTitle(p.title); setEditContent(p.content); setEditTags(p.tags?.join(', ') || ''); }}
                  onCancelEdit={() => setEditingId(null)} onSave={handleSave}
                  onDelete={handleDelete} onCopy={handleCopy} onInject={handleInject}
                  onEnhance={handleEnhance} onUnlockRequest={() => setIsUiLocked(false)}
                  isExpanded={expandedPromptIds.has(prompt.id)}
                  onToggleExpand={() => togglePromptExpand(prompt.id)} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
};