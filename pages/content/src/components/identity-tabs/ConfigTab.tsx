import React, { useState } from 'react';
import { Sliders, Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { Profile, AppState } from '../../types/identity';
import { generateId } from '../../lib/identity-storage';

interface ConfigTabProps {
  profiles: Profile[];
  activeProfileId: string;
  onUpdate: (profiles: Profile[], activeId: string) => void;
  appState?: AppState;
}

export const ConfigTab: React.FC<ConfigTabProps> = ({ profiles, activeProfileId, onUpdate, appState }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const handleActivate = (id: string) => {
    onUpdate(profiles, id);
  };

  const handleDelete = (id: string) => {
    if (profiles.length <= 1) {
      alert('Cannot delete the last profile.');
      return;
    }
    if (window.confirm('Delete this profile?')) {
      const newProfiles = profiles.filter(p => p.id !== id);
      const newActive = newProfiles[0]?.id || '';
      onUpdate(newProfiles, newActive);
    }
  };

  const handleAdd = () => {
    if (!newName.trim()) return;
    const newProfile: Profile = {
      id: generateId(),
      name: newName.trim(),
      description: newDesc.trim() || undefined,
      settings: {
        theme: 'system',
        syncIntervalSeconds: 10,
        autoInject: true,
        defaultModel: 'openai/gpt-4o-mini',
        temperature: 0.7
      },
      enabledTools: [],
      customInstructions: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    onUpdate([...profiles, newProfile], newProfile.id);
    setShowNew(false);
    setNewName('');
    setNewDesc('');
  };

  const handleEdit = (id: string) => {
    const profile = profiles.find(p => p.id === id);
    if (!profile) return;
    setEditingId(id);
    setEditName(profile.name);
    setEditDesc(profile.description || '');
  };

  const handleSaveEdit = (id: string) => {
    if (!editName.trim()) return;
    const updated = profiles.map(p => {
      if (p.id === id) {
        return { ...p, name: editName.trim(), description: editDesc.trim() || undefined, updatedAt: new Date().toISOString() };
      }
      return p;
    });
    onUpdate(updated, activeProfileId);
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  return (
    <div className="space-y-6 pb-16 md:pb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sliders className="w-5 h-5 text-[#10b981]" />
          <h2 className="text-xl font-bold text-[#10b981]">Profiles</h2>
        </div>
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#10b981]/20 text-[#10b981] hover:bg-[#10b981]/30 rounded-lg text-sm border border-[#10b981]/50 transition-colors min-h-[44px]">
          <Plus className="w-4 h-4" /> New Profile
        </button>
      </div>

      {showNew && (
        <div className="bg-slate-900 border border-[#10b981]/40 rounded-2xl p-4 space-y-3 animate-in fade-in duration-200">
          <h3 className="font-bold text-sm text-slate-200">New Profile</h3>
          <input type="text" placeholder="Profile name" value={newName}
            onChange={e => setNewName(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-sm text-slate-200 focus:outline-none focus:border-[#10b981] min-h-[44px]" />
          <input type="text" placeholder="Description (optional)" value={newDesc}
            onChange={e => setNewDesc(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-sm text-slate-200 focus:outline-none focus:border-[#10b981] min-h-[44px]" />
          <div className="flex items-center gap-2">
            <button onClick={handleAdd}
              className="px-4 py-2 bg-[#10b981]/20 text-[#10b981] hover:bg-[#10b981]/30 rounded-xl text-xs font-bold border border-[#10b981]/40 min-h-[44px]">
              <Save className="w-4 h-4 inline mr-1" /> Create
            </button>
            <button onClick={() => { setShowNew(false); setNewName(''); setNewDesc(''); }}
              className="px-4 py-2 bg-slate-800 text-slate-400 hover:text-slate-200 rounded-xl text-xs min-h-[44px]">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {profiles.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center text-xs text-slate-500">
            No profiles. Create one to get started.
          </div>
        ) : (
          profiles.map(profile => {
            const isActive = profile.id === activeProfileId;
            const isEditing = editingId === profile.id;

            return (
              <div key={profile.id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border transition-colors ${isActive ? 'bg-[#10b981]/5 border-[#10b981]/50' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`}>
                {isEditing ? (
                  <div className="flex-1 space-y-3">
                    <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-sm text-slate-200 focus:outline-none focus:border-[#10b981] min-h-[44px]" />
                    <input type="text" value={editDesc} onChange={e => setEditDesc(e.target.value)}
                      placeholder="Description"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-sm text-slate-200 focus:outline-none focus:border-[#10b981] min-h-[44px]" />
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleSaveEdit(profile.id)}
                        className="px-4 py-2 bg-[#10b981]/20 text-[#10b981] rounded-xl text-xs font-bold border border-[#10b981]/40 min-h-[40px]">
                        <Save className="w-4 h-4 inline mr-1" /> Save
                      </button>
                      <button onClick={handleCancelEdit}
                        className="px-4 py-2 bg-slate-800 text-slate-400 hover:text-slate-200 rounded-xl text-xs min-h-[40px]">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1 flex-wrap">
                        <h3 className="font-bold text-slate-200">{profile.name}</h3>
                        {isActive && (
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-[#10b981]/20 text-[#10b981]">Active</span>
                        )}
                        {profile.description && (
                          <span className="text-xs text-slate-400">{profile.description}</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-slate-400">
                        <span>Model: {profile.settings.defaultModel || 'default'}</span>
                        <span>Theme: {profile.settings.theme}</span>
                        <span>Tools: {profile.enabledTools.length}</span>
                        <span>Updated: {new Date(profile.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-3 sm:pt-0 border-t sm:border-0 border-slate-800">
                      {!isActive && (
                        <button onClick={() => handleActivate(profile.id)}
                          className="px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors min-h-[38px]">
                          Activate
                        </button>
                      )}
                      <button onClick={() => handleEdit(profile.id)}
                        className="p-1.5 text-slate-400 hover:text-blue-400 rounded-lg transition-colors min-h-[38px] min-w-[38px]">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(profile.id)}
                        className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg transition-colors min-h-[38px] min-w-[38px]">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};