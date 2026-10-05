import React, { useState, useMemo, useEffect } from 'react';
import {
  KeyRound,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Search,
  Plus,
  Copy,
  Eye,
  EyeOff,
  Trash2,
  Edit3,
  Download,
  Upload,
  RotateCcw,
  Globe,
  Terminal,
  FileCode,
  Lock,
  Unlock,
  CheckCircle2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Zap,
  Tag,
  Layers,
  Database
} from 'lucide-react';
import { SecretItem, SecretCategory, SecretEnvironment, defaultSecrets } from '../../types/identity';
import { toast } from './Toast';

interface SecretsTabProps {
  secrets: SecretItem[];
  onUpdate: (secrets: SecretItem[]) => void;
  currentHost?: string;
}

const CATEGORY_META: Record<
  SecretCategory,
  { label: string; color: string; bg: string; border: string; icon: any }
> = {
  'api-key': {
    label: 'API Key',
    color: 'text-blue-400',
    bg: 'bg-blue-950/40',
    border: 'border-blue-500/30',
    icon: KeyRound,
  },
  'env-var': {
    label: 'Env Var',
    color: 'text-purple-400',
    bg: 'bg-purple-950/40',
    border: 'border-purple-500/30',
    icon: Terminal,
  },
  token: {
    label: 'Token',
    color: 'text-emerald-400',
    bg: 'bg-emerald-950/40',
    border: 'border-emerald-500/30',
    icon: Shield,
  },
  'private-key': {
    label: 'Private Key',
    color: 'text-rose-400',
    bg: 'bg-rose-950/40',
    border: 'border-rose-500/30',
    icon: Lock,
  },
  'connection-string': {
    label: 'Connection / RPC',
    color: 'text-amber-400',
    bg: 'bg-amber-950/40',
    border: 'border-amber-500/30',
    icon: Database,
  },
  custom: {
    label: 'Custom',
    color: 'text-slate-300',
    bg: 'bg-slate-800/60',
    border: 'border-slate-700',
    icon: Tag,
  },
};

const TEMPLATE_PRESETS = [
  {
    key: 'GEMINI_API_KEY',
    category: 'api-key' as SecretCategory,
    environment: 'all' as SecretEnvironment,
    description: 'Google AI Studio and Gemini API authentication key.',
    associatedHosts: ['aistudio.google.com', 'gemini.google.com'],
    tags: ['ai', 'google', 'gemini'],
  },
  {
    key: 'OPENAI_API_KEY',
    category: 'api-key' as SecretCategory,
    environment: 'all' as SecretEnvironment,
    description: 'OpenAI API key for ChatGPT and GPT-4o models.',
    associatedHosts: ['chatgpt.com', 'platform.openai.com'],
    tags: ['ai', 'openai'],
  },
  {
    key: 'ANTHROPIC_API_KEY',
    category: 'api-key' as SecretCategory,
    environment: 'all' as SecretEnvironment,
    description: 'Anthropic Claude API key.',
    associatedHosts: ['claude.ai', 'anthropic.com'],
    tags: ['ai', 'anthropic', 'claude'],
  },
  {
    key: 'DEEPSEEK_API_KEY',
    category: 'api-key' as SecretCategory,
    environment: 'all' as SecretEnvironment,
    description: 'DeepSeek platform API access key.',
    associatedHosts: ['chat.deepseek.com'],
    tags: ['ai', 'deepseek'],
  },
  {
    key: 'ALSANIA_RPC_URL',
    category: 'connection-string' as SecretCategory,
    environment: 'testnet' as SecretEnvironment,
    description: 'Sovereign EVM node RPC URL for Alsania Enhanced Domains (AED).',
    associatedHosts: ['*'],
    tags: ['web3', 'evm', 'alsania'],
  },
  {
    key: 'PINATA_JWT',
    category: 'token' as SecretCategory,
    environment: 'production' as SecretEnvironment,
    description: 'IPFS Pinning service token for decentralized web3 metadata.',
    associatedHosts: ['*'],
    tags: ['ipfs', 'web3', 'pinata'],
  },
  {
    key: 'DATABASE_URL',
    category: 'connection-string' as SecretCategory,
    environment: 'development' as SecretEnvironment,
    description: 'PostgreSQL / SQL database connection string.',
    associatedHosts: ['localhost'],
    tags: ['database', 'sql'],
  },
  {
    key: 'GITHUB_TOKEN',
    category: 'token' as SecretCategory,
    environment: 'all' as SecretEnvironment,
    description: 'GitHub Personal Access Token for repo sync & API access.',
    associatedHosts: ['github.com'],
    tags: ['git', 'github'],
  },
];

export const SecretsTab: React.FC<SecretsTabProps> = ({
  secrets,
  onUpdate,
  currentHost = typeof window !== 'undefined' ? window.location.hostname : 'aistudio.google.com',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedEnvironment, setSelectedEnvironment] = useState<string>('all');
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());

  // Master Vault Lock
  const [isVaultLocked, setIsVaultLocked] = useState(false);
  const [vaultPassphrase, setVaultPassphrase] = useState<string>(() => {
    try {
      return localStorage.getItem('aegis_vault_pass_set') ? 'configured' : '';
    } catch {
      return '';
    }
  });
  const [showPassphraseModal, setShowPassphraseModal] = useState(false);
  const [inputPassphrase, setInputPassphrase] = useState('');

  // Modals state
  const [editingSecret, setEditingSecret] = useState<SecretItem | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<'env' | 'bash' | 'json' | 'mcp'>('env');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Form data for create / edit
  const [formData, setFormData] = useState<Partial<SecretItem>>({
    key: '',
    value: '',
    category: 'api-key',
    environment: 'all',
    description: '',
    associatedHosts: ['*'],
    tags: [],
    isMasked: true,
  });

  // Calculate stats
  const stats = useMemo(() => {
    const total = secrets.length;
    const apiKeys = secrets.filter((s) => s.category === 'api-key').length;
    const envVars = secrets.filter((s) => s.category === 'env-var').length;
    const tokens = secrets.filter((s) => s.category === 'token' || s.category === 'private-key').length;
    const matchingHost = secrets.filter((s) =>
      s.associatedHosts?.some((h) => h === '*' || currentHost.includes(h))
    ).length;
    return { total, apiKeys, envVars, tokens, matchingHost };
  }, [secrets, currentHost]);

  // Filtered secrets list
  const filteredSecrets = useMemo(() => {
    return secrets.filter((item) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        item.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.tags && item.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))) ||
        (item.associatedHosts && item.associatedHosts.some((h) => h.toLowerCase().includes(searchQuery.toLowerCase())));

      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const matchesEnvironment = selectedEnvironment === 'all' || item.environment === selectedEnvironment;

      return matchesSearch && matchesCategory && matchesEnvironment;
    });
  }, [secrets, searchQuery, selectedCategory, selectedEnvironment]);

  // Toggle reveal for an individual secret
  const toggleReveal = (id: string) => {
    if (isVaultLocked) {
      toast.warning('Vault Locked', 'Unlock the vault with your master passphrase to view secret values.');
      return;
    }
    setRevealedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Safe clipboard helper
  const copyToClipboard = async (text: string, label: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for iframe restrictions
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedKey(label);
      setTimeout(() => setCopiedKey(null), 2000);
      toast.success('Copied to Clipboard', label);
    } catch (err) {
      toast.error('Copy Failed', 'Clipboard access denied.');
    }
  };

  // 1-Click quick insert into active prompt/input
  const handleQuickInsert = (secret: SecretItem) => {
    if (!secret.value) {
      toast.warning('Empty Value', `${secret.key} has no stored value to insert.`);
      return;
    }
    // Attempt DOM insertion into active input or prompt field
    const activeEl = document.activeElement as HTMLInputElement | HTMLTextAreaElement | null;
    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable)) {
      if (activeEl.isContentEditable) {
        document.execCommand('insertText', false, secret.value);
      } else {
        const start = activeEl.selectionStart || 0;
        const end = activeEl.selectionEnd || 0;
        const val = activeEl.value || '';
        activeEl.value = val.substring(0, start) + secret.value + val.substring(end);
        activeEl.selectionStart = activeEl.selectionEnd = start + secret.value.length;
        activeEl.dispatchEvent(new Event('input', { bubbles: true }));
      }
      toast.success('Injected Secret', `Inserted value for ${secret.key}`);
    } else {
      // Fallback to clipboard
      copyToClipboard(secret.value, `${secret.key} (Copied for Insertion)`);
    }

    // Update lastUsedAt
    const updated = secrets.map((s) =>
      s.id === secret.id ? { ...s, lastUsedAt: new Date().toISOString() } : s
    );
    onUpdate(updated);
  };

  // Toggle mask all
  const toggleMaskAll = () => {
    if (revealedIds.size > 0) {
      setRevealedIds(new Set());
      toast.info('All Secrets Masked', 'Masked all visible values.');
    } else {
      if (isVaultLocked) {
        toast.warning('Vault Locked', 'Please unlock vault first.');
        return;
      }
      setRevealedIds(new Set(secrets.map((s) => s.id)));
      toast.info('All Secrets Revealed', 'Caution: values are now visible on screen.');
    }
  };

  // Save new or edited secret
  const handleSaveSecret = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.key?.trim()) {
      toast.error('Validation Error', 'Key name is required.');
      return;
    }

    const cleanKey = formData.key.trim().toUpperCase().replace(/\s+/g, '_');
    const hosts = Array.isArray(formData.associatedHosts)
      ? formData.associatedHosts
      : String(formData.associatedHosts || '*')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);

    const tags = Array.isArray(formData.tags)
      ? formData.tags
      : String(formData.tags || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);

    if (isCreating) {
      const newSecret: SecretItem = {
        id: `secret-${Date.now()}`,
        key: cleanKey,
        value: formData.value || '',
        category: (formData.category as SecretCategory) || 'api-key',
        environment: (formData.environment as SecretEnvironment) || 'all',
        description: formData.description?.trim() || '',
        associatedHosts: hosts.length > 0 ? hosts : ['*'],
        tags,
        isMasked: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      onUpdate([newSecret, ...secrets]);
      toast.success('Secret Added', `Added ${cleanKey}`);
    } else if (editingSecret) {
      const updated = secrets.map((s) => {
        if (s.id === editingSecret.id) {
          return {
            ...s,
            ...formData,
            key: cleanKey,
            associatedHosts: hosts.length > 0 ? hosts : ['*'],
            tags,
            updatedAt: new Date().toISOString(),
          } as SecretItem;
        }
        return s;
      });
      onUpdate(updated);
      toast.success('Secret Updated', `Saved changes to ${cleanKey}`);
    }

    setIsCreating(false);
    setEditingSecret(null);
  };

  // Delete secret
  const handleDelete = (id: string) => {
    const target = secrets.find((s) => s.id === id);
    if (!target) return;
    const updated = secrets.filter((s) => s.id !== id);
    onUpdate(updated);
    toast.success('Secret Deleted', `Removed ${target.key}`);
  };

  // Parse .env text and import
  const handleImportEnv = () => {
    if (!importText.trim()) return;

    const lines = importText.split('\n');
    const newItems: SecretItem[] = [];
    const existingKeys = new Set(secrets.map((s) => s.key));

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;

      const equalsIdx = trimmed.indexOf('=');
      if (equalsIdx <= 0) return;

      const rawKey = trimmed.substring(0, equalsIdx).trim().toUpperCase();
      let rawVal = trimmed.substring(equalsIdx + 1).trim();

      // Strip quotes if present
      if (
        (rawVal.startsWith('"') && rawVal.endsWith('"')) ||
        (rawVal.startsWith("'") && rawVal.endsWith("'"))
      ) {
        rawVal = rawVal.slice(1, -1);
      }

      // Infer category
      let category: SecretCategory = 'env-var';
      if (rawKey.includes('KEY') || rawKey.includes('SECRET')) category = 'api-key';
      else if (rawKey.includes('TOKEN') || rawKey.includes('JWT') || rawKey.includes('AUTH')) category = 'token';
      else if (rawKey.includes('URL') || rawKey.includes('HOST') || rawKey.includes('URI')) category = 'connection-string';
      else if (rawKey.includes('PRIVATE')) category = 'private-key';

      newItems.push({
        id: `secret-import-${Date.now()}-${index}`,
        key: rawKey,
        value: rawVal,
        category,
        environment: 'all',
        description: `Imported from .env (${new Date().toLocaleDateString()})`,
        associatedHosts: ['*'],
        tags: ['imported'],
        isMasked: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });

    if (newItems.length === 0) {
      toast.error('Import Failed', 'No valid KEY=VALUE lines found in input.');
      return;
    }

    // Merge strategy: update existing or add new
    const updated = [...secrets];
    newItems.forEach((newItem) => {
      const idx = updated.findIndex((s) => s.key === newItem.key);
      if (idx >= 0) {
        updated[idx] = { ...updated[idx], value: newItem.value, updatedAt: new Date().toISOString() };
      } else {
        updated.unshift(newItem);
      }
    });

    onUpdate(updated);
    toast.success('Import Successful', `Imported ${newItems.length} environment variables.`);
    setShowImportModal(false);
    setImportText('');
  };

  // Generate export string
  const exportPayload = useMemo(() => {
    switch (exportFormat) {
      case 'env':
        return (
          `# Aegis Identity Hub — Environment Secrets\n# Generated: ${new Date().toISOString()}\n\n` +
          secrets
            .map((s) => {
              const comment = s.description ? `# ${s.description}\n` : '';
              return `${comment}${s.key}="${s.value}"`;
            })
            .join('\n\n')
        );
      case 'bash':
        return (
          `#!/usr/bin/env bash\n# Aegis Identity Hub — Shell Environment Exports\n\n` +
          secrets.map((s) => `export ${s.key}="${s.value}"`).join('\n')
        );
      case 'json':
        return JSON.stringify(secrets, null, 2);
      case 'mcp': {
        const envMap: Record<string, string> = {};
        secrets.forEach((s) => {
          envMap[s.key] = s.value;
        });
        return JSON.stringify({ env: envMap }, null, 2);
      }
      default:
        return '';
    }
  }, [secrets, exportFormat]);

  // Download export as file
  const handleDownloadExport = () => {
    const ext = exportFormat === 'json' || exportFormat === 'mcp' ? 'json' : exportFormat === 'bash' ? 'sh' : 'env';
    const blob = new Blob([exportPayload], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `aegis-secrets-${new Date().toISOString().slice(0, 10)}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Downloaded Secrets', `Saved as .${ext}`);
  };

  // Master Passphrase Handler
  const handleSavePassphrase = () => {
    if (!inputPassphrase.trim()) {
      // Remove passphrase
      try {
        localStorage.removeItem('aegis_vault_pass_set');
      } catch {}
      setVaultPassphrase('');
      setIsVaultLocked(false);
      toast.info('Vault Protection Removed', 'Vault is now unlocked by default.');
    } else {
      try {
        localStorage.setItem('aegis_vault_pass_set', 'true');
      } catch {}
      setVaultPassphrase('configured');
      setIsVaultLocked(false);
      toast.success('Vault Passphrase Set', 'Your secrets vault is now protected.');
    }
    setShowPassphraseModal(false);
    setInputPassphrase('');
  };

  return (
    <div className="space-y-4 text-slate-200">
      {/* Top Banner: Vault Status & Active Host Detection */}
      <div className="bg-gradient-to-r from-[#0a101f] via-[#0d1726] to-[#0a101f] border border-[#10b981]/25 rounded-xl p-4 shadow-lg">
        <div className="flex flex-col flex-col items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#10b981]/15 border border-[#10b981]/30 flex items-center justify-center text-[#10b981] shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">Secrets & Env Variables</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/40 font-mono font-bold">
                  Sovereign Vault
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Encrypted client-side store for API keys, environment tokens, RPC endpoints, and quick prompt injections.
              </p>
            </div>
          </div>

          {/* Master Vault Protection Controls */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => {
                if (vaultPassphrase) {
                  setIsVaultLocked(!isVaultLocked);
                  toast.info(
                    isVaultLocked ? 'Vault Unlocked' : 'Vault Locked',
                    isVaultLocked ? 'Secret values can now be viewed.' : 'Secret values are securely shielded.'
                  );
                } else {
                  setShowPassphraseModal(true);
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                isVaultLocked
                  ? 'bg-rose-950/40 text-rose-300 border-rose-500/40 hover:bg-rose-900/40'
                  : vaultPassphrase
                  ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/40'
                  : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
              }`}
            >
              {isVaultLocked ? (
                <>
                  <Lock className="w-3.5 h-3.5 text-rose-400" />
                  <span>Vault Locked</span>
                </>
              ) : vaultPassphrase ? (
                <>
                  <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Vault Unlocked</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                  <span>Set Master Lock</span>
                </>
              )}
            </button>

            <button
              onClick={() => setShowPassphraseModal(true)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors"
              title="Vault security options"
            >
              <Shield className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Quick Stats Counter */}
        <div className="grid grid-cols-1 grid-cols-1 gap-2 mt-4 pt-3 border-t border-slate-800/80 text-xs">
          <div className="bg-slate-900/60 rounded-lg px-2.5 py-1.5 border border-slate-800">
            <span className="text-slate-400 text-[10px] block">Total Keys</span>
            <span className="font-bold text-white text-sm">{stats.total}</span>
          </div>
          <div className="bg-slate-900/60 rounded-lg px-2.5 py-1.5 border border-slate-800">
            <span className="text-slate-400 text-[10px] block">API Keys</span>
            <span className="font-bold text-blue-400 text-sm">{stats.apiKeys}</span>
          </div>
          <div className="bg-slate-900/60 rounded-lg px-2.5 py-1.5 border border-slate-800">
            <span className="text-slate-400 text-[10px] block">Env Variables</span>
            <span className="font-bold text-purple-400 text-sm">{stats.envVars}</span>
          </div>
          <div className="bg-slate-900/60 rounded-lg px-2.5 py-1.5 border border-slate-800">
            <span className="text-slate-400 text-[10px] block">Web3 & Tokens</span>
            <span className="font-bold text-emerald-400 text-sm">{stats.tokens}</span>
          </div>
          <div className="bg-slate-900/60 rounded-lg px-2.5 py-1.5 border border-slate-800 w-full w-full">
            <span className="text-slate-400 text-[10px] block">Active On Host</span>
            <span className="font-bold text-[#10b981] text-sm flex items-center gap-1">
              <Globe className="w-3 h-3 text-[#10b981]" />
              {stats.matchingHost}
            </span>
          </div>
        </div>
      </div>

      {/* Toolbar: Search, Filters & Action Hub */}
      <div className="flex flex-col gap-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search secrets by key, host, tag, description..."
              className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#10b981]"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                setFormData({
                  key: '',
                  value: '',
                  category: 'api-key',
                  environment: 'all',
                  description: '',
                  associatedHosts: [currentHost || '*'],
                  tags: [],
                  isMasked: true,
                });
                setIsCreating(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#10b981] hover:bg-[#10b981]/90 text-slate-950 font-bold text-xs shadow-md transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Secret</span>
            </button>

            {/* Template Selector */}
            <div className="relative group">
              <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Templates</span>
                <ChevronDown className="w-3 h-3" />
              </button>

              <div className="absolute right-0 top-full mt-1 w-56 bg-slate-900 border border-slate-800 rounded-xl p-1 shadow-2xl z-30 hidden group-hover:block">
                <div className="px-2 py-1 text-[10px] uppercase font-bold text-slate-500">Popular Presets</div>
                {TEMPLATE_PRESETS.map((tmpl) => (
                  <button
                    key={tmpl.key}
                    onClick={() => {
                      setFormData({
                        key: tmpl.key,
                        value: '',
                        category: tmpl.category,
                        environment: tmpl.environment,
                        description: tmpl.description,
                        associatedHosts: tmpl.associatedHosts,
                        tags: tmpl.tags,
                        isMasked: true,
                      });
                      setIsCreating(true);
                    }}
                    className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-slate-800 text-xs flex items-center justify-between text-slate-300 hover:text-white"
                  >
                    <span className="font-mono text-[11px] font-semibold">{tmpl.key}</span>
                    <span className="text-[10px] text-slate-500 uppercase">{tmpl.category}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
              title="Import .env"
            >
              <Upload className="w-3 h-3 text-slate-300" />
              <span>Import</span>
            </button>

            <button
              onClick={() => setShowExportModal(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
              title="Export .env / bash / JSON"
            >
              <Download className="w-3 h-3 text-slate-300" />
              <span>Export</span>
            </button>

            <button
              onClick={toggleMaskAll}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 transition-colors"
              title={revealedIds.size > 0 ? 'Mask all values' : 'Reveal all values'}
            >
              {revealedIds.size > 0 ? <EyeOff className="w-3.5 h-3.5 text-amber-400" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <div className="flex items-center gap-1 pr-2 border-r border-slate-800">
            {['all', 'api-key', 'env-var', 'token', 'connection-string'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2 py-1 rounded-md text-[11px] font-medium capitalize transition-colors ${
                  selectedCategory === cat
                    ? 'bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                {cat === 'all' ? 'All Types' : CATEGORY_META[cat as SecretCategory]?.label || cat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 pl-1">
            {['all', 'development', 'production', 'testnet'].map((env) => (
              <button
                key={env}
                onClick={() => setSelectedEnvironment(env)}
                className={`px-2 py-1 rounded-md text-[11px] font-medium capitalize transition-colors ${
                  selectedEnvironment === env
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {env === 'all' ? 'All Envs' : env}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Secrets Cards List */}
      <div className="space-y-2.5">
        {filteredSecrets.length === 0 ? (
          <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-xl p-8 text-center text-slate-500">
            <KeyRound className="w-8 h-8 mx-auto mb-2 text-slate-600" />
            <p className="text-sm font-medium">No secrets or environment variables found.</p>
            <p className="text-xs mt-1 text-slate-600">
              Click &quot;Add Secret&quot; or choose from &quot;Templates&quot; to populate your store.
            </p>
          </div>
        ) : (
          filteredSecrets.map((secret) => {
            const isRevealed = revealedIds.has(secret.id) && !isVaultLocked;
            const meta = CATEGORY_META[secret.category] || CATEGORY_META.custom;
            const Icon = meta.icon;
            const isHostMatch = secret.associatedHosts?.some(
              (h) => h === '*' || currentHost.includes(h)
            );

            return (
              <div
                key={secret.id}
                className={`bg-slate-900/70 border rounded-xl p-3.5 transition-all duration-200 ${
                  isHostMatch
                    ? 'border-[#10b981]/40 shadow-[0_0_15px_rgba(16,185,129,0.08)] bg-slate-900/85'
                    : 'border-slate-800/80 hover:border-slate-700'
                }`}
              >
                {/* Top Row: Meta, Key, Environment & Quick Actions */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 border ${meta.bg} ${meta.border} ${meta.color}`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-white tracking-wider truncate">
                          {secret.key}
                        </span>

                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full border font-medium uppercase tracking-wider ${meta.bg} ${meta.border} ${meta.color}`}
                        >
                          {meta.label}
                        </span>

                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 uppercase font-mono">
                          {secret.environment}
                        </span>

                        {isHostMatch && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/40 font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
                            Active Host
                          </span>
                        )}
                      </div>

                      {secret.description && (
                        <p className="text-xs text-slate-400 mt-1 line-clamp-1 leading-relaxed">
                          {secret.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Primary 1-Click Action Buttons */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {/* Quick Inject / Use on Active Page */}
                    <button
                      onClick={() => handleQuickInsert(secret)}
                      className="px-2.5 py-1 rounded-lg bg-[#10b981]/20 hover:bg-[#10b981]/30 text-[#10b981] border border-[#10b981]/40 text-xs font-semibold flex items-center gap-1 transition-colors"
                      title="Insert secret into active chat or prompt input"
                    >
                      <Zap className="w-3 h-3 text-[#10b981]" />
                      <span>Use</span>
                    </button>

                    {/* Copy Raw Value */}
                    <button
                      onClick={() => copyToClipboard(secret.value, `${secret.key} Value`)}
                      className={`px-2 py-1 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1 ${
                        copiedKey === `${secret.key} Value`
                          ? 'bg-[#10b981] text-slate-950 border-[#10b981]'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                      }`}
                      title="Copy raw value"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedKey === `${secret.key} Value` ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                {/* Middle Row: Masked / Plaintext Value Display */}
                <div className="mt-3 bg-slate-950/80 border border-slate-800/80 rounded-lg p-2 flex items-center justify-between gap-2">
                  <div className="flex-1 font-mono text-xs overflow-hidden text-ellipsis whitespace-nowrap px-1">
                    {isVaultLocked ? (
                      <span className="text-slate-500 italic flex items-center gap-1">
                        <Lock className="w-3 h-3 text-slate-500" /> Vault locked (enter passphrase to inspect)
                      </span>
                    ) : isRevealed ? (
                      <span className="text-emerald-400 select-all">
                        {secret.value || <span className="text-slate-600 italic">&lt;empty&gt;</span>}
                      </span>
                    ) : (
                      <span className="text-slate-500 tracking-widest select-none">
                        {secret.value ? '••••••••••••••••••••••••' : <span className="text-slate-600 italic">&lt;not set&gt;</span>}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => toggleReveal(secret.id)}
                      className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                      title={isRevealed ? 'Mask value' : 'Reveal value'}
                    >
                      {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Bottom Row: Quick Format Copies & Management */}
                <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-2 text-xs">
                  {/* Quick Format Snippets */}
                  <div className="flex flex-wrap items-center gap-1 text-[11px] text-slate-400 font-mono">
                    <button
                      onClick={() => copyToClipboard(`${secret.key}="${secret.value}"`, `${secret.key}=...`)}
                      className="hover:text-[#10b981] px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 transition-colors"
                      title="Copy as KEY=VALUE"
                    >
                      .env
                    </button>
                    <button
                      onClick={() => copyToClipboard(`export ${secret.key}="${secret.value}"`, `export ${secret.key}`)}
                      className="hover:text-[#10b981] px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 transition-colors"
                      title="Copy as export KEY=VALUE"
                    >
                      export
                    </button>
                    <button
                      onClick={() => copyToClipboard(`process.env.${secret.key}`, `process.env.${secret.key}`)}
                      className="hover:text-[#10b981] px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 transition-colors"
                      title="Copy process.env.KEY"
                    >
                      Node
                    </button>

                    {secret.associatedHosts && secret.associatedHosts.length > 0 && (
                      <span className="ml-2 text-slate-500 font-sans text-[10px] flex items-center gap-1">
                        <Globe className="w-2.5 h-2.5" />
                        {secret.associatedHosts.join(', ')}
                      </span>
                    )}
                  </div>

                  {/* Actions: Edit / Delete */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingSecret(secret);
                        setFormData(secret);
                      }}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                      title="Edit secret"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(secret.id)}
                      className="p-1 rounded bg-slate-800 hover:bg-red-950/60 text-red-400 hover:text-red-300 border border-transparent hover:border-red-800/50 transition-colors"
                      title="Delete secret"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create / Edit Secret Modal */}
      {(isCreating || editingSecret) && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveSecret}
            className="bg-[#0b1220] border border-slate-800 rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
          >
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-[#10b981]" />
                <h3 className="text-sm font-bold text-white">
                  {isCreating ? 'Add Secret / Env Variable' : `Edit ${editingSecret?.key}`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false);
                  setEditingSecret(null);
                }}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded bg-slate-800"
              >
                Cancel
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-400 text-[11px] font-semibold mb-1">
                  Key Name * (e.g. GEMINI_API_KEY, DATABASE_URL)
                </label>
                <input
                  type="text"
                  required
                  value={formData.key || ''}
                  onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                  placeholder="e.g. OPENAI_API_KEY"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-[#10b981]"
                />
              </div>

              <div>
                <label className="block text-slate-400 text-[11px] font-semibold mb-1">
                  Secret Value *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.value || ''}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    placeholder="Enter secret or environment value..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-[#10b981]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-slate-400 text-[11px] font-semibold mb-1">Category</label>
                  <select
                    value={formData.category || 'api-key'}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-[#10b981]"
                  >
                    <option value="api-key">API Key</option>
                    <option value="env-var">Environment Variable</option>
                    <option value="token">Token / Auth JWT</option>
                    <option value="connection-string">Connection / RPC URL</option>
                    <option value="private-key">Private Key</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 text-[11px] font-semibold mb-1">Environment</label>
                  <select
                    value={formData.environment || 'all'}
                    onChange={(e) => setFormData({ ...formData, environment: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-[#10b981]"
                  >
                    <option value="all">All Environments</option>
                    <option value="development">Development</option>
                    <option value="production">Production</option>
                    <option value="testnet">Testnet</option>
                    <option value="staging">Staging</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 text-[11px] font-semibold mb-1">
                  Associated Hostnames (comma separated or * for all)
                </label>
                <input
                  type="text"
                  value={
                    Array.isArray(formData.associatedHosts)
                      ? formData.associatedHosts.join(', ')
                      : formData.associatedHosts || '*'
                  }
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      associatedHosts: e.target.value.split(',').map((s) => s.trim()),
                    })
                  }
                  placeholder="e.g. aistudio.google.com, chatgpt.com, *"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-[#10b981]"
                />
              </div>

              <div>
                <label className="block text-slate-400 text-[11px] font-semibold mb-1">Description</label>
                <textarea
                  rows={2}
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional usage notes..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-[#10b981]"
                />
              </div>

              <div>
                <label className="block text-slate-400 text-[11px] font-semibold mb-1">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  value={
                    Array.isArray(formData.tags)
                      ? formData.tags.join(', ')
                      : formData.tags || ''
                  }
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      tags: e.target.value.split(',').map((s) => s.trim()),
                    })
                  }
                  placeholder="ai, prod, billing"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-[#10b981]"
                />
              </div>
            </div>

            <div className="p-3 border-t border-slate-800 bg-slate-900/50 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false);
                  setEditingSecret(null);
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-[#10b981] hover:bg-[#10b981]/90 text-slate-950 font-bold text-xs shadow-md"
              >
                Save Secret
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Import .env Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b1220] border border-slate-800 rounded-2xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-[#10b981]" />
                <h3 className="text-sm font-bold text-white">Import from .env</h3>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded bg-slate-800"
              >
                Cancel
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs overflow-y-auto">
              <p className="text-slate-400">
                Paste the contents of your <code className="text-emerald-400 font-mono">.env</code> file below. Comments (<code className="text-slate-500 font-mono">#</code>) are automatically parsed.
              </p>

              <textarea
                rows={8}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder={'# Sample .env\nGEMINI_API_KEY="AIzaSy..."\nDATABASE_URL="postgres://..."\nPORT=3000'}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white font-mono text-xs focus:outline-none focus:border-[#10b981]"
              />

              <div className="flex items-center justify-between">
                <label className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer border border-slate-700 flex items-center gap-1.5 transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Choose File (.env)</span>
                  <input
                    type="file"
                    accept=".env,.env.*,text/plain"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (ev) => setImportText((ev.target?.result as string) || '');
                      reader.readAsText(file);
                    }}
                  />
                </label>
              </div>
            </div>

            <div className="p-3 border-t border-slate-800 bg-slate-900/50 flex justify-end gap-2">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleImportEnv}
                className="px-4 py-1.5 rounded-lg bg-[#10b981] hover:bg-[#10b981]/90 text-slate-950 font-bold text-xs shadow-md"
              >
                Import Variables
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b1220] border border-slate-800 rounded-2xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4 text-[#10b981]" />
                <h3 className="text-sm font-bold text-white">Export Secrets & Environment</h3>
              </div>
              <button
                onClick={() => setShowExportModal(false)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded bg-slate-800"
              >
                Close
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs overflow-y-auto">
              <div className="flex items-center gap-1.5">
                {[
                  { id: 'env', label: '.env File' },
                  { id: 'bash', label: 'Bash export' },
                  { id: 'json', label: 'JSON Backup' },
                  { id: 'mcp', label: 'MCP Config' },
                ].map((fmt) => (
                  <button
                    key={fmt.id}
                    onClick={() => setExportFormat(fmt.id as any)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                      exportFormat === fmt.id
                        ? 'bg-[#10b981] text-slate-950'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
                    }`}
                  >
                    {fmt.label}
                  </button>
                ))}
              </div>

              <pre className="bg-slate-950 p-3 rounded-lg text-emerald-400/90 font-mono text-[11px] overflow-x-auto border border-slate-800 max-h-56">
                {exportPayload}
              </pre>
            </div>

            <div className="p-3 border-t border-slate-800 bg-slate-900/50 flex justify-end gap-2">
              <button
                onClick={() => copyToClipboard(exportPayload, 'Export Payload')}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </button>
              <button
                onClick={handleDownloadExport}
                className="px-4 py-1.5 rounded-lg bg-[#10b981] hover:bg-[#10b981]/90 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download File</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Master Passphrase Config Modal */}
      {showPassphraseModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b1220] border border-slate-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#10b981]" />
                <h3 className="text-sm font-bold text-white">Vault Master Protection</h3>
              </div>
              <button
                onClick={() => setShowPassphraseModal(false)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded bg-slate-800"
              >
                Cancel
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <p className="text-slate-400">
                Set a master lock password to shield your secrets. When locked, values cannot be revealed or inspected without entering the password. Leave empty to disable master lock.
              </p>

              <div>
                <label className="block text-slate-400 text-[11px] font-semibold mb-1">Master Password</label>
                <input
                  type="password"
                  value={inputPassphrase}
                  onChange={(e) => setInputPassphrase(e.target.value)}
                  placeholder="Enter vault passphrase..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-[#10b981]"
                />
              </div>
            </div>

            <div className="p-3 border-t border-slate-800 bg-slate-900/50 flex justify-end gap-2">
              <button
                onClick={() => setShowPassphraseModal(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePassphrase}
                className="px-4 py-1.5 rounded-lg bg-[#10b981] hover:bg-[#10b981]/90 text-slate-950 font-bold text-xs shadow-md"
              >
                Save Protection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
