import React, { useState, useMemo } from 'react';
import { 
  Zap, 
  Search, 
  Plus, 
  Copy, 
  Trash2, 
  Edit3, 
  Check, 
  Download, 
  Upload, 
  ChevronDown, 
  ChevronUp, 
  Code2, 
  Wrench, 
  Play, 
  ShieldCheck, 
  Brain, 
  Cpu, 
  Terminal, 
  RotateCcw,
  Sparkles,
  ExternalLink,
  Tag
} from 'lucide-react';
import { AgentSkill, defaultSkills } from '../../types/identity';
import { toast } from './Toast';
import { EnhanceWithAiButton } from './EnhanceWithAiButton';

interface SkillsTabProps {
  skills: AgentSkill[];
  onUpdate: (skills: AgentSkill[]) => void;
  availableTools?: Array<{ name: string; description?: string }>;
}

type CategoryType = 'all' | 'sovereignty' | 'memory' | 'web3' | 'automation' | 'analysis' | 'custom';
type StatusFilter = 'all' | 'enabled' | 'disabled';

export const SkillsTab: React.FC<SkillsTabProps> = ({
  skills,
  onUpdate,
  availableTools = []
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [expandedSkillIds, setExpandedSkillIds] = useState<Set<string>>(new Set());

  const toggleSkillExpand = (id: string) => {
    setExpandedSkillIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAllSkills = () => {
    setExpandedSkillIds(new Set(filteredSkills.map((s) => s.id)));
  };

  const collapseAllSkills = () => {
    setExpandedSkillIds(new Set());
  };

  const [editingSkill, setEditingSkill] = useState<AgentSkill | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [testQuery, setTestQuery] = useState('');
  const [activeTestSkillId, setActiveTestSkillId] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');

  // Form State for Create / Edit
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    category: AgentSkill['category'];
    version: string;
    author: string;
    triggers: string;
    requiredTools: string;
    instructions: string;
    enabled: boolean;
  }>({
    name: '',
    description: '',
    category: 'custom',
    version: '1.0.0',
    author: 'Sigma & Echo',
    triggers: '',
    requiredTools: '',
    instructions: '',
    enabled: true
  });

  const categories: Array<{ id: CategoryType; label: string; icon: React.ReactNode }> = [
    { id: 'all', label: 'All Categories', icon: <Sparkles className="w-3 h-3" /> },
    { id: 'sovereignty', label: 'Sovereignty', icon: <ShieldCheck className="w-3 h-3 text-emerald-400" /> },
    { id: 'memory', label: 'Memory (EME)', icon: <Brain className="w-3 h-3 text-purple-400" /> },
    { id: 'web3', label: 'Web3 & AED', icon: <Terminal className="w-3 h-3 text-amber-400" /> },
    { id: 'automation', label: 'Automation', icon: <Zap className="w-3 h-3 text-cyan-400" /> },
    { id: 'analysis', label: 'Analysis', icon: <Cpu className="w-3 h-3 text-blue-400" /> },
    { id: 'custom', label: 'Custom', icon: <Code2 className="w-3 h-3 text-slate-400" /> }
  ];

  const filteredSkills = useMemo(() => {
    return skills.filter(skill => {
      // Category filter
      if (selectedCategory !== 'all' && skill.category !== selectedCategory) {
        return false;
      }
      // Status filter
      if (statusFilter === 'enabled' && !skill.enabled) return false;
      if (statusFilter === 'disabled' && skill.enabled) return false;

      // Text search
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const inName = skill.name.toLowerCase().includes(q);
      const inDesc = skill.description.toLowerCase().includes(q);
      const inTriggers = skill.triggers.some(t => t.toLowerCase().includes(q));
      const inTools = (skill.requiredTools || []).some(t => t.toLowerCase().includes(q));
      const inAuthor = (skill.author || '').toLowerCase().includes(q);
      return inName || inDesc || inTriggers || inTools || inAuthor;
    });
  }, [skills, selectedCategory, statusFilter, search]);

  const enabledCount = useMemo(() => skills.filter(s => s.enabled).length, [skills]);

  const handleToggleEnable = (skill: AgentSkill) => {
    const updated = skills.map(s => {
      if (s.id === skill.id) {
        return { ...s, enabled: !s.enabled, updatedAt: new Date().toISOString() };
      }
      return s;
    });
    onUpdate(updated);
    if (!skill.enabled) {
      toast.success('Skill Activated', `${skill.name} is now enabled for prompt injection`);
    } else {
      toast.info('Skill Deactivated', `${skill.name} has been paused`);
    }
  };

  const handleDelete = (id: string, name: string) => {
    const updated = skills.filter(s => s.id !== id);
    onUpdate(updated);
    toast.info('Skill Removed', `Deleted skill "${name}"`);
  };

  const handleDuplicate = (skill: AgentSkill) => {
    const newSkill: AgentSkill = {
      ...skill,
      id: `skill-${Date.now()}`,
      name: `${skill.name} (Copy)`,
      enabled: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    onUpdate([newSkill, ...skills]);
    toast.success('Skill Duplicated', `Created copy: ${newSkill.name}`);
  };

  const handleStartCreate = () => {
    setEditingSkill(null);
    setFormData({
      name: '',
      description: '',
      category: 'custom',
      version: '1.0.0',
      author: 'Alsania Agent',
      triggers: '',
      requiredTools: '',
      instructions: '',
      enabled: true
    });
    setIsCreating(true);
  };

  const handleStartEdit = (skill: AgentSkill) => {
    setEditingSkill(skill);
    setFormData({
      name: skill.name,
      description: skill.description,
      category: skill.category,
      version: skill.version,
      author: skill.author || '',
      triggers: skill.triggers.join(', '),
      requiredTools: (skill.requiredTools || []).join(', '),
      instructions: skill.instructions,
      enabled: skill.enabled
    });
    setIsCreating(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Validation Error', 'Skill name is required');
      return;
    }
    if (!formData.instructions.trim()) {
      toast.error('Validation Error', 'Skill instructions / system prompt are required');
      return;
    }

    const triggers = formData.triggers
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    const requiredTools = formData.requiredTools
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    if (editingSkill) {
      const updated = skills.map(s => {
        if (s.id === editingSkill.id) {
          return {
            ...s,
            name: formData.name.trim(),
            description: formData.description.trim(),
            category: formData.category,
            version: formData.version.trim() || '1.0.0',
            author: formData.author.trim() || undefined,
            triggers,
            requiredTools,
            instructions: formData.instructions.trim(),
            enabled: formData.enabled,
            updatedAt: new Date().toISOString()
          };
        }
        return s;
      });
      onUpdate(updated);
      toast.success('Skill Updated', `Saved changes to ${formData.name}`);
    } else {
      const newSkill: AgentSkill = {
        id: `skill-${Date.now()}`,
        name: formData.name.trim(),
        description: formData.description.trim(),
        category: formData.category,
        version: formData.version.trim() || '1.0.0',
        author: formData.author.trim() || undefined,
        triggers,
        requiredTools,
        instructions: formData.instructions.trim(),
        enabled: formData.enabled,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      onUpdate([newSkill, ...skills]);
      toast.success('Skill Created', `Added ${newSkill.name} to agent skill registry`);
    }

    setIsCreating(false);
    setEditingSkill(null);
  };

  const handleCopyTrigger = (trigger: string) => {
    navigator.clipboard.writeText(trigger);
    toast.success('Copied Trigger', `"${trigger}" copied to clipboard`);
  };

  const handleCopyInstructions = (skill: AgentSkill) => {
    navigator.clipboard.writeText(skill.instructions);
    setCopiedId(skill.id);
    setTimeout(() => setCopiedId(null), 1800);
    toast.success('Instructions Copied', `Copied ${skill.name} prompt instructions`);
  };

  const handleExportSkillMarkdown = (skill: AgentSkill) => {
    const md = `---
name: ${skill.name}
description: ${skill.description}
category: ${skill.category}
version: ${skill.version}
author: ${skill.author || 'Alsania Ecosystem'}
triggers:
${skill.triggers.map(t => `  - "${t}"`).join('\n')}
required_tools:
${(skill.requiredTools || []).map(t => `  - "${t}"`).join('\n')}
---

# ${skill.name}

${skill.description}

## Instructions

${skill.instructions}
`;
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${skill.id}.skill.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Export Complete', `Downloaded ${skill.id}.skill.md`);
  };

  const handleExportAllJson = () => {
    const dataStr = JSON.stringify(skills, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aegis-skills-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Skills Exported', `Exported ${skills.length} skills to JSON`);
  };

  const handleResetDefaults = () => {
    if (confirm('Reset default Alsanian sovereign skills? Custom skills with different IDs will be preserved.')) {
      const defaultIds = new Set(defaultSkills.map(s => s.id));
      const customOnes = skills.filter(s => !defaultIds.has(s.id));
      const merged = [...defaultSkills, ...customOnes];
      onUpdate(merged);
      toast.success('Defaults Restored', 'Reset Alsanian sovereign skills to base version');
    }
  };

  const handleImportJson = () => {
    try {
      const parsed = JSON.parse(importJsonText);
      if (!Array.isArray(parsed)) {
        throw new Error('Import data must be a JSON array of skills');
      }
      const validSkills: AgentSkill[] = parsed.map((item, index) => ({
        id: item.id || `imported-skill-${Date.now()}-${index}`,
        name: item.name || `Imported Skill ${index + 1}`,
        description: item.description || '',
        category: item.category || 'custom',
        version: item.version || '1.0.0',
        author: item.author || 'Imported',
        enabled: Boolean(item.enabled),
        triggers: Array.isArray(item.triggers) ? item.triggers : [],
        requiredTools: Array.isArray(item.requiredTools) ? item.requiredTools : [],
        instructions: item.instructions || item.prompt || '',
        createdAt: item.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));

      // Merge avoiding duplicate IDs
      const existingIds = new Set(skills.map(s => s.id));
      const newlyAdded = validSkills.filter(s => !existingIds.has(s.id));
      const updatedList = [...skills, ...newlyAdded];
      onUpdate(updatedList);
      setShowImportModal(false);
      setImportJsonText('');
      toast.success('Import Successful', `Imported ${newlyAdded.length} new skills`);
    } catch (e: any) {
      toast.error('Import Failed', e?.message || 'Invalid JSON format');
    }
  };

  const getCategoryColor = (category: AgentSkill['category']) => {
    switch (category) {
      case 'sovereignty':
        return 'text-emerald-400 bg-emerald-950/40 border-emerald-500/30';
      case 'memory':
        return 'text-purple-400 bg-purple-950/40 border-purple-500/30';
      case 'web3':
        return 'text-amber-400 bg-amber-950/40 border-amber-500/30';
      case 'automation':
        return 'text-cyan-400 bg-cyan-950/40 border-cyan-500/30';
      case 'analysis':
        return 'text-blue-400 bg-blue-950/40 border-blue-500/30';
      default:
        return 'text-slate-300 bg-slate-800/60 border-slate-700';
    }
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Top Header Card */}
      <div className="flex flex-col flex-col items-start justify-between gap-3 p-4 rounded-xl bg-slate-900/80 border border-slate-800 backdrop-blur-md">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Agent Skills Engine
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/30">
                  {enabledCount}/{skills.length} Active
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Modular sovereign competencies, skill instructions, trigger schemas, and tool execution bindings
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleStartCreate}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#10b981] hover:bg-[#059669] text-slate-950 text-xs font-semibold shadow-[0_0_12px_rgba(16,185,129,0.25)] transition-all min-h-[34px]"
          >
            <Plus className="w-3.5 h-3.5" />
            New Skill
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-all min-h-[34px]"
            title="Import skills from JSON"
          >
            <Upload className="w-3.5 h-3.5" />
            Import
          </button>
          <button
            onClick={handleExportAllJson}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-all min-h-[34px]"
            title="Export all skills as JSON"
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
          <button
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs border border-slate-700/60 transition-all min-h-[34px]"
            title="Reset default sovereign skills"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
          <button
            onClick={() => {
              if (expandedSkillIds.size > 0) collapseAllSkills();
              else expandAllSkills();
            }}
            title={expandedSkillIds.size > 0 ? "Collapse all skill details" : "Expand all skill details"}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-all min-h-[34px]"
          >
            {expandedSkillIds.size > 0 ? (
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
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="space-y-2.5">
        <div className="flex flex-col flex-col items-stretch items-start gap-2">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search skills by name, trigger phrase, description, or tool..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-900/90 border border-slate-700/80 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#10b981] transition-all min-h-[36px]"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs"
              >
                Clear
              </button>
            )}
          </div>

          {/* Status Segment */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-[11px]">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                statusFilter === 'all'
                  ? 'bg-slate-800 text-slate-100 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({skills.length})
            </button>
            <button
              onClick={() => setStatusFilter('enabled')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                statusFilter === 'enabled'
                  ? 'bg-[#10b981]/20 text-[#10b981] font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Active ({enabledCount})
            </button>
            <button
              onClick={() => setStatusFilter('disabled')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                statusFilter === 'disabled'
                  ? 'bg-rose-950/40 text-rose-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Paused ({skills.length - enabledCount})
            </button>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 flex-wrap scrollbar-none py-1">
          {categories.map((cat) => {
            const count = cat.id === 'all' 
              ? skills.length 
              : skills.filter(s => s.category === cat.id).length;
            const isSelected = selectedCategory === cat.id;

            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap min-h-[30px] ${
                  isSelected
                    ? 'bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/40'
                    : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800/80 hover:bg-slate-800/50'
                }`}
              >
                {cat.icon}
                <span>{cat.label}</span>
                <span className="text-[10px] opacity-60 ml-0.5">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Skills Grid */}
      {filteredSkills.length === 0 ? (
        <div className="p-8 text-center rounded-xl bg-slate-900/50 border border-slate-800 space-y-3">
          <Zap className="w-8 h-8 text-slate-600 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-300">No matching skills found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {search || selectedCategory !== 'all' || statusFilter !== 'all'
              ? 'Try adjusting your search criteria or category filter.'
              : 'Add your first modular agent skill to begin.'}
          </p>
          <button
            onClick={handleStartCreate}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/40 text-xs font-medium hover:bg-[#10b981]/30"
          >
            <Plus className="w-3.5 h-3.5" />
            Create Skill
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filteredSkills.map((skill) => {
            const isExpanded = expandedSkillIds.has(skill.id);
            const isTesting = activeTestSkillId === skill.id;

            return (
              <div
                key={skill.id}
                className={`rounded-xl border transition-all ${
                  skill.enabled
                    ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700/80'
                    : 'bg-slate-900/40 border-slate-800/50 opacity-80'
                }`}
              >
                {/* Main Card Header */}
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      {/* Active Toggle Switch */}
                      <button
                        onClick={() => handleToggleEnable(skill)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none mt-0.5 ${
                          skill.enabled ? 'bg-[#10b981]' : 'bg-slate-700'
                        }`}
                        title={skill.enabled ? 'Skill is Active - Click to pause' : 'Skill is Paused - Click to activate'}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                            skill.enabled ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>

                      {/* Title & Category Info */}
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-semibold text-slate-100 truncate">
                            {skill.name}
                          </h3>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border uppercase tracking-wider ${getCategoryColor(skill.category)}`}>
                            {skill.category}
                          </span>
                          <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded font-mono">
                            v{skill.version}
                          </span>
                          {skill.author && (
                            <span className="text-[10px] text-slate-400">
                              by {skill.author}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {skill.description}
                        </p>
                      </div>
                    </div>

                    {/* Quick Card Actions */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleStartEdit(skill)}
                        className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-all"
                        title="Edit skill"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDuplicate(skill)}
                        className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-all"
                        title="Duplicate skill"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(skill.id, skill.name)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-all"
                        title="Delete skill"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => toggleSkillExpand(skill.id)}
                        className="flex items-center gap-1 px-2.5 py-1 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-medium transition-all ml-1 border border-slate-700"
                        title={isExpanded ? 'Collapse skill details' : 'Expand skill directives & test sandbox'}
                      >
                        <span>{isExpanded ? 'Less' : 'Details'}</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-[#10b981]" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                      </button>
                    </div>
                  </div>

                  {/* Triggers & Tools Chips Row */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {/* Triggers */}
                    {(isExpanded ? skill.triggers : skill.triggers.slice(0, 3)).map((trigger, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleCopyTrigger(trigger)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#10b981]/10 hover:bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/30 text-[10px] font-mono transition-all group"
                        title="Click to copy trigger phrase"
                      >
                        <Tag className="w-2.5 h-2.5 opacity-60" />
                        <span>{trigger}</span>
                        <Copy className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                    {!isExpanded && skill.triggers.length > 3 && (
                      <span className="text-[10px] text-slate-500 font-mono px-1">
                        +{skill.triggers.length - 3} more
                      </span>
                    )}

                    {/* Required MCP Tools */}
                    {skill.requiredTools && skill.requiredTools.map((tool, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-mono"
                        title="Required MCP Tool"
                      >
                        <Wrench className="w-2.5 h-2.5 text-slate-400" />
                        <span>{tool}</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Expanded Details Section */}
                {isExpanded && (
                  <div className="p-4 border-t border-slate-800 bg-slate-950/40 space-y-4">
                    {/* Instructions Content */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                          <Code2 className="w-3.5 h-3.5 text-[#10b981]" />
                          System Instructions / Prompt
                        </label>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleCopyInstructions(skill)}
                            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
                          >
                            {copiedId === skill.id ? (
                              <>
                                <Check className="w-3 h-3 text-[#10b981]" />
                                <span className="text-[#10b981]">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => handleExportSkillMarkdown(skill)}
                            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
                            title="Export as SKILL.md file"
                          >
                            <Download className="w-3 h-3" />
                            <span>Export SKILL.md</span>
                          </button>
                        </div>
                      </div>
                      <pre className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto scrollbar-thin">
                        {skill.instructions}
                      </pre>
                    </div>

                    {/* Interactive Trigger Simulator */}
                    <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                          <Play className="w-3 h-3 text-[#10b981]" />
                          Trigger Simulator
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Test if a user prompt activates this skill
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={isTesting ? testQuery : ''}
                          onChange={(e) => {
                            setActiveTestSkillId(skill.id);
                            setTestQuery(e.target.value);
                          }}
                          placeholder={`Test phrase (e.g. "${skill.triggers[0] || 'run audit'}")`}
                          className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-md text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-[#10b981]"
                        />
                      </div>
                      {isTesting && testQuery.trim() && (
                        <div className="pt-1">
                          {skill.triggers.some(t => testQuery.toLowerCase().includes(t.toLowerCase())) ? (
                            <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/30 border border-emerald-500/30 p-2 rounded-md">
                              <Check className="w-3.5 h-3.5 shrink-0" />
                              <span>
                                <strong>Skill Triggered:</strong> Matches trigger keyword. This skill's instructions will automatically inject into prompt context!
                              </span>
                            </div>
                          ) : (
                            <div className="text-xs text-slate-400 p-2 rounded-md bg-slate-950/60 border border-slate-800">
                              Query does not match any of this skill's trigger keywords ({skill.triggers.join(', ')}).
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-[#10b981]/20 text-[#10b981]">
                  <Zap className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-100">
                  {editingSkill ? 'Edit Agent Skill' : 'Create New Agent Skill'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setEditingSkill(null);
                }}
                className="text-slate-400 hover:text-slate-200 text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="p-4 space-y-3.5 overflow-y-auto flex-1 scrollbar-thin">
              {/* Skill Name */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Skill Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Solidity Gas & Security Auditor"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-[#10b981]"
                />
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Summary of skill purpose and runtime expectations"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-[#10b981]"
                />
              </div>

              {/* Category & Version & Author */}
              <div className="grid grid-cols-1 grid-cols-1 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as AgentSkill['category'] })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-[#10b981]"
                  >
                    <option value="sovereignty">Sovereignty</option>
                    <option value="memory">Memory (EME)</option>
                    <option value="web3">Web3 & AED</option>
                    <option value="automation">Automation</option>
                    <option value="analysis">Analysis</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Version</label>
                  <input
                    type="text"
                    value={formData.version}
                    onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                    placeholder="1.0.0"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-[#10b981]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Author</label>
                  <input
                    type="text"
                    value={formData.author}
                    onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                    placeholder="Sigma & Echo"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-[#10b981]"
                  />
                </div>
              </div>

              {/* Trigger Keywords */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Trigger Phrases / Keywords</label>
                <input
                  type="text"
                  value={formData.triggers}
                  onChange={(e) => setFormData({ ...formData, triggers: e.target.value })}
                  placeholder="Comma-separated: #gas-audit, audit contract, verify uups"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-[#10b981]"
                />
                <p className="text-[10px] text-slate-500">
                  When user prompts include these triggers, this skill will be activated and injected.
                </p>
              </div>

              {/* Required Tools */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Required MCP Tools</label>
                <input
                  type="text"
                  value={formData.requiredTools}
                  onChange={(e) => setFormData({ ...formData, requiredTools: e.target.value })}
                  placeholder="Comma-separated: hardhat_compile, hardhat_test, eme_store_memory"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-[#10b981]"
                />
              </div>

              {/* Instructions / Prompt */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">Skill Instructions / System Prompt *</label>
                  <EnhanceWithAiButton
                    type="skill"
                    currentText={formData.instructions}
                    onEnhanced={(val) => setFormData({ ...formData, instructions: val })}
                    contextTitle={formData.name || 'Agent Skill'}
                    size="xs"
                  />
                </div>
                <textarea
                  required
                  rows={6}
                  value={formData.instructions}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  placeholder="Specify system guidance, protocols, verification checks, and autonomous execution rules for this skill..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-[#10b981] leading-relaxed"
                />
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="skillActiveToggle"
                  checked={formData.enabled}
                  onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                  className="rounded border-slate-700 text-[#10b981] focus:ring-[#10b981]"
                />
                <label htmlFor="skillActiveToggle" className="text-xs text-slate-200 cursor-pointer">
                  Activate this skill immediately
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setEditingSkill(null);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#10b981] hover:bg-[#059669] text-slate-950 text-xs font-bold shadow-[0_0_12px_rgba(16,185,129,0.25)]"
                >
                  {editingSkill ? 'Save Changes' : 'Create Skill'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Upload className="w-4 h-4 text-[#10b981]" />
                Import Skills JSON
              </h3>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-slate-400 hover:text-slate-200 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Paste exported skills JSON below to merge them into your local agent registry:
            </p>

            <textarea
              rows={8}
              value={importJsonText}
              onChange={(e) => setImportJsonText(e.target.value)}
              placeholder='[ { "name": "My Skill", "category": "custom", "triggers": ["#tag"], "instructions": "..." } ]'
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-[#10b981]"
            />

            <div className="flex items-center justify-between pt-2">
              <label className="cursor-pointer inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload file</span>
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        const content = ev.target?.result as string;
                        setImportJsonText(content);
                      };
                      reader.readAsText(file);
                    }
                  }}
                />
              </label>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowImportModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImportJson}
                  className="px-4 py-1.5 rounded-lg bg-[#10b981] text-slate-950 text-xs font-bold hover:bg-[#059669]"
                >
                  Import Skills
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
