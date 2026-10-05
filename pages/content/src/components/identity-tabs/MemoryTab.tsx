import React, { useState } from 'react';
import { Brain, Plus, Trash2, Search, Tag, Copy, Check } from 'lucide-react';
import { MemoryItem } from '../../types/identity';
import { generateId } from '../../lib/identity-storage';

interface MemoryTabProps {
  memory: MemoryItem[];
  onUpdate: (memory: MemoryItem[]) => void;
}

export const MemoryTab: React.FC<MemoryTabProps> = ({ memory, onUpdate }) => {
  const [search, setSearch] = useState('');
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newCategory, setNewCategory] = useState('general');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleAdd = () => {
    if (!newKey || !newValue) return;
    const item: MemoryItem = {
      id: generateId(),
      key: newKey.toLowerCase().replace(/\s+/g, '_'),
      value: newValue,
      category: newCategory || 'general',
      updatedAt: new Date().toISOString()
    };
    onUpdate([item, ...memory]);
    setNewKey('');
    setNewValue('');
  };

  const handleDelete = (id: string) => {
    onUpdate(memory.filter(i => i.id !== id));
  };

  const handleCopy = (id: string, val: string) => {
    navigator.clipboard.writeText(val);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filtered = memory.filter(i =>
    i.key.toLowerCase().includes(search.toLowerCase()) ||
    i.value.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5 pb-16 md:pb-6">
      <div>
        <h2 className="text-xl font-extrabold text-[#10b981] flex items-center gap-2">
          <Brain className="w-5 h-5" /> Memory Store
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">Key-value context memory for AI interactions</p>
      </div>

      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-lg">
        <h3 className="font-bold text-xs text-slate-200 uppercase tracking-wider">Add Memory</h3>
        <div className="grid grid-cols-1 grid-cols-1 gap-2">
          <input type="text" placeholder="Key (e.g. preferred_framework)" value={newKey}
            onChange={e => setNewKey(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-[#10b981] min-h-[44px]" />
          <input type="text" placeholder="Category (preferences, stack)" value={newCategory}
            onChange={e => setNewCategory(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-[#10b981] min-h-[44px]" />
          <button onClick={handleAdd} disabled={!newKey || !newValue}
            className="bg-[#10b981]/20 hover:bg-[#10b981]/30 text-[#10b981] border border-[#10b981]/40 font-bold rounded-xl text-xs min-h-[44px] flex items-center justify-center gap-1.5 transition-all disabled:opacity-50">
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
        <textarea placeholder="Memory value / instruction content..." value={newValue}
          onChange={e => setNewValue(e.target.value)} rows={2}
          className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-[#10b981]" />
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
        <input type="text" placeholder="Search memory..." value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-200 focus:outline-none focus:border-[#10b981] min-h-[44px]" />
      </div>

      <div className="grid grid-cols-1 grid-cols-1 gap-4">
        {filtered.map(item => (
          <div key={item.id} className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-2 shadow-md hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-xs text-[#10b981] truncate">{item.key}</span>
              <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-mono uppercase">
                {item.category}
              </span>
            </div>
            <p className="text-xs text-slate-300 bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 leading-relaxed">
              {item.value}
            </p>
            <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
              <span className="text-[10px] text-slate-500 font-mono">
                {new Date(item.updatedAt).toLocaleDateString()}
              </span>
              <div className="flex items-center gap-1">
                <button onClick={() => handleCopy(item.id, item.value)}
                  className="p-2 text-slate-400 hover:text-white rounded-lg min-h-[38px] min-w-[38px] flex items-center justify-center">
                  {copiedId === item.id ? <Check className="w-4 h-4 text-[#10b981]" /> : <Copy className="w-4 h-4" />}
                </button>
                <button onClick={() => handleDelete(item.id)}
                  className="p-2 text-slate-400 hover:text-red-400 rounded-lg min-h-[38px] min-w-[38px] flex items-center justify-center">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};