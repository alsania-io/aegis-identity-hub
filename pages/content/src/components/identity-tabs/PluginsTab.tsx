import React, { useState, useMemo } from 'react';
import {
  Blocks,
  Search,
  Plus,
  Download,
  Upload,
  RotateCcw,
  Globe,
  Shield,
  Zap,
  Play,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Copy,
  Edit3,
  ExternalLink,
  Code,
  Settings as SettingsIcon,
  Eye,
  ChevronDown,
  ChevronUp,
  Layers,
  Terminal,
  FileCode,
  Radio
} from 'lucide-react';
import { PluginManifest, defaultPlugins } from '../../types/identity';
import { toast } from './Toast';

interface PluginsTabProps {
  plugins: PluginManifest[];
  onUpdate: (plugins: PluginManifest[]) => void;
  currentHost?: string;
}

const ALL_CAPABILITIES = [
  'text-insertion',
  'form-submission',
  'file-attachment',
  'dom-manipulation',
  'url-navigation',
  'screenshot-capture',
  'element-selection',
] as const;

export const PluginsTab: React.FC<PluginsTabProps> = ({
  plugins,
  onUpdate,
  currentHost = typeof window !== 'undefined' ? window.location.hostname : 'aistudio.google.com',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'enabled' | 'disabled' | 'custom'>('all');
  const [expandedPluginIds, setExpandedPluginIds] = useState<Set<string>>(new Set());

  const togglePluginExpand = (id: string) => {
    setExpandedPluginIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAllPlugins = () => {
    setExpandedPluginIds(new Set(filteredPlugins.map((p) => p.id)));
  };

  const collapseAllPlugins = () => {
    setExpandedPluginIds(new Set());
  };

  // Modals state
  const [editingPlugin, setEditingPlugin] = useState<PluginManifest | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [inspectPlugin, setInspectPlugin] = useState<PluginManifest | null>(null);
  const [testHostInput, setTestHostInput] = useState(currentHost || 'aistudio.google.com');
  const [testResult, setTestResult] = useState<{ matched: boolean; pluginName?: string; score?: number } | null>(null);

  // Form state for edit/create
  const [formData, setFormData] = useState<Partial<PluginManifest>>({
    name: '',
    description: '',
    category: 'custom',
    type: 'website-adapter',
    version: '1.0.0',
    author: 'User',
    enabled: true,
    isBuiltIn: false,
    hostnames: ['*'],
    capabilities: ['text-insertion', 'form-submission'],
    priority: 5,
    status: 'active',
    settings: {},
    hooks: ['beforePromptSend'],
    customScript: `// Aegis Plugin Hook\nexport default function onHook(context) {\n  console.log('Plugin triggered on host:', context.hostname);\n  return true;\n}`,
  });

  // Calculate statistics
  const stats = useMemo(() => {
    const total = plugins.length;
    const enabled = plugins.filter((p) => p.enabled).length;
    const adapters = plugins.filter((p) => p.category === 'adapter').length;
    const sovereign = plugins.filter((p) => p.category === 'sovereignty' || p.category === 'web3').length;
    const custom = plugins.filter((p) => !p.isBuiltIn).length;
    return { total, enabled, adapters, sovereign, custom };
  }, [plugins]);

  // Determine active plugin for current host
  const activeMatchingPlugin = useMemo(() => {
    const enabledPlugins = plugins.filter((p) => p.enabled);
    let bestMatch: PluginManifest | null = null;
    let bestScore = -1;

    for (const plugin of enabledPlugins) {
      for (const pattern of plugin.hostnames) {
        let match = false;
        let matchLength = 0;
        if (pattern === '*') {
          match = true;
          matchLength = 0;
        } else if (currentHost.includes(pattern)) {
          match = true;
          matchLength = pattern.length;
        }

        if (match) {
          const score = matchLength + (plugin.priority || 0);
          if (score > bestScore) {
            bestScore = score;
            bestMatch = plugin;
          }
        }
      }
    }
    return bestMatch;
  }, [plugins, currentHost]);

  // Filtered plugins
  const filteredPlugins = useMemo(() => {
    return plugins.filter((plugin) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        plugin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        plugin.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        plugin.hostnames.some((h) => h.toLowerCase().includes(searchQuery.toLowerCase())) ||
        plugin.capabilities.some((c) => c.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory = selectedCategory === 'all' || plugin.category === selectedCategory;

      const matchesStatus =
        selectedStatus === 'all' ||
        (selectedStatus === 'enabled' && plugin.enabled) ||
        (selectedStatus === 'disabled' && !plugin.enabled) ||
        (selectedStatus === 'custom' && !plugin.isBuiltIn);

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [plugins, searchQuery, selectedCategory, selectedStatus]);

  // Toggle plugin status
  const handleToggle = (id: string) => {
    const updated = plugins.map((p) => {
      if (p.id === id) {
        const nextEnabled = !p.enabled;
        return {
          ...p,
          enabled: nextEnabled,
          status: nextEnabled ? ('active' as const) : ('inactive' as const),
          updatedAt: new Date().toISOString(),
        };
      }
      return p;
    });
    onUpdate(updated);
    const target = plugins.find((p) => p.id === id);
    if (target) {
      toast.info(
        target.enabled ? 'Plugin Disabled' : 'Plugin Enabled',
        `${target.name} is now ${target.enabled ? 'inactive' : 'active'}`
      );
    }
  };

  // Delete custom plugin
  const handleDelete = (id: string) => {
    const target = plugins.find((p) => p.id === id);
    if (!target) return;
    if (target.isBuiltIn) {
      toast.error('System Plugin', 'Built-in core adapters cannot be deleted. You can disable them instead.');
      return;
    }
    const updated = plugins.filter((p) => p.id !== id);
    onUpdate(updated);
    toast.success('Plugin Removed', `Removed ${target.name}`);
  };

  // Duplicate plugin
  const handleDuplicate = (plugin: PluginManifest) => {
    const clone: PluginManifest = {
      ...plugin,
      id: `plugin-${Date.now()}`,
      name: `${plugin.name} (Copy)`,
      isBuiltIn: false,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onUpdate([clone, ...plugins]);
    toast.success('Plugin Cloned', `Created custom copy of ${plugin.name}`);
  };

  // Save edit / create
  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      toast.error('Validation Error', 'Plugin name is required.');
      return;
    }

    const hostnames = Array.isArray(formData.hostnames)
      ? formData.hostnames
      : String(formData.hostnames || '*')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);

    if (isCreating) {
      const newPlugin: PluginManifest = {
        id: `plugin-${Date.now()}`,
        name: formData.name.trim(),
        description: formData.description?.trim() || '',
        category: (formData.category as any) || 'custom',
        type: (formData.type as any) || 'custom',
        version: formData.version || '1.0.0',
        author: formData.author || 'Alsania Agent',
        enabled: formData.enabled ?? true,
        isBuiltIn: false,
        hostnames: hostnames.length > 0 ? hostnames : ['*'],
        capabilities: formData.capabilities || ['text-insertion'],
        priority: Number(formData.priority) || 5,
        status: 'active',
        settings: formData.settings || {},
        hooks: formData.hooks || ['beforePromptSend'],
        customScript: formData.customScript || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      onUpdate([newPlugin, ...plugins]);
      toast.success('Plugin Installed', `Installed custom plugin: ${newPlugin.name}`);
    } else if (editingPlugin) {
      const updated = plugins.map((p) => {
        if (p.id === editingPlugin.id) {
          return {
            ...p,
            ...formData,
            hostnames: hostnames.length > 0 ? hostnames : ['*'],
            priority: Number(formData.priority) || p.priority,
            updatedAt: new Date().toISOString(),
          } as PluginManifest;
        }
        return p;
      });
      onUpdate(updated);
      toast.success('Plugin Updated', `Saved changes to ${formData.name}`);
    }

    setIsCreating(false);
    setEditingPlugin(null);
  };

  // Export JSON
  const handleExport = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(plugins, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `aegis-plugins-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success('Plugins Exported', 'Downloaded plugin manifests bundle.');
  };

  // Import JSON
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (Array.isArray(imported)) {
          // Merge avoiding ID collisions
          const existingIds = new Set(plugins.map((p) => p.id));
          const validated = imported.map((item: any, idx: number) => ({
            ...item,
            id: existingIds.has(item.id) ? `${item.id}-imported-${idx}` : item.id || `plugin-imported-${Date.now()}-${idx}`,
            isBuiltIn: false,
            createdAt: item.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }));
          onUpdate([...validated, ...plugins]);
          toast.success('Import Complete', `Successfully imported ${validated.length} plugins`);
        } else {
          toast.error('Invalid Format', 'JSON file must contain an array of plugin objects.');
        }
      } catch (err) {
        toast.error('Import Failed', 'Failed to parse the uploaded JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Reset to defaults
  const handleResetDefaults = () => {
    if (confirm('Reset all plugins and adapters to the default Alsanian configuration?')) {
      onUpdate(defaultPlugins);
      toast.info('Plugins Restored', 'Reverted to default built-in adapters and sovereign addons.');
    }
  };

  // Quick host tester
  const handleTestHostMatch = () => {
    const query = testHostInput.trim();
    if (!query) return;

    let bestMatch: PluginManifest | null = null;
    let bestScore = -1;

    for (const plugin of plugins.filter((p) => p.enabled)) {
      for (const pattern of plugin.hostnames) {
        let match = false;
        let matchLength = 0;
        if (pattern === '*') {
          match = true;
          matchLength = 0;
        } else if (query.includes(pattern)) {
          match = true;
          matchLength = pattern.length;
        }

        if (match) {
          const score = matchLength + (plugin.priority || 0);
          if (score > bestScore) {
            bestScore = score;
            bestMatch = plugin;
          }
        }
      }
    }

    if (bestMatch) {
      setTestResult({
        matched: true,
        pluginName: bestMatch.name,
        score: bestScore,
      });
      toast.success('Match Found', `${bestMatch.name} will activate for ${query}`);
    } else {
      setTestResult({ matched: false });
      toast.info('No Match', `No enabled plugin matches host: ${query}`);
    }
  };

  // REAL plugin validation — checks the manifest against concrete criteria.
  const handleSimulatePlugin = (plugin: PluginManifest) => {
    const issues: string[] = [];
    if (!plugin.name?.trim()) issues.push('missing name');
    if (!plugin.hostnames?.length) issues.push('no target hostnames');
    if (!plugin.capabilities?.length) issues.push('no declared capabilities');
    const badHosts = (plugin.hostnames || []).filter((h) => !/^(\*|[\w.-]+\.[a-z]{2,}|localhost)$/i.test(h));
    if (badHosts.length) issues.push(`malformed host(s): ${badHosts.join(', ')}`);
    // A custom hook is stored but NOT executed — flag it honestly.
    const hasUnrunnableScript = !!plugin.customScript?.trim();

    if (issues.length === 0) {
      toast.success(
        'Manifest Valid',
        `${plugin.name}: ${plugin.capabilities.length} capabilities across ${plugin.hostnames.length} host(s)` +
          (hasUnrunnableScript ? ' — note: custom hook is stored but not executed' : '')
      );
    } else {
      toast.warning(`Manifest issues: ${issues.length}`, issues.join('; '));
    }
  };

  // Category styling helper
  const getCategoryColor = (category: PluginManifest['category']) => {
    switch (category) {
      case 'sovereignty':
        return 'text-emerald-400 bg-emerald-950/40 border-emerald-500/30';
      case 'web3':
        return 'text-cyan-400 bg-cyan-950/40 border-cyan-500/30';
      case 'adapter':
        return 'text-blue-400 bg-blue-950/40 border-blue-500/30';
      case 'core':
        return 'text-purple-400 bg-purple-950/40 border-purple-500/30';
      case 'automation':
        return 'text-amber-400 bg-amber-950/40 border-amber-500/30';
      default:
        return 'text-slate-300 bg-slate-800/60 border-slate-700';
    }
  };

  return (
    <div className="space-y-4 text-slate-200">
      {/* Top Banner & Active Host Indicator */}
      <div className="bg-gradient-to-r from-[#0a101f] via-[#0d1726] to-[#0a101f] border border-[#10b981]/25 rounded-xl p-4 shadow-lg">
        <div className="flex flex-col flex-col items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#10b981]/15 border border-[#10b981]/30 flex items-center justify-center text-[#10b981] shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <Blocks className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">Plugins & Addons</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/40 font-mono font-bold">
                  v3.0 Sovereign
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Modular AI platform adapters, DOM injectors, and Alsanian web3 identity plugins.
              </p>
            </div>
          </div>

          {/* Current Page Resolution Badge */}
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-800 self-start sm:self-auto">
            <div className="flex flex-col text-right">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1 justify-end">
                <Globe className="w-3 h-3 text-[#10b981]" /> Active Page Adapter
              </span>
              <span className="text-xs font-bold text-slate-200 truncate max-w-[180px]">
                {activeMatchingPlugin ? activeMatchingPlugin.name : 'Universal Fallback'}
              </span>
            </div>
            <div className="w-2.5 h-2.5 rounded-full bg-[#10b981] animate-pulse" title="Adapter Live & Active" />
          </div>
        </div>

        {/* Quick Stats Counter */}
        <div className="grid grid-cols-1 grid-cols-1 gap-2 mt-4 pt-3 border-t border-slate-800/80 text-xs">
          <div className="bg-slate-900/60 rounded-lg px-2.5 py-1.5 border border-slate-800">
            <span className="text-slate-400 text-[10px] block">Total Plugins</span>
            <span className="font-bold text-white text-sm">{stats.total}</span>
          </div>
          <div className="bg-slate-900/60 rounded-lg px-2.5 py-1.5 border border-slate-800">
            <span className="text-slate-400 text-[10px] block">Enabled</span>
            <span className="font-bold text-[#10b981] text-sm">{stats.enabled}</span>
          </div>
          <div className="bg-slate-900/60 rounded-lg px-2.5 py-1.5 border border-slate-800">
            <span className="text-slate-400 text-[10px] block">Site Adapters</span>
            <span className="font-bold text-blue-400 text-sm">{stats.adapters}</span>
          </div>
          <div className="bg-slate-900/60 rounded-lg px-2.5 py-1.5 border border-slate-800">
            <span className="text-slate-400 text-[10px] block">Sovereignty & Web3</span>
            <span className="font-bold text-emerald-400 text-sm">{stats.sovereign}</span>
          </div>
          <div className="bg-slate-900/60 rounded-lg px-2.5 py-1.5 border border-slate-800 w-full w-full">
            <span className="text-slate-400 text-[10px] block">Custom / Community</span>
            <span className="font-bold text-purple-400 text-sm">{stats.custom}</span>
          </div>
        </div>
      </div>

      {/* Host Match Tester Bar */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3 flex flex-col flex-col items-stretch items-start justify-between gap-2.5 text-xs">
        <div className="flex items-center gap-2 text-slate-300">
          <Radio className="w-4 h-4 text-[#10b981]" />
          <span className="font-medium">Adapter Host Tester:</span>
        </div>
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <input
              type="text"
              value={testHostInput}
              onChange={(e) => setTestHostInput(e.target.value)}
              placeholder="e.g. claude.ai or chatgpt.com"
              className="w-full bg-slate-950 border border-slate-750 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#10b981]"
            />
          </div>
          <button
            onClick={handleTestHostMatch}
            className="px-3 py-1.5 bg-[#10b981]/20 hover:bg-[#10b981]/30 text-[#10b981] border border-[#10b981]/40 rounded-lg font-medium transition-colors"
          >
            Resolve
          </button>
        </div>
        {testResult && (
          <div className="text-[11px] font-mono px-2 py-1 rounded bg-slate-950 border border-slate-800">
            {testResult.matched ? (
              <span className="text-[#10b981] font-semibold">
                ✓ Matched: {testResult.pluginName} (Score {testResult.score})
              </span>
            ) : (
              <span className="text-amber-400">⚠ No direct match (Fallback used)</span>
            )}
          </div>
        )}
      </div>

      {/* Toolbar: Search, Filters, and Actions */}
      <div className="flex flex-col gap-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search plugins by name, host, capability..."
              className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#10b981]"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                setFormData({
                  name: '',
                  description: '',
                  category: 'custom',
                  type: 'website-adapter',
                  version: '1.0.0',
                  author: 'User',
                  enabled: true,
                  isBuiltIn: false,
                  hostnames: ['*'],
                  capabilities: ['text-insertion', 'form-submission'],
                  priority: 5,
                  status: 'active',
                  settings: {},
                  hooks: ['beforePromptSend'],
                  customScript: `// Custom Plugin Script\nexport default function execute(context) {\n  console.log("Plugin action executed on:", context.hostname);\n}`,
                });
                setIsCreating(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#10b981] hover:bg-[#10b981]/90 text-slate-950 font-bold text-xs shadow-md transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Plugin</span>
            </button>

            <label className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer border border-slate-700 transition-colors">
              <Upload className="w-3 h-3 text-slate-300" />
              <span>Import</span>
              <input type="file" accept=".json" onChange={handleImport} className="hidden" />
            </label>

            <button
              onClick={handleExport}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
              title="Export Plugins JSON"
            >
              <Download className="w-3 h-3 text-slate-300" />
              <span>Export</span>
            </button>

            <button
              onClick={handleResetDefaults}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 transition-colors"
              title="Reset to default plugins"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => {
                if (expandedPluginIds.size > 0) collapseAllPlugins();
                else expandAllPlugins();
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
              title={expandedPluginIds.size > 0 ? "Collapse all plugin details" : "Expand all plugin details"}
            >
              {expandedPluginIds.size > 0 ? (
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

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <div className="flex items-center gap-1 pr-2 border-r border-slate-800">
            {['all', 'adapter', 'core', 'sovereignty', 'web3', 'custom'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2 py-1 rounded-md text-[11px] font-medium capitalize transition-colors ${
                  selectedCategory === cat
                    ? 'bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                {cat === 'all' ? 'All Types' : cat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 pl-1">
            {[
              { id: 'all', label: 'All Status' },
              { id: 'enabled', label: 'Enabled' },
              { id: 'disabled', label: 'Disabled' },
              { id: 'custom', label: 'Custom Only' },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setSelectedStatus(st.id as any)}
                className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
                  selectedStatus === st.id
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Plugins List */}
      <div className="space-y-2.5">
        {filteredPlugins.length === 0 ? (
          <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-xl p-8 text-center text-slate-500">
            <Blocks className="w-8 h-8 mx-auto mb-2 text-slate-600" />
            <p className="text-sm font-medium">No plugins matched the criteria.</p>
            <p className="text-xs mt-1 text-slate-600">Try adjusting your search query or filter settings.</p>
          </div>
        ) : (
          filteredPlugins.map((plugin) => {
            const isExpanded = expandedPluginIds.has(plugin.id);
            const isMatchingCurrent =
              activeMatchingPlugin?.id === plugin.id && plugin.enabled;

            return (
              <div
                key={plugin.id}
                className={`bg-slate-900/70 border rounded-xl p-3.5 transition-all duration-200 ${
                  isMatchingCurrent
                    ? 'border-[#10b981]/50 shadow-[0_0_15px_rgba(16,185,129,0.1)] bg-slate-900/90'
                    : 'border-slate-800/80 hover:border-slate-700'
                }`}
              >
                {/* Header Row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 border ${getCategoryColor(
                        plugin.category
                      )}`}
                    >
                      {plugin.category === 'sovereignty' ? (
                        <Shield className="w-4 h-4" />
                      ) : plugin.category === 'web3' ? (
                        <Globe className="w-4 h-4" />
                      ) : plugin.category === 'adapter' ? (
                        <Terminal className="w-4 h-4" />
                      ) : plugin.category === 'core' ? (
                        <Layers className="w-4 h-4" />
                      ) : (
                        <Blocks className="w-4 h-4" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <h3 className="text-sm font-bold text-white truncate">{plugin.name}</h3>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                          v{plugin.version}
                        </span>

                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full border font-medium uppercase tracking-wider ${getCategoryColor(
                            plugin.category
                          )}`}
                        >
                          {plugin.category}
                        </span>

                        {plugin.isBuiltIn ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-400 border border-slate-750">
                            Core
                          </span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-950/60 text-purple-300 border border-purple-800/60">
                            Custom
                          </span>
                        )}

                        {isMatchingCurrent && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#10b981]/25 text-[#10b981] border border-[#10b981]/50 font-bold flex items-center gap-1 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                            Active On Host
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {plugin.description}
                      </p>
                    </div>
                  </div>

                  {/* Toggle & Quick Controls */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleToggle(plugin.id)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                        plugin.enabled ? 'bg-[#10b981]' : 'bg-slate-700'
                      }`}
                      title={plugin.enabled ? 'Click to disable' : 'Click to enable'}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                          plugin.enabled ? 'translate-x-4' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Badges: Hostnames & Capabilities */}
                <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                      <Globe className="w-3 h-3" /> Hosts:
                    </span>
                    {plugin.hostnames.map((host, idx) => (
                      <span
                        key={idx}
                        className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-950/80 border border-slate-800 text-slate-300"
                      >
                        {host}
                      </span>
                    ))}

                    <span className="text-[11px] text-slate-500 font-medium ml-2">Priority:</span>
                    <span className="text-[11px] font-mono font-bold text-slate-300">
                      {plugin.priority}
                    </span>
                  </div>

                  {/* Action Bar */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleSimulatePlugin(plugin)}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium flex items-center gap-1 transition-colors"
                      title="Simulate plugin hook"
                    >
                      <Play className="w-3 h-3 text-[#10b981]" />
                      <span>Test</span>
                    </button>

                    <button
                      onClick={() => setInspectPlugin(plugin)}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium flex items-center gap-1 transition-colors"
                      title="Inspect capabilities & settings"
                    >
                      <Eye className="w-3 h-3 text-cyan-400" />
                      <span>Inspect</span>
                    </button>

                    <button
                      onClick={() => {
                        setEditingPlugin(plugin);
                        setFormData(plugin);
                      }}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                      title="Edit plugin configuration"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleDuplicate(plugin)}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                      title="Duplicate as custom plugin"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    {!plugin.isBuiltIn && (
                      <button
                        onClick={() => handleDelete(plugin.id)}
                        className="p-1 rounded bg-slate-800 hover:bg-red-950/60 text-red-400 hover:text-red-300 border border-transparent hover:border-red-800/50 transition-colors"
                        title="Delete custom plugin"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      onClick={() => togglePluginExpand(plugin.id)}
                      className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-medium transition-colors border border-slate-700/80"
                      title={isExpanded ? 'Collapse plugin details' : 'Expand capabilities & hooks'}
                    >
                      <span>{isExpanded ? 'Less' : 'Details'}</span>
                      {isExpanded ? (
                        <ChevronUp className="w-3 h-3 text-[#10b981]" />
                      ) : (
                        <ChevronDown className="w-3 h-3 text-slate-400" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded Details Section */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-slate-800 space-y-2.5 text-xs">
                    <div>
                      <span className="text-[11px] text-slate-400 font-semibold block mb-1">
                        Registered Capabilities:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {plugin.capabilities.map((cap, cIdx) => (
                          <span
                            key={cIdx}
                            className="text-[10px] px-2 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800 flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-2.5 h-2.5 text-[#10b981]" />
                            {cap}
                          </span>
                        ))}
                      </div>
                    </div>

                    {plugin.settings && Object.keys(plugin.settings).length > 0 && (
                      <div>
                        <span className="text-[11px] text-slate-400 font-semibold block mb-1">
                          Active Configuration:
                        </span>
                        <pre className="bg-slate-950 p-2 rounded-lg text-[10px] font-mono text-slate-300 overflow-x-auto border border-slate-800 max-h-28">
                          {JSON.stringify(plugin.settings, null, 2)}
                        </pre>
                      </div>
                    )}

                    {plugin.customScript && (
                      <div>
                        <span className="text-[11px] text-slate-400 font-semibold block mb-1">
                          Custom Hook Logic (stored, not yet executed):
                        </span>
                        <pre className="bg-slate-950 p-2 rounded-lg text-[10px] font-mono text-emerald-400/90 overflow-x-auto border border-slate-800 max-h-32">
                          {plugin.customScript}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Inspect Modal */}
      {inspectPlugin && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b1220] border border-slate-800 rounded-2xl max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#10b981]/20 border border-[#10b981]/40 flex items-center justify-center text-[#10b981]">
                  <Blocks className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{inspectPlugin.name}</h3>
                  <span className="text-[11px] text-slate-400 font-mono">
                    ID: {inspectPlugin.id} • v{inspectPlugin.version}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setInspectPlugin(null)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded bg-slate-800"
              >
                Close
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-4 text-xs">
              <div>
                <span className="text-slate-400 font-semibold block mb-1">Description</span>
                <p className="text-slate-200 leading-relaxed bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  {inspectPlugin.description}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2 text-xs">
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Category</span>
                  <span className="text-white font-medium capitalize">{inspectPlugin.category}</span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Plugin Type</span>
                  <span className="text-white font-medium capitalize">{inspectPlugin.type}</span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Priority</span>
                  <span className="text-[#10b981] font-mono font-bold">{inspectPlugin.priority}</span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Author</span>
                  <span className="text-slate-300 font-medium">{inspectPlugin.author || 'Aegis'}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 font-semibold block mb-1">Supported Hostnames</span>
                <div className="flex flex-wrap gap-1">
                  {inspectPlugin.hostnames.map((h, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded bg-slate-950 text-[#10b981] font-mono text-[11px] border border-slate-800"
                    >
                      {h}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-slate-400 font-semibold block mb-1">Capabilities</span>
                <div className="grid grid-cols-1 gap-1.5">
                  {inspectPlugin.capabilities.map((c, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1.5 p-1.5 rounded bg-slate-950 border border-slate-800 text-slate-300"
                    >
                      <CheckCircle2 className="w-3 h-3 text-[#10b981]" />
                      <span>{c}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-slate-400 font-semibold block mb-1">Raw JSON Manifest</span>
                <pre className="bg-slate-950 p-3 rounded-lg text-[10px] font-mono text-slate-300 overflow-x-auto border border-slate-800 max-h-40">
                  {JSON.stringify(inspectPlugin, null, 2)}
                </pre>
              </div>
            </div>

            <div className="p-3 border-t border-slate-800 bg-slate-900/50 flex justify-end">
              <button
                onClick={() => setInspectPlugin(null)}
                className="px-4 py-1.5 rounded-lg bg-[#10b981] hover:bg-[#10b981]/90 text-slate-950 font-bold text-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {(isCreating || editingPlugin) && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveForm}
            className="bg-[#0b1220] border border-slate-800 rounded-2xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
          >
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
              <div className="flex items-center gap-2">
                <Blocks className="w-4 h-4 text-[#10b981]" />
                <h3 className="text-sm font-bold text-white">
                  {isCreating ? 'Install Custom Plugin' : `Edit ${editingPlugin?.name}`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false);
                  setEditingPlugin(null);
                }}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded bg-slate-800"
              >
                Cancel
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3.5 text-xs">
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-slate-400 text-[11px] font-semibold mb-1">Plugin Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Chat Auto-Summarizer"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-[#10b981]"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-[11px] font-semibold mb-1">Category</label>
                  <select
                    value={formData.category || 'custom'}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-[#10b981]"
                  >
                    <option value="adapter">Adapter (AI Chat UI)</option>
                    <option value="sovereignty">Sovereignty & Privacy</option>
                    <option value="web3">Web3 & AED</option>
                    <option value="core">Core UI</option>
                    <option value="automation">Automation & Export</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 text-[11px] font-semibold mb-1">Description</label>
                <textarea
                  rows={2}
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe what this plugin does..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-[#10b981]"
                />
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-slate-400 text-[11px] font-semibold mb-1">Version</label>
                  <input
                    type="text"
                    value={formData.version || '1.0.0'}
                    onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-[#10b981]"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-[11px] font-semibold mb-1">Author</label>
                  <input
                    type="text"
                    value={formData.author || ''}
                    onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                    placeholder="Sigma & Echo"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-[#10b981]"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-[11px] font-semibold mb-1">Priority (1-10)</label>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    value={formData.priority ?? 5}
                    onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-[#10b981]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 text-[11px] font-semibold mb-1">
                  Target Hostnames (comma separated or * for wildcard)
                </label>
                <input
                  type="text"
                  value={
                    Array.isArray(formData.hostnames)
                      ? formData.hostnames.join(', ')
                      : formData.hostnames || '*'
                  }
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      hostnames: e.target.value.split(',').map((s) => s.trim()),
                    })
                  }
                  placeholder="e.g. chatgpt.com, claude.ai, *"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-[#10b981]"
                />
              </div>

              <div>
                <label className="block text-slate-400 text-[11px] font-semibold mb-1">Capabilities</label>
                <div className="grid grid-cols-1 gap-1.5 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  {ALL_CAPABILITIES.map((cap) => {
                    const isChecked = (formData.capabilities || []).includes(cap);
                    return (
                      <label key={cap} className="flex items-center gap-2 cursor-pointer text-slate-300">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const current = formData.capabilities || [];
                            const next = e.target.checked
                              ? [...current, cap]
                              : current.filter((c) => c !== cap);
                            setFormData({ ...formData, capabilities: next });
                          }}
                          className="rounded bg-slate-900 border-slate-700 text-[#10b981] focus:ring-0"
                        />
                        <span className="text-[11px]">{cap}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-slate-400 text-[11px] font-semibold mb-1">
                  Custom Hook Script (JavaScript) — stored only, not yet executed
                </label>
                <textarea
                  rows={4}
                  value={formData.customScript || ''}
                  onChange={(e) => setFormData({ ...formData, customScript: e.target.value })}
                  placeholder="// Export hook logic..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-emerald-400/90 font-mono text-[11px] focus:outline-none focus:border-[#10b981]"
                />
              </div>
            </div>

            <div className="p-3 border-t border-slate-800 bg-slate-900/50 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false);
                  setEditingPlugin(null);
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-[#10b981] hover:bg-[#10b981]/90 text-slate-950 font-bold text-xs shadow-md"
              >
                Save Plugin
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
