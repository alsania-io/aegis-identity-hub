import React, { useState, useMemo } from 'react';
import {
  Settings,
  Moon,
  Sun,
  Laptop,
  RefreshCw,
  Info,
  Cpu,
  KeyRound,
  Check,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ExternalLink,
  Shield,
  Workflow,
  Bot,
  Calendar,
  Zap,
  Search,
  Plus,
  Trash2,
  Copy,
  Sliders,
  Globe,
  Server,
  RotateCcw,
  Sparkles,
  Layers,
  Save,
  Clock,
  Edit2,
  X,
} from 'lucide-react';
import {
  AiModelItem,
  ModelAssignments,
  ModelCategory,
  ModelProviderConfig,
  ModelProviderId,
  ModelsState,
  Profile,
  SecretItem,
} from '../../types/identity';
import {
  DEFAULT_MODEL_PROVIDERS,
  PROVIDER_CATALOGUES,
  generateModelsForProviders,
  getDefaultModelsState,
  fetchLiveModelsFromProvider,
} from '../../lib/model-registry';
import { SearchableModelSelect } from './SearchableModelSelect';
import { SecretsTab } from './SecretsTab';
import { useToast } from './Toast';

interface SettingsTabProps {
  settings: {
    theme: 'system' | 'dark' | 'light' | 'glass';
    syncIntervalSeconds: number;
    autoInject: boolean;
    defaultModel?: string;
    temperature?: number;
  };
  modelsState?: ModelsState;
  profiles?: Profile[];
  activeProfileId?: string;
  secrets?: SecretItem[];
  onUpdate: (settings: any) => void;
  onUpdateModelsState?: (modelsState: ModelsState) => void;
  onUpdateProfiles?: (profiles: Profile[], activeId: string) => void;
  onUpdateSecrets?: (secrets: SecretItem[]) => void;
  availableTools?: Array<{ name: string }>;
  initialSection?: 'models' | 'roles' | 'catalogue' | 'general' | 'profiles' | 'secrets';
}

const PROVIDER_METADATA: Record<
  ModelProviderId,
  {
    name: string;
    icon: string;
    requiresApiKey: boolean;
    keyPlaceholder: string;
    docsUrl: string;
    keyConsoleUrl: string;
    category: string;
    description: string;
  }
> = {
  openrouter: {
    name: 'OpenRouter',
    icon: '🌐',
    requiresApiKey: true,
    keyPlaceholder: 'sk-or-v1-...',
    docsUrl: 'https://openrouter.ai/docs',
    keyConsoleUrl: 'https://openrouter.ai/keys',
    category: 'Gateway',
    description: '300+ frontier & open-weight models including Claude 3.5 Sonnet, GPT-4o, DeepSeek R1, Llama 3.3, and free pool.',
  },
  'kilo-code': {
    name: 'Kilo Code',
    icon: '⚡',
    requiresApiKey: true,
    keyPlaceholder: 'kilo-...',
    docsUrl: 'https://kilo.code/docs',
    keyConsoleUrl: 'https://kilo.code/account/api-keys',
    category: 'Specialized',
    description: 'Ultra-low-latency coding engine with Kilo Coder Pro, syntax repair, and fast EVM reasoning.',
  },
  bazaarlink: {
    name: 'BazaarLink',
    icon: '🔗',
    requiresApiKey: true,
    keyPlaceholder: 'bazaar-...',
    docsUrl: 'https://bazaarlink.com/docs',
    keyConsoleUrl: 'https://bazaarlink.com/dashboard/api-keys',
    category: 'Web3 & P2P',
    description: 'Decentralized P2P compute network and multi-agent coordination models.',
  },
  huggingface: {
    name: 'Hugging Face',
    icon: '🤗',
    requiresApiKey: true,
    keyPlaceholder: 'hf_...',
    docsUrl: 'https://huggingface.co/docs/api-inference',
    keyConsoleUrl: 'https://huggingface.co/settings/tokens',
    category: 'Open Weights',
    description: 'Serverless inference router with open-weight state-of-the-art models (DeepSeek, Llama, Qwen, Mistral).',
  },
  cohere: {
    name: 'Cohere',
    icon: '💬',
    requiresApiKey: true,
    keyPlaceholder: 'coh-...',
    docsUrl: 'https://docs.cohere.com',
    keyConsoleUrl: 'https://dashboard.cohere.com/api-keys',
    category: 'Enterprise',
    description: 'Command R+ reasoning, multilingual Aya Expanse, and high-efficiency enterprise RAG execution.',
  },
  local: {
    name: 'Localhost / Llama',
    icon: '💻',
    requiresApiKey: false,
    keyPlaceholder: 'Not required (runs offline on localhost)',
    docsUrl: 'https://ollama.com',
    keyConsoleUrl: 'https://ollama.com/download',
    category: 'Sovereign / Local',
    description: '100% private local inference (Ollama, LM Studio, LocalAI, vLLM). No external API key required.',
  },
  'openai-compatible': {
    name: 'OpenAI Compatible',
    icon: '🔌',
    requiresApiKey: false,
    keyPlaceholder: 'Optional or provider-specific key',
    docsUrl: 'https://platform.openai.com/docs/api-reference',
    keyConsoleUrl: '',
    category: 'Custom Proxy',
    description: 'Connect any OpenAI-compatible API endpoint (Groq, Together, Mistral, DeepInfra, self-hosted proxy).',
  },
  openai: {
    name: 'OpenAI Direct',
    icon: '🟢',
    requiresApiKey: true,
    keyPlaceholder: 'sk-...',
    docsUrl: 'https://platform.openai.com/docs',
    keyConsoleUrl: 'https://platform.openai.com/api-keys',
    category: 'Direct Cloud',
    description: 'Direct official OpenAI API access for GPT-4o, GPT-4o Mini, o1, and o3-mini models.',
  },
  anthropic: {
    name: 'Anthropic Direct',
    icon: '🟠',
    requiresApiKey: true,
    keyPlaceholder: 'sk-ant-...',
    docsUrl: 'https://docs.anthropic.com',
    keyConsoleUrl: 'https://console.anthropic.com/settings/keys',
    category: 'Direct Cloud',
    description: 'Direct official Claude API for Claude 3.7 Sonnet, Claude 3.5 Sonnet, and Haiku.',
  },
  gemini: {
    name: 'Google Gemini',
    icon: '🔵',
    requiresApiKey: true,
    keyPlaceholder: 'AIzaSy...',
    docsUrl: 'https://ai.google.dev/docs',
    keyConsoleUrl: 'https://aistudio.google.com/app/apikey',
    category: 'Direct Cloud',
    description: 'Direct official Google Gemini API for Gemini 2.5 Pro, Gemini 2.5 Flash, and Gemini 2.0.',
  },
};

export const SettingsTab: React.FC<SettingsTabProps> = ({
  settings,
  modelsState: initialModelsState,
  profiles = [],
  activeProfileId = '',
  secrets = [],
  onUpdate,
  onUpdateModelsState,
  onUpdateProfiles,
  onUpdateSecrets,
  availableTools = [],
  initialSection = 'models',
}) => {
  const toast = useToast();

  // Active section in settings
  const [activeSection, setActiveSection] = useState<'models' | 'roles' | 'catalogue' | 'general' | 'profiles' | 'secrets'>(
    initialSection
  );

  // Models State management
  const [modelsState, setModelsState] = useState<ModelsState>(() => {
    return initialModelsState || getDefaultModelsState();
  });

  // Selected provider in the provider setup view
  const [selectedProviderId, setSelectedProviderId] = useState<ModelProviderId>('openrouter');
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({});
  const [testingProviderId, setTestingProviderId] = useState<string | null>(null);

  // Model catalogue search & filters
  const [modelSearch, setModelSearch] = useState('');
  const [catalogueProviderFilter, setCatalogueProviderFilter] = useState<string>('all');
  const [copiedModelId, setCopiedModelId] = useState<string | null>(null);

  // Custom model modal
  const [isAddCustomOpen, setIsAddCustomOpen] = useState(false);
  const [customModelId, setCustomModelId] = useState('');
  const [customModelName, setCustomModelName] = useState('');
  const [customModelProvider, setCustomModelProvider] = useState<ModelProviderId>('local');
  const [customModelCategory, setCustomModelCategory] = useState<ModelCategory>('general');
  const [customModelContext, setCustomModelContext] = useState<number>(32768);

  // Profiles management states
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [editProfileName, setEditProfileName] = useState('');
  const [editProfileDesc, setEditProfileDesc] = useState('');
  const [showNewProfile, setShowNewProfile] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileDesc, setNewProfileDesc] = useState('');

  // Sync incoming state changes if needed
  React.useEffect(() => {
    if (initialModelsState) {
      setModelsState(initialModelsState);
    }
  }, [initialModelsState]);

  // Save models state helper
  const commitModelsState = (newState: ModelsState) => {
    setModelsState(newState);
    if (onUpdateModelsState) {
      onUpdateModelsState(newState);
    }
  };

  // Toggle Provider Enablement & Auto-Regenerate Models
  const handleToggleProvider = (providerId: ModelProviderId, enabled: boolean) => {
    const currentProvider = modelsState.providers[providerId] || DEFAULT_MODEL_PROVIDERS[providerId];
    const updatedProvider: ModelProviderConfig = {
      ...currentProvider,
      enabled,
    };

    const newProviders = {
      ...modelsState.providers,
      [providerId]: updatedProvider,
    };

    // Recalculate selected provider IDs
    const newSelectedProviderIds: ModelProviderId[] = Object.keys(newProviders).filter(
      (id) => newProviders[id as ModelProviderId]?.enabled
    ) as ModelProviderId[];

    // Retain custom models that user manually added
    const customModels = (modelsState.models || []).filter((m) => m.isCustom);
    const regeneratedModels = generateModelsForProviders(newSelectedProviderIds);
    const combinedModels = [...regeneratedModels, ...customModels];

    // Check if role assignments need graceful fallback
    const availableModelIds = new Set(combinedModels.map((m) => m.id));
    const firstAvailable = combinedModels[0]?.id || 'openrouter/free';
    const updatedAssignments: ModelAssignments = {
      defaultModel: availableModelIds.has(modelsState.assignments.defaultModel)
        ? modelsState.assignments.defaultModel
        : firstAvailable,
      swarmOrchestratorModel: availableModelIds.has(modelsState.assignments.swarmOrchestratorModel)
        ? modelsState.assignments.swarmOrchestratorModel
        : firstAvailable,
      swarmWorkerModel: availableModelIds.has(modelsState.assignments.swarmWorkerModel)
        ? modelsState.assignments.swarmWorkerModel
        : firstAvailable,
      cronTasksDefaultModel: availableModelIds.has(modelsState.assignments.cronTasksDefaultModel)
        ? modelsState.assignments.cronTasksDefaultModel
        : firstAvailable,
      agentDefaultModel: availableModelIds.has(modelsState.assignments.agentDefaultModel)
        ? modelsState.assignments.agentDefaultModel
        : firstAvailable,
      agentFallbackModel: availableModelIds.has(modelsState.assignments.agentFallbackModel)
        ? modelsState.assignments.agentFallbackModel
        : firstAvailable,
    };

    const updatedState: ModelsState = {
      ...modelsState,
      providers: newProviders,
      selectedProviderIds: newSelectedProviderIds,
      models: combinedModels,
      assignments: updatedAssignments,
      lastGeneratedAt: new Date().toISOString(),
    };

    commitModelsState(updatedState);

    const providerName = PROVIDER_METADATA[providerId]?.name || providerId;
    if (enabled) {
      const addedCount = (PROVIDER_CATALOGUES[providerId] || []).length;
      toast.success(
        `${providerName} Enabled`,
        `Unlocked ${addedCount} models. Now available for all agents and swarm tasks.`
      );
    } else {
      toast.info(`${providerName} Disabled`, 'Models from this provider have been removed from active selection.');
    }
  };

  // Update Provider Config (API Key, Base URL, etc.)
  const handleUpdateProviderConfig = (
    providerId: ModelProviderId,
    fieldUpdates: Partial<ModelProviderConfig>
  ) => {
    const currentProvider = modelsState.providers[providerId] || DEFAULT_MODEL_PROVIDERS[providerId];
    const updatedProvider: ModelProviderConfig = {
      ...currentProvider,
      ...fieldUpdates,
    };

    const newProviders = {
      ...modelsState.providers,
      [providerId]: updatedProvider,
    };

    const updatedState: ModelsState = {
      ...modelsState,
      providers: newProviders,
      lastGeneratedAt: new Date().toISOString(),
    };

    commitModelsState(updatedState);
  };

  // Save API Key explicit action
  const handleSaveApiKey = (providerId: ModelProviderId, apiKey: string) => {
    handleUpdateProviderConfig(providerId, { apiKey: apiKey.trim() });
    const providerName = PROVIDER_METADATA[providerId]?.name || providerId;
    toast.success(
      'API Key Saved',
      `${providerName} API credentials saved. Models are ready for agent generation.`
    );
  };

  // Test Provider Live Connection
  const handleTestProvider = async (providerId: ModelProviderId) => {
    const provider = modelsState.providers[providerId] || DEFAULT_MODEL_PROVIDERS[providerId];
    setTestingProviderId(providerId);

    try {
      const result = await fetchLiveModelsFromProvider(provider);
      if (result.success) {
        toast.success(
          'Connection Successful',
          `Connected to ${provider.name}. Verified ${result.models.length} active models.`
        );
      } else {
        toast.warning(
          'Using Curated Catalog',
          result.error || 'Loaded verified models from local catalogue.'
        );
      }
    } catch (e: any) {
      toast.error('Connection Test Failed', e?.message || 'Could not connect to provider endpoint.');
    } finally {
      setTestingProviderId(null);
    }
  };

  // Role Assignment Update
  const handleAssignmentChange = (roleKey: keyof ModelAssignments, modelId: string) => {
    const newAssignments: ModelAssignments = {
      ...modelsState.assignments,
      [roleKey]: modelId,
    };

    const updatedState: ModelsState = {
      ...modelsState,
      assignments: newAssignments,
    };

    commitModelsState(updatedState);
    toast.success('Assignment Updated', `Assigned ${modelId} to ${roleKey}`);
  };

  // Add Custom Model
  const handleAddCustomModel = () => {
    if (!customModelId.trim()) return;

    const provider = modelsState.providers[customModelProvider] || DEFAULT_MODEL_PROVIDERS[customModelProvider];
    const formattedId = customModelId.includes('/')
      ? customModelId.trim()
      : `${customModelProvider}/${customModelId.trim()}`;

    const newModel: AiModelItem = {
      id: formattedId,
      rawId: customModelId.trim(),
      name: customModelName.trim() || customModelId.trim(),
      providerId: customModelProvider,
      providerName: provider.name,
      description: `Custom model added for ${provider.name}`,
      contextWindow: customModelContext,
      category: customModelCategory,
      isCustom: true,
      pricingType: customModelProvider === 'local' ? 'local' : 'paid',
      tags: ['custom', customModelCategory],
    };

    const updatedModels = [newModel, ...(modelsState.models || [])];
    const updatedState: ModelsState = {
      ...modelsState,
      models: updatedModels,
    };

    commitModelsState(updatedState);
    setIsAddCustomOpen(false);
    setCustomModelId('');
    setCustomModelName('');
    toast.success('Custom Model Added', `Model "${newModel.name}" is now available across all roles.`);
  };

  // Copy Model ID
  const handleCopyModelId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedModelId(id);
    setTimeout(() => setCopiedModelId(null), 2000);
    toast.info('Model ID Copied', id);
  };

  // Filtered models for catalogue
  const filteredModels = useMemo(() => {
    return (modelsState.models || []).filter((m) => {
      const matchesSearch =
        m.name.toLowerCase().includes(modelSearch.toLowerCase()) ||
        m.id.toLowerCase().includes(modelSearch.toLowerCase()) ||
        m.rawId.toLowerCase().includes(modelSearch.toLowerCase()) ||
        m.providerName.toLowerCase().includes(modelSearch.toLowerCase());

      const matchesProvider =
        catalogueProviderFilter === 'all' || m.providerId === catalogueProviderFilter;

      return matchesSearch && matchesProvider;
    });
  }, [modelsState.models, modelSearch, catalogueProviderFilter]);

  // Active providers count
  const activeProvidersCount = useMemo(() => {
    return Object.values(modelsState.providers).filter((p) => p.enabled).length;
  }, [modelsState.providers]);

  // Theme presets
  const themes: Array<{ value: 'system' | 'dark' | 'light' | 'glass'; icon: React.ReactNode; label: string }> = [
    { value: 'system', icon: <Laptop className="w-4 h-4" />, label: 'System' },
    { value: 'dark', icon: <Moon className="w-4 h-4" />, label: 'Dark' },
    { value: 'light', icon: <Sun className="w-4 h-4" />, label: 'Light' },
    { value: 'glass', icon: <Settings className="w-4 h-4" />, label: 'Glass' },
  ];

  // Selected provider details
  const selectedProviderConfig =
    modelsState.providers[selectedProviderId] || DEFAULT_MODEL_PROVIDERS[selectedProviderId];
  const selectedMeta = PROVIDER_METADATA[selectedProviderId];

  return (
    <div className="space-y-6 pb-16 md:pb-6 animate-in fade-in duration-200">
      {/* Settings Top Header */}
      <div className="flex flex-col flex-col items-start justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div>
          <h2 className="text-xl font-bold text-[#10b981] flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#10b981]" /> Settings & AI Providers
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure AI model providers, API keys, role assignments, and workspace preferences.
          </p>
        </div>

        {/* Global Model Count Indicator */}
        <div className="flex items-center gap-2">
          <div className="px-3 py-1 rounded-xl bg-[#10b981]/15 border border-[#10b981]/30 flex items-center gap-1.5 text-xs text-[#10b981] font-medium">
            <Cpu className="w-3.5 h-3.5" />
            <span>{modelsState.models?.length || 0} Models Available</span>
          </div>
          <div className="px-3 py-1 rounded-xl bg-slate-800 border border-slate-700 flex items-center gap-1.5 text-xs text-slate-300">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>{activeProvidersCount} Providers Active</span>
          </div>
        </div>
      </div>

      {/* Settings Navigation Sub-Tabs */}
      <div className="flex items-center gap-1.5 flex-wrap pb-1 scrollbar-none border-b border-slate-800/60">
        <button
          onClick={() => setActiveSection('models')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap min-h-[40px] ${
            activeSection === 'models'
              ? 'bg-[#10b981] text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
              : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
          }`}
        >
          <Cpu className="w-4 h-4" /> AI Model Providers & Keys
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              activeSection === 'models' ? 'bg-slate-950/30 text-slate-950' : 'bg-[#10b981]/20 text-[#10b981]'
            }`}
          >
            {activeProvidersCount}
          </span>
        </button>

        <button
          onClick={() => setActiveSection('roles')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap min-h-[40px] ${
            activeSection === 'roles'
              ? 'bg-[#10b981] text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
              : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
          }`}
        >
          <Workflow className="w-4 h-4" /> Role Model Assignments
        </button>

        <button
          onClick={() => setActiveSection('catalogue')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap min-h-[40px] ${
            activeSection === 'catalogue'
              ? 'bg-[#10b981] text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
              : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" /> Available Models ({modelsState.models?.length || 0})
        </button>

        <button
          onClick={() => setActiveSection('secrets')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap min-h-[40px] ${
            activeSection === 'secrets'
              ? 'bg-[#10b981] text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
              : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
          }`}
        >
          <KeyRound className="w-4 h-4" /> Secrets & Keys ({secrets.length})
        </button>

        <button
          onClick={() => setActiveSection('general')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap min-h-[40px] ${
            activeSection === 'general'
              ? 'bg-[#10b981] text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
              : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
          }`}
        >
          <Sliders className="w-4 h-4" /> Appearance & Sync
        </button>

        {profiles && profiles.length > 0 && (
          <button
            onClick={() => setActiveSection('profiles')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap min-h-[40px] ${
              activeSection === 'profiles'
                ? 'bg-[#10b981] text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
            }`}
          >
            <Bot className="w-4 h-4" /> Profiles ({profiles.length})
          </button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: AI MODEL PROVIDERS & KEYS (MAIN USER REQUEST)                   */}
      {/* ========================================================================= */}
      {activeSection === 'models' && (
        <div className="space-y-6">
          {/* Explanation Banner */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex items-start gap-3 shadow-lg">
            <Info className="w-5 h-5 text-[#10b981] mt-0.5 flex-shrink-0" />
            <div className="text-xs text-slate-300 space-y-1">
              <p className="font-semibold text-slate-100">
                AI Model Providers & Dynamic Auto-Discovery
              </p>
              <p className="text-slate-400 leading-relaxed">
                Choose an AI provider below, enable it, and provide its API key if required. As soon as a provider is enabled,
                <strong className="text-[#10b981] font-medium"> all of that provider's models are immediately unlocked</strong> and available to choose from for whatever agent, swarm worker, or cron role you set up!
              </p>
            </div>
          </div>

          {/* Providers Grid / Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              1. Select an AI Provider ({Object.keys(PROVIDER_METADATA).length} Supported)
            </label>

            <div className="grid grid-cols-1 grid-cols-1 grid-cols-1 grid-cols-1 gap-3">
              {(Object.keys(PROVIDER_METADATA) as ModelProviderId[]).map((provId) => {
                const meta = PROVIDER_METADATA[provId];
                const conf = modelsState.providers[provId] || DEFAULT_MODEL_PROVIDERS[provId];
                const isSelected = selectedProviderId === provId;
                const modelCount = (PROVIDER_CATALOGUES[provId] || []).length;
                const hasKey = Boolean(conf.apiKey && conf.apiKey.trim());

                return (
                  <button
                    key={provId}
                    onClick={() => setSelectedProviderId(provId)}
                    className={`text-left p-3.5 rounded-2xl border transition-all relative flex flex-col justify-between min-h-[110px] ${
                      isSelected
                        ? 'bg-[#10b981]/10 border-[#10b981] shadow-[0_0_20px_rgba(16,185,129,0.15)] ring-1 ring-[#10b981]/40'
                        : conf.enabled
                        ? 'bg-slate-900 border-slate-700 hover:border-slate-600'
                        : 'bg-slate-950/60 border-slate-800/80 opacity-75 hover:opacity-100 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xl">{meta.icon}</span>
                        {conf.enabled ? (
                          <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" /> Active
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                            Disabled
                          </span>
                        )}
                      </div>

                      <div className="font-bold text-xs text-slate-100">{meta.name}</div>
                      <div className="text-[10px] text-slate-400 line-clamp-1">{meta.category}</div>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 mt-2 flex items-center justify-between text-[10px]">
                      <span className="text-slate-500">{modelCount} models</span>
                      {meta.requiresApiKey ? (
                        hasKey ? (
                          <span className="text-emerald-400 flex items-center gap-0.5 font-medium">
                            <Check className="w-3 h-3" /> Key saved
                          </span>
                        ) : (
                          <span className="text-amber-400 flex items-center gap-0.5">
                            <KeyRound className="w-3 h-3" /> Key needed
                          </span>
                        )
                      ) : (
                        <span className="text-cyan-400 font-medium">Offline / Free</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Provider Configuration Panel */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-6 shadow-xl">
            {/* Provider Header & Quick Toggle */}
            <div className="flex flex-col flex-col items-start justify-between gap-4 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-2xl shadow-inner">
                  {selectedMeta.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-bold text-slate-100">{selectedMeta.name}</h3>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-mono">
                      {selectedProviderId}
                    </span>
                    {selectedMeta.requiresApiKey ? (
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center gap-1">
                        <KeyRound className="w-3 h-3" /> API Key Required
                      </span>
                    ) : (
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center gap-1">
                        <Shield className="w-3 h-3" /> No API Key Required (Local / Offline)
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{selectedMeta.description}</p>
                </div>
              </div>

              {/* Enable / Disable Button */}
              <div className="flex items-center gap-3 self-start sm:self-auto">
                <button
                  onClick={() =>
                    handleToggleProvider(selectedProviderId, !selectedProviderConfig.enabled)
                  }
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 min-h-[44px] ${
                    selectedProviderConfig.enabled
                      ? 'bg-red-500/15 border border-red-500/40 text-red-400 hover:bg-red-500/25'
                      : 'bg-[#10b981] text-slate-950 hover:bg-[#10b981]/90 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                  }`}
                >
                  {selectedProviderConfig.enabled ? (
                    <>
                      <X className="w-4 h-4" /> Disable Provider
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" /> Enable Provider & Unlock Models
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Provider Configuration Fields */}
            <div className="grid grid-cols-1 grid-cols-1 gap-6">
              {/* Left Column: API Key & Endpoint */}
              <div className="space-y-4">
                {/* API Key Input */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-[#10b981]" />
                      Provider API Key
                      {selectedMeta.requiresApiKey && (
                        <span className="text-red-400 font-bold">*</span>
                      )}
                    </label>

                    {selectedMeta.keyConsoleUrl && (
                      <a
                        href={selectedMeta.keyConsoleUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-[#10b981] hover:underline flex items-center gap-1"
                      >
                        Get API Key <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  <div className="relative">
                    <input
                      type={showApiKey[selectedProviderId] ? 'text' : 'password'}
                      value={selectedProviderConfig.apiKey || ''}
                      onChange={(e) =>
                        handleUpdateProviderConfig(selectedProviderId, { apiKey: e.target.value })
                      }
                      placeholder={selectedMeta.keyPlaceholder}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 pr-20 text-xs text-slate-200 font-mono focus:outline-none focus:border-[#10b981] min-h-[44px]"
                    />
                    <div className="absolute right-2 top-2 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          setShowApiKey((prev) => ({
                            ...prev,
                            [selectedProviderId]: !prev[selectedProviderId],
                          }))
                        }
                        className="p-1 text-slate-400 hover:text-slate-200"
                        title={showApiKey[selectedProviderId] ? 'Hide Key' : 'Show Key'}
                      >
                        {showApiKey[selectedProviderId] ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleSaveApiKey(selectedProviderId, selectedProviderConfig.apiKey || '')
                        }
                        className="px-2 py-1 bg-[#10b981]/20 hover:bg-[#10b981]/30 text-[#10b981] text-[10px] font-bold rounded-lg border border-[#10b981]/30 transition-colors"
                      >
                        Save
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 mt-1">
                    {selectedMeta.requiresApiKey
                      ? 'Credentials are saved locally in encrypted storage and never sent to external tracking servers.'
                      : 'No key is needed. This runs on your local machine with complete data sovereignty.'}
                  </p>
                </div>

                {/* Base URL Endpoint Input */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Server className="w-3.5 h-3.5 text-[#10b981]" />
                    Endpoint Base URL
                  </label>
                  <input
                    type="text"
                    value={selectedProviderConfig.baseUrl || selectedProviderConfig.defaultEndpoint}
                    onChange={(e) =>
                      handleUpdateProviderConfig(selectedProviderId, { baseUrl: e.target.value })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-[#10b981] min-h-[44px]"
                  />

                  {/* Quick Presets for Localhost */}
                  {selectedProviderId === 'local' && (
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="text-[10px] text-slate-500">Presets:</span>
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateProviderConfig('local', { baseUrl: 'http://localhost:11434/v1' })
                        }
                        className="text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-mono"
                      >
                        Ollama (11434)
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateProviderConfig('local', { baseUrl: 'http://localhost:1234/v1' })
                        }
                        className="text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-mono"
                      >
                        LM Studio (1234)
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateProviderConfig('local', { baseUrl: 'http://localhost:8080/v1' })
                        }
                        className="text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-mono"
                      >
                        LocalAI (8080)
                      </button>
                    </div>
                  )}
                </div>

                {/* Live Test Button */}
                <div className="pt-1 flex items-center gap-3">
                  <button
                    type="button"
                    disabled={testingProviderId === selectedProviderId}
                    onClick={() => handleTestProvider(selectedProviderId)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-semibold text-slate-200 flex items-center gap-2 transition-all min-h-[40px]"
                  >
                    {testingProviderId === selectedProviderId ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#10b981]" />
                        Testing Connection...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-[#10b981]" />
                        Test Connection & Verify Models
                      </>
                    )}
                  </button>

                  {selectedMeta.docsUrl && (
                    <a
                      href={selectedMeta.docsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
                    >
                      Documentation <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>

              {/* Right Column: Models Provided by this Provider */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-[#10b981]" /> Models Provided by {selectedMeta.name}
                  </h4>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {(PROVIDER_CATALOGUES[selectedProviderId] || []).length} models in catalogue
                  </span>
                </div>

                <p className="text-[11px] text-slate-400">
                  Enabling this provider makes the following models immediately selectable in your Agents tab,
                  Swarm task dispatcher, and cron orchestrator:
                </p>

                <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                  {(PROVIDER_CATALOGUES[selectedProviderId] || []).map((model) => (
                    <div
                      key={model.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800/80 text-xs"
                    >
                      <div>
                        <div className="font-semibold text-slate-200">{model.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{model.rawId}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                          {model.category}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyModelId(model.id)}
                          className="p-1 text-slate-500 hover:text-slate-300"
                          title="Copy model ID"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-2 text-[10px] text-[#10b981] flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {selectedProviderConfig.enabled
                    ? 'Currently active in your agent models pool.'
                    : 'Click "Enable Provider" above to activate these models.'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: ROLE MODEL ASSIGNMENTS                                         */}
      {/* ========================================================================= */}
      {activeSection === 'roles' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-6 shadow-xl">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Workflow className="w-5 h-5 text-[#10b981]" /> Role Model Assignments
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Select which model powers each agentic subsystem across the workspace. Dropdowns only list models from
              your currently enabled providers.
            </p>
          </div>

          <div className="grid grid-cols-1 grid-cols-1 gap-5">
            {/* System Default Model */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-cyan-400" /> Default System Model
                </label>
                <span className="text-[10px] text-slate-500">General prompts & fallback</span>
              </div>
              <SearchableModelSelect
                value={modelsState.assignments.defaultModel}
                onChange={(val) => handleAssignmentChange('defaultModel', val)}
                models={modelsState.models || []}
                placeholder="Search and select default system model..."
              />
            </div>

            {/* Swarm Orchestrator */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" /> Swarm Orchestrator Model
                </label>
                <span className="text-[10px] text-slate-500">Task breakdown & coordinator</span>
              </div>
              <SearchableModelSelect
                value={modelsState.assignments.swarmOrchestratorModel}
                onChange={(val) => handleAssignmentChange('swarmOrchestratorModel', val)}
                models={modelsState.models || []}
                placeholder="Search and select orchestrator model..."
              />
            </div>

            {/* Swarm Worker */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Bot className="w-3.5 h-3.5 text-emerald-400" /> Swarm Immediate Worker Model
                </label>
                <span className="text-[10px] text-slate-500">Immediate queue tasks execution</span>
              </div>
              <SearchableModelSelect
                value={modelsState.assignments.swarmWorkerModel}
                onChange={(val) => handleAssignmentChange('swarmWorkerModel', val)}
                models={modelsState.models || []}
                placeholder="Search and select worker model..."
              />
            </div>

            {/* Cron Tasks Default Model */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-purple-400" /> Cron Tasks Default Model
                </label>
                <span className="text-[10px] text-slate-500">Automated scheduled executions</span>
              </div>
              <SearchableModelSelect
                value={modelsState.assignments.cronTasksDefaultModel}
                onChange={(val) => handleAssignmentChange('cronTasksDefaultModel', val)}
                models={modelsState.models || []}
                placeholder="Search and select cron task model..."
              />
            </div>

            {/* Custom Agents Primary */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Bot className="w-3.5 h-3.5 text-[#10b981]" /> Custom Agents Primary Default
                </label>
                <span className="text-[10px] text-slate-500">Preset for newly spawned agents</span>
              </div>
              <SearchableModelSelect
                value={modelsState.assignments.agentDefaultModel}
                onChange={(val) => handleAssignmentChange('agentDefaultModel', val)}
                models={modelsState.models || []}
                placeholder="Search and select custom agent default..."
              />
            </div>

            {/* Custom Agents Fallback */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5 text-rose-400" /> Custom Agents Fallback Model
                </label>
                <span className="text-[10px] text-slate-500">Resilient failover if primary errors</span>
              </div>
              <SearchableModelSelect
                value={modelsState.assignments.agentFallbackModel}
                onChange={(val) => handleAssignmentChange('agentFallbackModel', val)}
                models={modelsState.models || []}
                placeholder="Search and select custom agent fallback..."
              />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3: AVAILABLE MODELS CATALOGUE                                     */}
      {/* ========================================================================= */}
      {activeSection === 'catalogue' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-5 shadow-xl">
          <div className="flex flex-col flex-col items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#10b981]" /> Available Models Catalogue
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Browse all {modelsState.models?.length || 0} models generated from your active providers, or register
                custom model IDs.
              </p>
            </div>

            <button
              onClick={() => setIsAddCustomOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-[#10b981]/20 text-[#10b981] hover:bg-[#10b981]/30 rounded-xl text-xs font-bold border border-[#10b981]/40 transition-colors min-h-[40px] self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" /> Add Custom Model
            </button>
          </div>

          {/* Search & Provider Filter Bar */}
          <div className="flex flex-col flex-col items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={modelSearch}
                onChange={(e) => setModelSearch(e.target.value)}
                placeholder="Search models by name, raw ID, or provider..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-[#10b981] min-h-[40px]"
              />
            </div>

            <select
              value={catalogueProviderFilter}
              onChange={(e) => setCatalogueProviderFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-[#10b981] min-h-[40px] w-full w-full"
            >
              <option value="all">All Active Providers</option>
              {Object.keys(PROVIDER_METADATA).map((id) => (
                <option key={id} value={id}>
                  {PROVIDER_METADATA[id as ModelProviderId]?.name}
                </option>
              ))}
            </select>
          </div>

          {/* Models Grid */}
          <div className="grid grid-cols-1 grid-cols-1 grid-cols-1 gap-3 max-h-[500px] overflow-y-auto pr-1">
            {filteredModels.length === 0 ? (
              <div className="col-span-full text-center py-10 text-xs text-slate-500">
                No models match your filter. Enable more providers in the "AI Model Providers" tab.
              </div>
            ) : (
              filteredModels.map((model) => (
                <div
                  key={model.id}
                  className="bg-slate-950/70 border border-slate-800/90 hover:border-slate-700 rounded-xl p-3.5 space-y-2.5 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-xs text-slate-100">{model.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono truncate max-w-[200px]">
                        {model.rawId}
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-medium whitespace-nowrap">
                      {model.providerName}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 line-clamp-2">{model.description}</p>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-2 text-slate-500">
                      <span>{model.category}</span>
                      {model.contextWindow && (
                        <span>• {Math.round(model.contextWindow / 1024)}k ctx</span>
                      )}
                    </div>
                    <button
                      onClick={() => handleCopyModelId(model.id)}
                      className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      {copiedModelId === model.id ? (
                        <>
                          <Check className="w-3 h-3 text-[#10b981]" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" /> Copy ID
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 4: APPEARANCE & GENERAL SETTINGS                                  */}
      {/* ========================================================================= */}
      {activeSection === 'general' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-6 shadow-xl">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-[#10b981]" /> Appearance & System Preferences
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Customize UI themes, sync frequency, and system behavior.</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">Theme</label>
            <div className="grid grid-cols-1 grid-cols-1 gap-2">
              {themes.map((t) => (
                <button
                  key={t.value}
                  onClick={() => onUpdate({ ...settings, theme: t.value })}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-medium border transition-all min-h-[44px] ${
                    settings.theme === t.value
                      ? 'bg-[#10b981]/20 border-[#10b981] text-[#10b981] shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 grid-cols-1 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Sync Interval (seconds)
              </label>
              <input
                type="number"
                value={settings.syncIntervalSeconds}
                onChange={(e) => onUpdate({ ...settings, syncIntervalSeconds: Number(e.target.value) })}
                min={5}
                max={300}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-200 focus:border-[#10b981] focus:outline-none min-h-[44px]"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                How often to sync encrypted state with the background sovereign storage.
              </p>
            </div>

            <div className="flex items-center">
              <label className="flex items-center gap-3 text-xs text-slate-300 py-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.autoInject}
                  onChange={(e) => onUpdate({ ...settings, autoInject: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-[#10b981] focus:ring-[#10b981]"
                />
                Auto-inject system instructions into LLM context
              </label>
            </div>
          </div>

          {/* System Status Overview */}
          <div className="border-t border-slate-800 pt-4">
            <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mb-2">
              <RefreshCw className="w-3.5 h-3.5 text-[#10b981]" /> System Status
            </h4>
            <div className="grid grid-cols-1 grid-cols-1 gap-2 text-xs text-slate-400">
              <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                <span className="text-slate-500 text-[10px] block">App Version</span>
                <span className="font-semibold text-slate-200">v3.0.0 Sovereign</span>
              </div>
              <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                <span className="text-slate-500 text-[10px] block">Available Tools</span>
                <span className="font-semibold text-slate-200">{availableTools.length} connected</span>
              </div>
              <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                <span className="text-slate-500 text-[10px] block">Active Providers</span>
                <span className="font-semibold text-slate-200">{activeProvidersCount} enabled</span>
              </div>
              <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                <span className="text-slate-500 text-[10px] block">Total Models</span>
                <span className="font-semibold text-[#10b981]">
                  {modelsState.models?.length || 0} ready
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 5: PROFILES                                                       */}
      {/* ========================================================================= */}
      {activeSection === 'profiles' && profiles && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-5 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Bot className="w-5 h-5 text-[#10b981]" /> Identity Profiles
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Switch or manage environment profiles.</p>
            </div>
            <button
              onClick={() => setShowNewProfile(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-[#10b981]/20 text-[#10b981] hover:bg-[#10b981]/30 rounded-xl text-xs font-bold border border-[#10b981]/40 transition-colors min-h-[40px]"
            >
              <Plus className="w-4 h-4" /> New Profile
            </button>
          </div>

          {showNewProfile && (
            <div className="bg-slate-950/80 border border-[#10b981]/40 rounded-xl p-4 space-y-3">
              <input
                type="text"
                placeholder="Profile name"
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-[#10b981] min-h-[44px]"
              />
              <input
                type="text"
                placeholder="Description (optional)"
                value={newProfileDesc}
                onChange={(e) => setNewProfileDesc(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-[#10b981] min-h-[44px]"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (!newProfileName.trim() || !onUpdateProfiles) return;
                    const newProfile: Profile = {
                      id: `profile-${Date.now()}`,
                      name: newProfileName.trim(),
                      description: newProfileDesc.trim() || undefined,
                      settings: {
                        theme: 'system',
                        syncIntervalSeconds: 10,
                        autoInject: true,
                        defaultModel: modelsState.assignments.defaultModel,
                        temperature: 0.7,
                      },
                      enabledTools: [],
                      customInstructions: '',
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                    };
                    onUpdateProfiles([...profiles, newProfile], newProfile.id);
                    setShowNewProfile(false);
                    setNewProfileName('');
                    setNewProfileDesc('');
                    toast.success('Profile Created', newProfile.name);
                  }}
                  className="px-4 py-2 bg-[#10b981]/20 text-[#10b981] rounded-xl text-xs font-bold border border-[#10b981]/40 min-h-[40px]"
                >
                  <Save className="w-4 h-4 inline mr-1" /> Create
                </button>
                <button
                  onClick={() => setShowNewProfile(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-400 hover:text-slate-200 rounded-xl text-xs min-h-[40px]"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3">
            {profiles.map((p) => {
              const isActive = p.id === activeProfileId;
              return (
                <div
                  key={p.id}
                  className={`flex items-center justify-between p-3.5 rounded-xl border transition-colors ${
                    isActive
                      ? 'bg-[#10b981]/10 border-[#10b981]/50'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-100">{p.name}</span>
                      {isActive && (
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-[#10b981]/20 text-[#10b981]">
                          Active
                        </span>
                      )}
                    </div>
                    {p.description && (
                      <p className="text-[11px] text-slate-400 mt-0.5">{p.description}</p>
                    )}
                  </div>

                  {!isActive && onUpdateProfiles && (
                    <button
                      onClick={() => onUpdateProfiles(profiles, p.id)}
                      className="px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors min-h-[36px]"
                    >
                      Activate
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION: SECRETS & KEYS (MOVED TO SETTINGS)                                */}
      {/* ========================================================================= */}
      {activeSection === 'secrets' && (
        <div className="space-y-4">
          <SecretsTab
            secrets={secrets}
            onUpdate={(newSecrets) => onUpdateSecrets?.(newSecrets)}
          />
        </div>
      )}

      {/* Add Custom Model Modal */}
      {isAddCustomOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="font-bold text-slate-100 flex items-center gap-2 text-sm">
                <Plus className="w-4 h-4 text-[#10b981]" /> Add Custom Model
              </h4>
              <button
                onClick={() => setIsAddCustomOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-300 mb-1">Provider</label>
                <select
                  value={customModelProvider}
                  onChange={(e) => setCustomModelProvider(e.target.value as ModelProviderId)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-[#10b981]"
                >
                  {Object.keys(PROVIDER_METADATA).map((id) => (
                    <option key={id} value={id}>
                      {PROVIDER_METADATA[id as ModelProviderId]?.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">Model ID (Raw)</label>
                <input
                  type="text"
                  placeholder="e.g. llama3.3:70b-instruct or claude-3-7-sonnet"
                  value={customModelId}
                  onChange={(e) => setCustomModelId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-[#10b981]"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">Display Name (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Llama 3.3 70B Instruct"
                  value={customModelName}
                  onChange={(e) => setCustomModelName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-[#10b981]"
                />
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Category</label>
                  <select
                    value={customModelCategory}
                    onChange={(e) => setCustomModelCategory(e.target.value as ModelCategory)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-xs text-slate-200 focus:outline-none focus:border-[#10b981]"
                  >
                    <option value="general">General</option>
                    <option value="code">Code</option>
                    <option value="reasoning">Reasoning</option>
                    <option value="fast">Fast</option>
                    <option value="local">Local</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Context Window</label>
                  <input
                    type="number"
                    value={customModelContext}
                    onChange={(e) => setCustomModelContext(Number(e.target.value))}
                    step={1024}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-[#10b981]"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsAddCustomOpen(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCustomModel}
                disabled={!customModelId.trim()}
                className="px-4 py-2 bg-[#10b981] text-slate-950 rounded-xl text-xs font-bold hover:bg-[#10b981]/90 disabled:opacity-50"
              >
                Register Model
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
