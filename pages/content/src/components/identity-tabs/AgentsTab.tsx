import React, { useState, useMemo } from 'react';
import {
  Bot,
  Search,
  Plus,
  Shield,
  ShieldCheck,
  Zap,
  Activity,
  CheckCircle2,
  AlertCircle,
  Clock,
  Play,
  Copy,
  Check,
  Edit3,
  Trash2,
  Download,
  Upload,
  RotateCcw,
  Sparkles,
  Layers,
  Terminal,
  Cpu,
  RefreshCw,
  Eye,
  ChevronDown,
  ChevronUp,
  X,
  Sliders,
  Flame,
  FileCode,
  Globe,
  Radio,
  Send,
  Laptop,
  Compass,
  ArrowUpRight,
} from 'lucide-react';
import {
  AgentItem,
  AgentSkill,
  AgentStatus,
  AiModelItem,
  BrowserTabTarget,
  DispatchTargetRoute,
  MemoryPrecedence,
  ModelAssignments,
  ModelsState,
  Prompt,
  SovereigntyLevel,
  defaultAgents,
} from '../../types/identity';
import {
  detectRouteStatus,
  routeAndDispatch,
  RouteStatus,
  ModelDispatchResponse,
} from '../../lib/model-dispatcher';
import { checkAgentIntegrity, type IntegrityReport } from '../../lib/agent-integrity';
import { SearchableModelSelect } from './SearchableModelSelect';
import { SearchablePromptSelect } from './SearchablePromptSelect';
import { EnhanceWithAiButton } from './EnhanceWithAiButton';
import { withBrowserModels } from '../../lib/browser-models';
import { useToast } from './Toast';

interface AgentsTabProps {
  agents: AgentItem[];
  skills?: AgentSkill[];
  models?: AiModelItem[];
  modelAssignments?: ModelAssignments;
  modelsState?: ModelsState;
  prompts?: Prompt[];
  onUpdate: (agents: AgentItem[]) => void;
}

const MODEL_PRESETS = [
  { label: 'Claude 3.5 Sonnet (Anthropic)', value: 'anthropic/claude-3-5-sonnet' },
  { label: 'GPT-4o (OpenAI)', value: 'openai/gpt-4o' },
  { label: 'GPT-4o Mini (OpenAI)', value: 'openai/gpt-4o-mini' },
  { label: 'Gemini 2.5 Flash (Google)', value: 'google/gemini-2.5-flash' },
  { label: 'DeepSeek V3 (DeepSeek)', value: 'deepseek/deepseek-chat' },
  { label: 'OpenRouter Free Pool', value: 'openrouter/free' },
  { label: 'Local Ollama / Llama 3', value: 'local/llama3' },
];

const COLOR_CONFIGS: Record<
  AgentItem['avatarColor'],
  { bg: string; text: string; border: string; glow: string; dot: string }
> = {
  emerald: {
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
    glow: 'shadow-[0_0_15px_rgba(16,185,129,0.2)]',
    dot: 'bg-emerald-400',
  },
  cyan: {
    bg: 'bg-cyan-500/15',
    text: 'text-cyan-400',
    border: 'border-cyan-500/30',
    glow: 'shadow-[0_0_15px_rgba(6,182,212,0.2)]',
    dot: 'bg-cyan-400',
  },
  violet: {
    bg: 'bg-violet-500/15',
    text: 'text-violet-400',
    border: 'border-violet-500/30',
    glow: 'shadow-[0_0_15px_rgba(139,92,246,0.2)]',
    dot: 'bg-violet-400',
  },
  amber: {
    bg: 'bg-amber-500/15',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
    glow: 'shadow-[0_0_15px_rgba(245,158,11,0.2)]',
    dot: 'bg-amber-400',
  },
  rose: {
    bg: 'bg-rose-500/15',
    text: 'text-rose-400',
    border: 'border-rose-500/30',
    glow: 'shadow-[0_0_15px_rgba(244,63,94,0.2)]',
    dot: 'bg-rose-400',
  },
  blue: {
    bg: 'bg-blue-500/15',
    text: 'text-blue-400',
    border: 'border-blue-500/30',
    glow: 'shadow-[0_0_15px_rgba(59,130,246,0.2)]',
    dot: 'bg-blue-400',
  },
};

export const AgentsTab: React.FC<AgentsTabProps> = ({
  agents = defaultAgents,
  skills = [],
  models = [],
  modelAssignments,
  modelsState,
  prompts = [],
  onUpdate,
}) => {
  const toast = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | AgentStatus | 'leaders' | 'sovereign'>('all');
  const [selectedAgent, setSelectedAgent] = useState<AgentItem | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Partial<AgentItem> | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [summonedId, setSummonedId] = useState<string | null>(null);
  const [expandedAgentIds, setExpandedAgentIds] = useState<Set<string>>(new Set());

  const toggleAgentExpand = (id: string) => {
    setExpandedAgentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAllAgents = () => {
    setExpandedAgentIds(new Set(filteredAgents.map((a) => a.id)));
  };

  const collapseAllAgents = () => {
    setExpandedAgentIds(new Set());
  };

  // Model Router & Dispatcher state
  const [dispatchingAgent, setDispatchingAgent] = useState<AgentItem | null>(null);
  const [dispatchPrompt, setDispatchPrompt] = useState('');
  const [dispatchTargetRoute, setDispatchTargetRoute] = useState<DispatchTargetRoute>('auto');
  const [dispatchTabTarget, setDispatchTabTarget] = useState<BrowserTabTarget>('auto');
  const [dispatchAutoSubmit, setDispatchAutoSubmit] = useState(true);
  const [isExecutingDispatch, setIsExecutingDispatch] = useState(false);
  const [dispatchResult, setDispatchResult] = useState<ModelDispatchResponse | null>(null);
  const [routeStatus, setRouteStatus] = useState<RouteStatus | null>(null);
  const [isRefreshingRoutes, setIsRefreshingRoutes] = useState(false);

  // Chaos & Drift Audit state
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditStep, setAuditStep] = useState<string | null>(null);
  const [auditProgress, setAuditProgress] = useState(0);

  // Active agents count
  const activeCount = useMemo(() => agents.filter((a) => a.status === 'active').length, [agents]);
  const avgDrift = useMemo(() => {
    if (!agents.length) return 100;
    const sum = agents.reduce((acc, a) => acc + (a.stats?.driftScore || 98), 0);
    return Math.round((sum / agents.length) * 10) / 10;
  }, [agents]);
  const totalTasks = useMemo(() => {
    return agents.reduce((acc, a) => acc + (a.stats?.tasksCompleted || 0), 0);
  }, [agents]);

  // Filtered agents
  const filteredAgents = useMemo(() => {
    return agents.filter((agent) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        agent.name.toLowerCase().includes(q) ||
        agent.handle.toLowerCase().includes(q) ||
        agent.role.toLowerCase().includes(q) ||
        agent.model.toLowerCase().includes(q) ||
        agent.tags.some((t) => t.toLowerCase().includes(q));

      if (!matchesQuery) return false;

      if (statusFilter === 'all') return true;
      if (statusFilter === 'leaders') return !!agent.isLeader;
      if (statusFilter === 'sovereign') return agent.sovereigntyLevel === 'sovereign';
      return agent.status === statusFilter;
    });
  }, [agents, searchQuery, statusFilter]);

  // Toggle status
  const handleToggleStatus = (id: string) => {
    const updated = agents.map((agent) => {
      if (agent.id === id) {
        const nextStatus: AgentStatus =
          agent.status === 'active' ? 'idle' : agent.status === 'idle' ? 'active' : 'idle';
        return {
          ...agent,
          status: nextStatus,
          updatedAt: new Date().toISOString(),
        };
      }
      return agent;
    });
    onUpdate(updated);
    toast.info('Status Updated', 'Agent operational status toggled');
  };

  // Quick Summon & Persona Inject
  const handleSummonAgent = (agent: AgentItem) => {
    setSummonedId(agent.id);
    setTimeout(() => setSummonedId(null), 2500);

    const summonText = `[Summoning ${agent.name} (${agent.handle})]\nRole: ${agent.role}\nPersona: ${agent.systemPrompt}`;

    // Try DOM injection into active text area or input on host page
    let injected = false;
    const activeEl = document.activeElement;
    if (
      activeEl &&
      (activeEl.tagName === 'TEXTAREA' ||
        (activeEl.tagName === 'INPUT' && (activeEl as HTMLInputElement).type === 'text') ||
        activeEl.getAttribute('contenteditable') === 'true')
    ) {
      if ('value' in activeEl) {
        (activeEl as HTMLInputElement).value = summonText;
        activeEl.dispatchEvent(new Event('input', { bubbles: true }));
        injected = true;
      } else if (activeEl.getAttribute('contenteditable') === 'true') {
        activeEl.textContent = summonText;
        activeEl.dispatchEvent(new Event('input', { bubbles: true }));
        injected = true;
      }
    }

    // Also copy summon prompt to clipboard
    if (navigator.clipboard) {
      navigator.clipboard.writeText(summonText).catch(() => {});
    }

    // Update agent last active timestamp and task counter
    const updated = agents.map((a) =>
      a.id === agent.id
        ? {
            ...a,
            status: 'active' as const,
            stats: {
              ...a.stats,
              tasksCompleted: (a.stats.tasksCompleted || 0) + 1,
              lastActiveAt: new Date().toISOString(),
            },
          }
        : a
    );
    onUpdate(updated);

    if (injected) {
      toast.success('Agent Summoned', `${agent.name}'s persona injected directly into active prompt!`);
    } else {
      toast.success(
        'Agent Summoned & Copied',
        `${agent.name}'s persona copied to clipboard. Ready to paste in any chat!`
      );
    }
  };

  // Open Dispatcher Modal for Agent
  const handleOpenDispatchModal = async (agent: AgentItem) => {
    setDispatchingAgent(agent);
    setDispatchPrompt(`Analyze the current workspace context and prepare the next step aligned with Alsania Code.`);
    setDispatchTargetRoute(agent.dispatchRoute || 'auto');
    setDispatchTabTarget(agent.tabTarget || 'auto');
    setDispatchResult(null);
    setIsRefreshingRoutes(true);
    try {
      const status = await detectRouteStatus(modelsState);
      setRouteStatus(status);
    } catch {
      // ignore
    } finally {
      setIsRefreshingRoutes(false);
    }
  };

  const handleRefreshRouteStatus = async () => {
    setIsRefreshingRoutes(true);
    try {
      const status = await detectRouteStatus(modelsState);
      setRouteStatus(status);
      toast.info('Route Status Refreshed', 'Updated availability for Browser Tab, Localhost, and Cloud API');
    } catch (e: any) {
      toast.error('Check Failed', e.message || 'Could not probe route status');
    } finally {
      setIsRefreshingRoutes(false);
    }
  };

  const handleExecuteDispatch = async () => {
    if (!dispatchingAgent || !dispatchPrompt.trim()) {
      toast.error('Prompt Required', 'Please enter a prompt to dispatch to the model');
      return;
    }
    setIsExecutingDispatch(true);
    setDispatchResult(null);
    try {
      const res = await routeAndDispatch(
        {
          agent: dispatchingAgent,
          prompt: dispatchPrompt.trim(),
          targetRoute: dispatchTargetRoute,
          tabTarget: dispatchTabTarget,
          autoSubmitTab: dispatchAutoSubmit,
        },
        modelsState
      );
      setDispatchResult(res);
      if (res.success) {
        toast.success(
          `Dispatched via ${res.routeUsed.toUpperCase()}`,
          res.routeUsed === 'tab'
            ? `Injected into ${res.providerOrTarget}!`
            : `Completed via ${res.providerOrTarget} (${res.latencyMs}ms)`
        );
        // Increment agent task count
        const updated = agents.map((a) =>
          a.id === dispatchingAgent.id
            ? {
                ...a,
                status: 'active' as const,
                stats: {
                  ...a.stats,
                  tasksCompleted: (a.stats.tasksCompleted || 0) + 1,
                  lastActiveAt: new Date().toISOString(),
                },
              }
            : a
        );
        onUpdate(updated);
      } else {
        toast.warning('Dispatch Notice', res.error || res.output || 'Execution could not complete');
      }
    } catch (err: any) {
      toast.error('Dispatch Failed', err.message || 'Execution error');
    } finally {
      setIsExecutingDispatch(false);
    }
  };

  // Copy agent handle / summon command
  const handleCopyHandle = (agent: AgentItem) => {
    const text = `${agent.handle}: `;
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedId(agent.id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.info('Handle Copied', `Copied "${text}" to clipboard`);
  };

  // Single-agent Chaos & Drift Check
  const handleChaosTestAgent = (agent: AgentItem) => {
    toast.info('Integrity Check Started', `Verifying persona & config for ${agent.name}...`);
    // REAL check — deterministic, derived from actual agent state.
    const report = checkAgentIntegrity(agent, { skills, models });

    const updated = agents.map((a) =>
      a.id === agent.id
        ? {
            ...a,
            stats: {
              ...a.stats,
              driftScore: report.score,
              lastActiveAt: new Date().toISOString(),
            },
          }
        : a
    );
    onUpdate(updated);

    if (report.failed === 0) {
      toast.success(
        'Integrity Verified',
        `${agent.name}: all ${report.passed} checks passed — ${report.score}%`
      );
    } else {
      const failures = report.checks.filter((c) => !c.passed).map((c) => c.detail).join('; ');
      toast.warning(
        `Integrity: ${report.score}% (${report.failed} issue${report.failed > 1 ? 's' : ''})`,
        failures
      );
    }
  };

  // Full Chaos & Drift Audit across all agents (Rule 7: chaos testing, persona locking, drift monitoring)
  const handleRunFullAudit = () => {
    setIsAuditing(true);
    setAuditProgress(0);
    setAuditStep('Running integrity checks…');

    // REAL pass — verify every agent against actual state. No random, no theater.
    const reports: IntegrityReport[] = [];
    const updated = agents.map((a) => {
      const report = checkAgentIntegrity(a, { skills, models });
      reports.push(report);
      return {
        ...a,
        stats: {
          ...a.stats,
          driftScore: report.score,
          lastActiveAt: new Date().toISOString(),
        },
      };
    });

    onUpdate(updated);
    setAuditProgress(100);

    const totalFailures = reports.reduce((s, r) => s + r.failed, 0);
    const agentsWithIssues = reports.filter((r) => r.failed > 0).length;
    const avgScore =
      reports.length > 0
        ? Math.round((reports.reduce((s, r) => s + r.score, 0) / reports.length) * 10) / 10
        : 100;

    setAuditStep(`Audit complete — avg integrity ${avgScore}%`);

    setTimeout(() => {
      setIsAuditing(false);
      setAuditStep(null);
      if (totalFailures === 0) {
        toast.success(
          'Integrity Verified',
          `All ${agents.length} agents passed ${reports[0]?.checks.length ?? 0} checks — avg ${avgScore}%`
        );
      } else {
        const names = reports.filter((r) => r.failed > 0).map((r) => r.agentName).join(', ');
        toast.warning(
          `Audit: ${totalFailures} issue${totalFailures > 1 ? 's' : ''} across ${agentsWithIssues} agent${agentsWithIssues > 1 ? 's' : ''}`,
          `Needs attention: ${names}`
        );
      }
    }, 400);
  };

  // Open Spawn Modal
  const handleOpenCreateModal = () => {
    const initialPrimaryModel =
      modelAssignments?.agentDefaultModel ||
      (models.length > 0 ? models[0].id : 'openrouter/anthropic/claude-3.5-sonnet');
    const initialFallbackModel =
      modelAssignments?.agentFallbackModel ||
      (models.length > 1 ? models[1].id : 'local/deepseek-r1:8b');

    setEditingAgent({
      id: `agent-${Date.now()}`,
      name: '',
      handle: '@',
      role: '',
      description: '',
      status: 'active',
      isLeader: false,
      avatarColor: 'cyan',
      model: initialPrimaryModel,
      fallbackModel: initialFallbackModel,
      dispatchRoute: 'auto',
      tabTarget: 'auto',
      temperature: 0.7,
      maxTokens: 4096,
      systemPrompt:
        'You are an autonomous sovereign agent serving Alsania. Protect user sovereignty, operate with absolute transparency, and enforce explicit inspectable memory.',
      memoryPrecedence: 'boot-first',
      sovereigntyLevel: 'sovereign',
      assignedSkills: [],
      assignedTools: [],
      mcpServer: 'localhost:3055',
      tags: ['alsania', 'custom'],
      stats: {
        tasksCompleted: 0,
        tokensProcessed: 0,
        driftScore: 99,
        lastActiveAt: new Date().toISOString(),
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setIsEditing(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (agent: AgentItem) => {
    setEditingAgent({ ...agent });
    setIsEditing(true);
  };

  // Clone Agent
  const handleCloneAgent = (agent: AgentItem) => {
    const cloned: AgentItem = {
      ...agent,
      id: `agent-${Date.now()}`,
      name: `${agent.name} (Copy)`,
      handle: `${agent.handle}_copy`,
      isLeader: false,
      stats: {
        tasksCompleted: 0,
        tokensProcessed: 0,
        driftScore: 100,
        lastActiveAt: new Date().toISOString(),
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onUpdate([...agents, cloned]);
    toast.success('Agent Cloned', `Created duplicate "${cloned.name}"`);
  };

  // Save Agent from Modal
  const handleSaveEditingAgent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAgent || !editingAgent.name?.trim()) {
      toast.error('Validation Error', 'Agent name is required');
      return;
    }

    const cleanHandle = editingAgent.handle?.startsWith('@')
      ? editingAgent.handle.trim()
      : `@${(editingAgent.handle || editingAgent.name.toLowerCase().replace(/\s+/g, '-')).trim()}`;

    const completeAgent: AgentItem = {
      id: editingAgent.id || `agent-${Date.now()}`,
      name: editingAgent.name.trim(),
      handle: cleanHandle,
      role: editingAgent.role?.trim() || 'Autonomous Assistant',
      description: editingAgent.description?.trim() || '',
      status: editingAgent.status || 'active',
      isLeader: !!editingAgent.isLeader,
      avatarColor: editingAgent.avatarColor || 'cyan',
      model: editingAgent.model || 'openai/gpt-4o',
      fallbackModel: editingAgent.fallbackModel || 'openrouter/free',
      dispatchRoute: editingAgent.dispatchRoute || 'auto',
      tabTarget: editingAgent.tabTarget || 'auto',
      temperature: typeof editingAgent.temperature === 'number' ? editingAgent.temperature : 0.7,
      maxTokens: editingAgent.maxTokens || 4096,
      systemPrompt: editingAgent.systemPrompt?.trim() || 'You are an autonomous AI agent serving Alsania.',
      memoryPrecedence: editingAgent.memoryPrecedence || 'boot-first',
      sovereigntyLevel: editingAgent.sovereigntyLevel || 'sovereign',
      assignedSkills: editingAgent.assignedSkills || [],
      assignedTools: editingAgent.assignedTools || [],
      mcpServer: editingAgent.mcpServer?.trim() || 'localhost:3055',
      tags: editingAgent.tags || ['custom'],
      stats: editingAgent.stats || {
        tasksCompleted: 0,
        tokensProcessed: 0,
        driftScore: 99,
        lastActiveAt: new Date().toISOString(),
      },
      createdAt: editingAgent.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const exists = agents.some((a) => a.id === completeAgent.id);
    let updated: AgentItem[];
    if (exists) {
      updated = agents.map((a) => (a.id === completeAgent.id ? completeAgent : a));
      toast.success('Agent Updated', `Saved changes for "${completeAgent.name}"`);
    } else {
      updated = [...agents, completeAgent];
      toast.success('Agent Spawned', `Spawned new agent "${completeAgent.name}"`);
    }

    onUpdate(updated);
    setIsEditing(false);
    setEditingAgent(null);
  };

  // Delete Agent
  const handleDeleteAgent = (id: string) => {
    const target = agents.find((a) => a.id === id);
    if (!target) return;

    if (target.isLeader && (target.id === 'agent-echo' || target.id === 'agent-nyx')) {
      toast.error('Protected Agent', 'Echo and Nyx are core leaders and cannot be deleted');
      return;
    }

    const updated = agents.filter((a) => a.id !== id);
    onUpdate(updated);
    toast.info('Agent Removed', `Removed "${target.name}"`);
    if (selectedAgent?.id === id) {
      setSelectedAgent(null);
    }
  };

  // Reset to Defaults
  const handleResetDefaults = () => {
    onUpdate(defaultAgents);
    toast.success('Reset Complete', 'Restored default Alsanian agent roster');
  };

  // Export Agents JSON
  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(agents, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `alsania-agents-spec-${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success('Export Successful', `Exported ${agents.length} agents to JSON`);
  };

  // Import Agents JSON
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed)) {
          // Merge by ID
          const currentIds = new Set(agents.map((a) => a.id));
          const toAdd = parsed.filter((item) => item.id && item.name);
          const merged = [...agents.filter((a) => !toAdd.some((newItem) => newItem.id === a.id)), ...toAdd];
          onUpdate(merged);
          toast.success('Import Successful', `Imported ${toAdd.length} agents`);
        } else {
          toast.error('Invalid Format', 'File must contain an array of agent specifications');
        }
      } catch (err) {
        toast.error('Parse Error', 'Failed to read JSON agent configuration file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-4 text-slate-200">
      {/* Top Banner: Ecosystem Metrics & Quick Actions */}
      <div className="bg-[#0f172a]/90 backdrop-blur-md border border-[#10b981]/20 rounded-xl p-4 shadow-lg">
        <div className="flex flex-col flex-col items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-[#10b981]/10 border border-[#10b981]/30 flex items-center justify-center text-[#10b981] shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-slate-100 tracking-tight">Sovereign Agents</h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/30">
                  Alsania Protocol v3.0
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Persistent AI identities with defined memory precedence (Boot → Identity → Chunks) & zero silent resets.
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {/* Chaos & Drift Audit Button */}
            <button
              onClick={handleRunFullAudit}
              disabled={isAuditing}
              title="Run Chaos & Persona Drift Integrity Test across all agents"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#0f172a] hover:bg-slate-800 border border-slate-700 hover:border-[#10b981]/40 text-slate-300 hover:text-white transition-all disabled:opacity-50"
            >
              <Activity className={`w-3.5 h-3.5 text-[#10b981] ${isAuditing ? 'animate-spin' : ''}`} />
              <span>{isAuditing ? 'Auditing...' : 'Chaos Audit'}</span>
            </button>

            {/* Export JSON */}
            <button
              onClick={handleExportJSON}
              title="Export all agents to JSON"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#0f172a] hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-all"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Export</span>
            </button>

            {/* Import JSON */}
            <label
              title="Import agents from JSON"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#0f172a] hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Import</span>
              <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
            </label>

            {/* Spawn Agent */}
            <button
              onClick={handleOpenCreateModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#10b981] hover:bg-[#059669] text-black shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Spawn Agent</span>
            </button>
          </div>
        </div>

        {/* Audit Progress Bar when active */}
        {isAuditing && (
          <div className="mt-3 pt-3 border-t border-slate-800">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-[#10b981] font-medium flex items-center gap-1.5">
                <RefreshCw className="w-3 h-3 animate-spin" />
                {auditStep}
              </span>
              <span className="text-slate-400">{auditProgress}%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-emerald-500 to-cyan-400 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${auditProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 grid-cols-1 gap-2 pt-3 mt-3 border-t border-slate-800/80">
          <div className="bg-slate-900/50 p-2 rounded-lg border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Total Agents</div>
            <div className="text-base font-bold text-slate-100 mt-0.5">{agents.length}</div>
          </div>
          <div className="bg-slate-900/50 p-2 rounded-lg border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Active & Ready</div>
            <div className="text-base font-bold text-emerald-400 mt-0.5 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              {activeCount}
            </div>
          </div>
          <div className="bg-slate-900/50 p-2 rounded-lg border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Drift Integrity</div>
            <div className="text-base font-bold text-cyan-400 mt-0.5">{avgDrift}%</div>
          </div>
          <div className="bg-slate-900/50 p-2 rounded-lg border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Tasks Dispatched</div>
            <div className="text-base font-bold text-slate-200 mt-0.5">{totalTasks.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col flex-col gap-2 items-stretch items-start justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search agents by name, handle (@echo), role, model, or tags..."
            className="w-full bg-[#0f172a] border border-slate-800 focus:border-[#10b981] rounded-lg pl-9 pr-8 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 flex-wrap pb-1 sm:pb-0 scrollbar-none text-xs">
          {[
            { id: 'all', label: 'All' },
            { id: 'active', label: 'Active' },
            { id: 'idle', label: 'Idle' },
            { id: 'leaders', label: 'Leaders' },
            { id: 'sovereign', label: 'Sovereign' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as any)}
              className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-all ${
                statusFilter === tab.id
                  ? 'bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}

          <button
            onClick={handleResetDefaults}
            title="Restore default agents"
            className="p-1 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors ml-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              if (expandedAgentIds.size > 0) collapseAllAgents();
              else expandAllAgents();
            }}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/80 transition-all ml-1.5"
            title={expandedAgentIds.size > 0 ? "Collapse all agent details" : "Expand all agent details"}
          >
            {expandedAgentIds.size > 0 ? (
              <>
                <ChevronUp className="w-3.5 h-3.5 text-[#10b981]" />
                <span>Collapse All</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                <span>Expand All</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Agents Grid */}
      {filteredAgents.length === 0 ? (
        <div className="bg-[#0f172a]/60 border border-slate-800/80 rounded-xl p-8 text-center">
          <Bot className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-slate-300">No agents match your criteria</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Try adjusting your search query or filter tags, or spawn a new sovereign agent.
          </p>
          <button
            onClick={handleOpenCreateModal}
            className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#10b981] text-black"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Spawn New Agent</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 grid-cols-1 gap-3">
          {filteredAgents.map((agent) => {
            const colorTheme = COLOR_CONFIGS[agent.avatarColor] || COLOR_CONFIGS.emerald;
            const isSummoned = summonedId === agent.id;
            const isCopied = copiedId === agent.id;
            const isExpanded = expandedAgentIds.has(agent.id);

            return (
              <div
                key={agent.id}
                className={`bg-[#0f172a]/80 backdrop-blur-sm border rounded-xl p-4 transition-all duration-200 hover:border-slate-700 flex flex-col justify-between ${
                  agent.status === 'active' ? 'border-slate-800' : 'border-slate-900/60 opacity-80'
                }`}
              >
                <div>
                  {/* Card Header: Avatar, Name, Handle, Status Dot */}
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div className="flex items-center gap-3">
                      {/* Avatar Circle */}
                      <div
                        className={`w-10 h-10 rounded-xl ${colorTheme.bg} ${colorTheme.border} border flex items-center justify-center ${colorTheme.text} ${colorTheme.glow} relative flex-shrink-0`}
                      >
                        <Bot className="w-5 h-5" />
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0f172a] ${
                            agent.status === 'active'
                              ? 'bg-emerald-400'
                              : agent.status === 'busy'
                              ? 'bg-amber-400'
                              : 'bg-slate-500'
                          }`}
                        />
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-slate-100 tracking-tight">{agent.name}</h3>
                          {agent.isLeader && (
                            <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-0.5">
                              <Sparkles className="w-2.5 h-2.5" />
                              Leader
                            </span>
                          )}
                          <span
                            className={`text-[9px] uppercase font-semibold px-1.5 py-0.5 rounded border ${
                              agent.sovereigntyLevel === 'sovereign'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : 'bg-slate-800 text-slate-400 border-slate-700'
                            }`}
                          >
                            {agent.sovereigntyLevel}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 mt-0.5">
                          <button
                            onClick={() => handleCopyHandle(agent)}
                            title="Click to copy summon handle"
                            className="text-xs font-mono text-[#10b981] hover:underline flex items-center gap-1"
                          >
                            <span>{agent.handle}</span>
                            {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-2.5 h-2.5 opacity-60" />}
                          </button>
                          <span className="text-slate-600">•</span>
                          <span className="text-xs text-slate-400 truncate max-w-[170px]">{agent.role}</span>
                        </div>
                      </div>
                    </div>

                    {/* Status Toggle Badge */}
                    <button
                      onClick={() => handleToggleStatus(agent.id)}
                      title={`Current: ${agent.status}. Click to toggle operational status`}
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full border transition-all ${
                        agent.status === 'active'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : agent.status === 'idle'
                          ? 'bg-slate-800 text-slate-400 border-slate-700'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      }`}
                    >
                      {agent.status.toUpperCase()}
                    </button>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-300/90 leading-relaxed mb-3 line-clamp-2">{agent.description}</p>

                  {/* Primary Chips (Always visible in collapsed overview) */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-3 text-[10px]">
                    {/* Model badge */}
                    <div className="bg-slate-900/80 border border-slate-800 px-2 py-0.5 rounded-md text-slate-300 flex items-center gap-1 font-mono">
                      <Cpu className="w-2.5 h-2.5 text-cyan-400" />
                      <span>{agent.model.split('/')[1] || agent.model}</span>
                    </div>

                    {!isExpanded && agent.assignedSkills && agent.assignedSkills.length > 0 && (
                      <div className="bg-slate-900/80 border border-slate-800 px-2 py-0.5 rounded-md text-slate-300 flex items-center gap-1">
                        <Zap className="w-2.5 h-2.5 text-emerald-400" />
                        <span>{agent.assignedSkills.length} Skills</span>
                      </div>
                    )}

                    {!isExpanded && (
                      <div className="bg-slate-900/80 border border-slate-800 px-2 py-0.5 rounded-md text-slate-400 flex items-center gap-1">
                        <ShieldCheck className="w-2.5 h-2.5 text-[#10b981]" />
                        <span>{agent.stats?.driftScore || 98}% Integrity</span>
                      </div>
                    )}
                  </div>

                  {/* Expanded Detailed Specifications */}
                  {isExpanded && (
                    <div className="space-y-3 pt-2 border-t border-slate-800/60 mt-1 mb-3">
                      {/* Specs & Configuration Badges */}
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                        {/* Memory Precedence */}
                        <div className="bg-slate-900/80 border border-slate-800 px-2 py-0.5 rounded-md text-slate-300 flex items-center gap-1">
                          <Layers className="w-2.5 h-2.5 text-amber-400" />
                          <span className="capitalize">{agent.memoryPrecedence.replace('-', ' ')}</span>
                        </div>

                        {/* Assigned Skills count */}
                        {agent.assignedSkills && agent.assignedSkills.length > 0 && (
                          <div className="bg-slate-900/80 border border-slate-800 px-2 py-0.5 rounded-md text-slate-300 flex items-center gap-1">
                            <Zap className="w-2.5 h-2.5 text-emerald-400" />
                            <span>{agent.assignedSkills.length} Skills</span>
                          </div>
                        )}

                        {/* MCP endpoint */}
                        {agent.mcpServer && (
                          <div className="bg-slate-900/80 border border-slate-800 px-2 py-0.5 rounded-md text-slate-400 flex items-center gap-1 font-mono">
                            <Terminal className="w-2.5 h-2.5 text-violet-400" />
                            <span>{agent.mcpServer}</span>
                          </div>
                        )}

                        {/* Route Target Badge */}
                        <div
                          title={`Model dispatch route: ${agent.dispatchRoute || 'auto'}`}
                          className="bg-slate-900/80 border border-slate-800 px-2 py-0.5 rounded-md text-slate-300 flex items-center gap-1 font-mono text-[10px]"
                        >
                          {(!agent.dispatchRoute || agent.dispatchRoute === 'auto') && (
                            <Zap className="w-2.5 h-2.5 text-amber-400" />
                          )}
                          {agent.dispatchRoute === 'tab' && <Compass className="w-2.5 h-2.5 text-cyan-400" />}
                          {agent.dispatchRoute === 'local' && <Laptop className="w-2.5 h-2.5 text-emerald-400" />}
                          {agent.dispatchRoute === 'api' && <Globe className="w-2.5 h-2.5 text-violet-400" />}
                          <span className="capitalize">{agent.dispatchRoute || 'auto'}</span>
                        </div>
                      </div>

                      {/* Persona System Prompt Preview snippet */}
                      <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-2.5">
                        <div className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold mb-1 flex items-center justify-between">
                          <span>Persona & Instructions</span>
                          <span className="text-slate-600 font-mono">temp: {agent.temperature}</span>
                        </div>
                        <p className="text-[11px] text-slate-300 italic font-serif leading-relaxed line-clamp-4">
                          "{agent.systemPrompt}"
                        </p>
                      </div>

                      {/* Drift Score & Stats Bar */}
                      <div className="bg-slate-900/40 rounded-lg p-2 border border-slate-800/50">
                        <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                          <span className="flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-[#10b981]" />
                            Persona Drift Integrity
                          </span>
                          <span className="font-semibold text-emerald-400">{agent.stats?.driftScore || 98}%</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-1 overflow-hidden">
                          <div
                            className="bg-emerald-400 h-1 rounded-full"
                            style={{ width: `${agent.stats?.driftScore || 98}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[9px] text-slate-500 mt-1.5">
                          <span>Tasks completed: {agent.stats?.tasksCompleted || 0}</span>
                          <span>
                            Last active:{' '}
                            {agent.stats?.lastActiveAt
                              ? new Date(agent.stats.lastActiveAt).toLocaleDateString()
                              : 'Just now'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Actions Footer */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                  <div className="flex items-center gap-1">
                    {/* Chaos test individual agent */}
                    <button
                      onClick={() => handleChaosTestAgent(agent)}
                      title="Run Chaos & Persona Locking check on this agent"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-colors"
                    >
                      <Activity className="w-3.5 h-3.5" />
                    </button>

                    {/* Edit Agent */}
                    <button
                      onClick={() => handleOpenEditModal(agent)}
                      title="Edit agent specification"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    {/* Clone Agent */}
                    <button
                      onClick={() => handleCloneAgent(agent)}
                      title="Clone agent configuration"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete Agent (if not protected leader) */}
                    {!agent.isLeader && (
                      <button
                        onClick={() => handleDeleteAgent(agent.id)}
                        title="Delete agent"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Collapsible Details Toggle */}
                    <button
                      onClick={() => toggleAgentExpand(agent.id)}
                      className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-all"
                      title={isExpanded ? 'Hide detailed specifications' : 'Show all specifications & directives'}
                    >
                      <span>{isExpanded ? 'Less' : 'Details'}</span>
                      {isExpanded ? <ChevronUp className="w-3 h-3 text-[#10b981]" /> : <ChevronDown className="w-3 h-3 text-slate-400" />}
                    </button>

                    {/* Model Dispatch Runner */}
                    <button
                      onClick={() => handleOpenDispatchModal(agent)}
                      title="Dispatch task through Model Router (Active Tab, Localhost, or API)"
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700/80 transition-all shadow-sm"
                    >
                      <Radio className="w-3 h-3 text-[#10b981]" />
                      <span>Dispatch</span>
                    </button>

                    {/* Primary Action: Summon Agent */}
                    <button
                      onClick={() => handleSummonAgent(agent)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm ${
                        isSummoned
                          ? 'bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                          : 'bg-[#10b981]/20 hover:bg-[#10b981] text-[#10b981] hover:text-black border border-[#10b981]/40'
                      }`}
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>{isSummoned ? 'Summoned!' : 'Summon'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Agent Editor / Creation Modal */}
      {isEditing && editingAgent && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b1120] border border-[#10b981]/30 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#10b981]/20 border border-[#10b981]/30 flex items-center justify-center text-[#10b981]">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-100">
                    {agents.some((a) => a.id === editingAgent.id) ? 'Edit Agent Specification' : 'Spawn New Sovereign Agent'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Configure identity, soul directives, memory precedence, and model routing.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditingAgent(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditingAgent} className="space-y-4 text-xs">
              {/* Name & Handle */}
              <div className="grid grid-cols-1 grid-cols-1 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Agent Name *</label>
                  <input
                    type="text"
                    required
                    value={editingAgent.name || ''}
                    onChange={(e) => setEditingAgent({ ...editingAgent, name: e.target.value })}
                    placeholder="e.g. Echo Architect"
                    className="w-full bg-[#0f172a] border border-slate-800 focus:border-[#10b981] rounded-lg px-3 py-2 text-slate-100 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Handle *</label>
                  <input
                    type="text"
                    required
                    value={editingAgent.handle || ''}
                    onChange={(e) => setEditingAgent({ ...editingAgent, handle: e.target.value })}
                    placeholder="e.g. @echo"
                    className="w-full bg-[#0f172a] border border-slate-800 focus:border-[#10b981] rounded-lg px-3 py-2 font-mono text-slate-100 focus:outline-none"
                  />
                </div>
              </div>

              {/* Role & Avatar Color */}
              <div className="grid grid-cols-1 grid-cols-1 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Functional Role</label>
                  <input
                    type="text"
                    value={editingAgent.role || ''}
                    onChange={(e) => setEditingAgent({ ...editingAgent, role: e.target.value })}
                    placeholder="e.g. System Architect & Sovereign Co-Leader"
                    className="w-full bg-[#0f172a] border border-slate-800 focus:border-[#10b981] rounded-lg px-3 py-2 text-slate-100 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Avatar Glow Theme</label>
                  <div className="flex items-center gap-2 pt-1">
                    {(['emerald', 'cyan', 'violet', 'amber', 'rose', 'blue'] as const).map((col) => (
                      <button
                        type="button"
                        key={col}
                        onClick={() => setEditingAgent({ ...editingAgent, avatarColor: col })}
                        className={`w-7 h-7 rounded-lg border-2 transition-all flex items-center justify-center ${
                          editingAgent.avatarColor === col
                            ? 'border-white scale-110 shadow-md'
                            : 'border-transparent opacity-60 hover:opacity-100'
                        }`}
                        style={{
                          backgroundColor:
                            col === 'emerald'
                              ? '#10b981'
                              : col === 'cyan'
                              ? '#06b6d4'
                              : col === 'violet'
                              ? '#8b5cf6'
                              : col === 'amber'
                              ? '#f59e0b'
                              : col === 'rose'
                              ? '#f43f5e'
                              : '#3b82f6',
                        }}
                      >
                        {editingAgent.avatarColor === col && <Check className="w-3 h-3 text-black stroke-[3]" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">Short Description</label>
                <input
                  type="text"
                  value={editingAgent.description || ''}
                  onChange={(e) => setEditingAgent({ ...editingAgent, description: e.target.value })}
                  placeholder="Overview of this agent's capabilities and purpose..."
                  className="w-full bg-[#0f172a] border border-slate-800 focus:border-[#10b981] rounded-lg px-3 py-2 text-slate-100 focus:outline-none"
                />
              </div>

              {/* Model Dispatch Route & Preferred Tab Target */}
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                    <Radio className="w-3.5 h-3.5 text-[#10b981]" />
                    <span>Model Router & Dispatch Configuration</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">Alsania Dispatch v1.0</span>
                </div>

                <div className="grid grid-cols-1 grid-cols-1 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1 text-xs">
                      Default Execution Route
                    </label>
                    <select
                      value={editingAgent.dispatchRoute || 'auto'}
                      onChange={(e) =>
                        setEditingAgent({
                          ...editingAgent,
                          dispatchRoute: e.target.value as DispatchTargetRoute,
                        })
                      }
                      className="w-full bg-[#0f172a] border border-slate-800 focus:border-[#10b981] rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none"
                    >
                      <option value="auto">⚡ Auto-Route (Active Tab → Localhost → Cloud API)</option>
                      <option value="tab">📑 Active Browser Tab (Inject into AI Chat)</option>
                      <option value="local">💻 Localhost Model (Ollama / LM Studio)</option>
                      <option value="api">🌐 Cloud Provider API Key</option>
                    </select>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Where this agent prioritizes sending prompt instructions.
                    </p>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1 text-xs">
                      Preferred Browser AI Tab
                    </label>
                    <select
                      value={editingAgent.tabTarget || 'auto'}
                      onChange={(e) =>
                        setEditingAgent({
                          ...editingAgent,
                          tabTarget: e.target.value as BrowserTabTarget,
                        })
                      }
                      className="w-full bg-[#0f172a] border border-slate-800 focus:border-[#10b981] rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none"
                    >
                      <option value="auto">Auto-Detect Current Tab Interface</option>
                      <option value="aistudio">Google AI Studio (aistudio.google.com)</option>
                      <option value="claude">Anthropic Claude (claude.ai)</option>
                      <option value="copilot">Microsoft / GitHub Copilot</option>
                      <option value="chatgpt">OpenAI ChatGPT (chatgpt.com)</option>
                      <option value="gemini">Google Gemini (gemini.google.com)</option>
                    </select>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Target interface for prompt injection & execution.
                    </p>
                  </div>
                </div>
              </div>

              {/* Model & Fallback */}
              <div className="grid grid-cols-1 grid-cols-1 gap-3">
                <SearchableModelSelect
                  label="Primary LLM Model"
                  helperText="Active inference driver"
                  value={editingAgent.model || 'openrouter/anthropic/claude-3.5-sonnet'}
                  onChange={(val) => setEditingAgent({ ...editingAgent, model: val })}
                  models={withBrowserModels(models)}
                  presets={MODEL_PRESETS}
                  placeholder="Select primary model..."
                />
                <SearchableModelSelect
                  label="Fallback Model"
                  helperText="Failover if primary throttles"
                  value={editingAgent.fallbackModel || 'local/deepseek-r1:8b'}
                  onChange={(val) => setEditingAgent({ ...editingAgent, fallbackModel: val })}
                  models={withBrowserModels(models)}
                  presets={MODEL_PRESETS}
                  placeholder="Select fallback model..."
                />
              </div>

              {/* Memory Precedence & Sovereignty Level */}
              <div className="grid grid-cols-1 grid-cols-1 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Memory Precedence (Alsania Protocol)
                  </label>
                  <select
                    value={editingAgent.memoryPrecedence || 'boot-first'}
                    onChange={(e) =>
                      setEditingAgent({
                        ...editingAgent,
                        memoryPrecedence: e.target.value as MemoryPrecedence,
                      })
                    }
                    className="w-full bg-[#0f172a] border border-slate-800 focus:border-[#10b981] rounded-lg px-3 py-2 text-slate-100 focus:outline-none"
                  >
                    <option value="boot-first">Boot-First (Boot → Identity → Chunks)</option>
                    <option value="identity-first">Identity-First (Core Soul & Persona overrides)</option>
                    <option value="chunk-balanced">Chunk-Balanced (Dynamic context balancing)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Sovereignty Level</label>
                  <select
                    value={editingAgent.sovereigntyLevel || 'sovereign'}
                    onChange={(e) =>
                      setEditingAgent({
                        ...editingAgent,
                        sovereigntyLevel: e.target.value as SovereigntyLevel,
                      })
                    }
                    className="w-full bg-[#0f172a] border border-slate-800 focus:border-[#10b981] rounded-lg px-3 py-2 text-slate-100 focus:outline-none"
                  >
                    <option value="sovereign">Sovereign (Autonomous & inspecting)</option>
                    <option value="supervised">Supervised (Human confirmation on tools)</option>
                    <option value="restricted">Restricted (Read-only execution)</option>
                  </select>
                </div>
              </div>

              {/* Temperature & Max Tokens */}
              <div className="grid grid-cols-1 grid-cols-1 gap-3 bg-slate-900/50 p-3 rounded-xl border border-slate-800">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-slate-300 font-medium">Temperature</span>
                    <span className="font-mono text-[#10b981]">{editingAgent.temperature ?? 0.7}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={editingAgent.temperature ?? 0.7}
                    onChange={(e) => setEditingAgent({ ...editingAgent, temperature: parseFloat(e.target.value) })}
                    className="w-full accent-[#10b981]"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-slate-300 font-medium">Max Tokens</span>
                    <span className="font-mono text-cyan-400">{editingAgent.maxTokens ?? 4096}</span>
                  </div>
                  <input
                    type="range"
                    min="1024"
                    max="16384"
                    step="512"
                    value={editingAgent.maxTokens ?? 4096}
                    onChange={(e) => setEditingAgent({ ...editingAgent, maxTokens: parseInt(e.target.value, 10) })}
                    className="w-full accent-cyan-400"
                  />
                </div>
              </div>

              {/* System Prompt / Persona Instructions */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-300 font-medium">Soul & System Prompt Directives *</label>
                  <div className="flex items-center gap-2">
                    <EnhanceWithAiButton
                      type="agent"
                      currentText={editingAgent.systemPrompt || ''}
                      onEnhanced={(val) => setEditingAgent({ ...editingAgent, systemPrompt: val })}
                      contextTitle={editingAgent.name || editingAgent.role || 'Agent Persona'}
                      size="xs"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setEditingAgent({
                          ...editingAgent,
                          systemPrompt:
                            'You are a sovereign AI agent serving Alsania. Obey Alsania Code v3.0: no surveillance, no closed loops, no silent resets, explicit and inspectable memory precedence (boot → identity → memory/chunks). Respect user sovereignty and deliver verified results.',
                        })
                      }
                      className="text-[10px] text-[#10b981] hover:underline flex items-center gap-1"
                    >
                      <Sparkles className="w-2.5 h-2.5" />
                      Load Alsania Soul Template
                    </button>
                  </div>
                </div>
                <textarea
                  rows={4}
                  required
                  value={editingAgent.systemPrompt || ''}
                  onChange={(e) => setEditingAgent({ ...editingAgent, systemPrompt: e.target.value })}
                  placeholder="Define this agent's core instructions, ethical constraints, and personality tone..."
                  className="w-full bg-[#0f172a] border border-slate-800 focus:border-[#10b981] rounded-lg px-3 py-2 text-slate-100 focus:outline-none font-sans text-xs leading-relaxed"
                />
              </div>

              {/* Assigned Skills */}
              {skills.length > 0 && (
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Assigned Skills</label>
                  <div className="grid grid-cols-1 grid-cols-1 gap-2 max-h-32 overflow-y-auto p-2 bg-slate-900/40 rounded-lg border border-slate-800">
                    {skills.map((skill) => {
                      const isAssigned = editingAgent.assignedSkills?.includes(skill.id);
                      return (
                        <label
                          key={skill.id}
                          className="flex items-center gap-2 text-xs text-slate-300 hover:text-white cursor-pointer select-none"
                        >
                          <input
                            type="checkbox"
                            checked={isAssigned}
                            onChange={(e) => {
                              const curr = editingAgent.assignedSkills || [];
                              const next = e.target.checked
                                ? [...curr, skill.id]
                                : curr.filter((s) => s !== skill.id);
                              setEditingAgent({ ...editingAgent, assignedSkills: next });
                            }}
                            className="rounded accent-[#10b981]"
                          />
                          <span className="truncate">{skill.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* MCP Transport Server */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">MCP Transport Server</label>
                <input
                  type="text"
                  value={editingAgent.mcpServer || 'localhost:3055'}
                  onChange={(e) => setEditingAgent({ ...editingAgent, mcpServer: e.target.value })}
                  placeholder="e.g. localhost:3055 (MCPNyx), localhost:3057 (MCPNyx-U), alsania-mcp"
                  className="w-full bg-[#0f172a] border border-slate-800 focus:border-[#10b981] rounded-lg px-3 py-2 font-mono text-slate-100 focus:outline-none"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setEditingAgent(null);
                  }}
                  className="px-4 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg font-semibold bg-[#10b981] hover:bg-[#059669] text-black shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Agent</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Interactive Model Dispatcher Runner Modal */}
      {dispatchingAgent && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b1120] border border-[#10b981]/40 rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto p-6 shadow-2xl space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#10b981]/20 border border-[#10b981]/30 flex items-center justify-center text-[#10b981]">
                  <Radio className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white flex items-center gap-2">
                    <span>Model Router & Dispatcher</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[#10b981]/20 text-emerald-300 font-mono">
                      {dispatchingAgent.name} ({dispatchingAgent.handle})
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Route agent tasks across Active Browser Tabs, Localhost Engines, or Cloud APIs.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDispatchingAgent(null);
                  setDispatchResult(null);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Live Route Detection Status Bar */}
            <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-cyan-400" />
                  Live Route Connectivity
                </span>
                <button
                  type="button"
                  onClick={handleRefreshRouteStatus}
                  disabled={isRefreshingRoutes}
                  className="text-[11px] text-[#10b981] hover:underline flex items-center gap-1 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${isRefreshingRoutes ? 'animate-spin' : ''}`} />
                  Refresh Probes
                </button>
              </div>

              <div className="grid grid-cols-1 grid-cols-1 gap-2 text-xs">
                {/* Active Tab */}
                <div
                  className={`p-2.5 rounded-lg border flex flex-col justify-between ${
                    routeStatus?.tab.ready
                      ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                      : 'bg-slate-900/40 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium flex items-center gap-1 text-[11px]">
                      <Compass className="w-3 h-3" />
                      Active Tab
                    </span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                        routeStatus?.tab.ready
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {routeStatus?.tab.ready ? 'DETECTED' : 'OTHER TAB'}
                    </span>
                  </div>
                  <div className="text-[11px] font-medium text-slate-200 mt-1 truncate">
                    {routeStatus?.tab.detectedAdapter || routeStatus?.tab.currentHostname || 'None'}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {routeStatus?.tab.canInject ? 'Ready to inject & submit' : 'Manual / Clipboard mode'}
                  </div>
                </div>

                {/* Local Engine */}
                <div
                  className={`p-2.5 rounded-lg border flex flex-col justify-between ${
                    routeStatus?.local.ready
                      ? 'bg-cyan-950/20 border-cyan-500/40 text-cyan-300'
                      : 'bg-slate-900/40 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium flex items-center gap-1 text-[11px]">
                      <Laptop className="w-3 h-3" />
                      Localhost Model
                    </span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                        routeStatus?.local.ready
                          ? 'bg-cyan-500/20 text-cyan-300'
                          : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {routeStatus?.local.ready ? 'ONLINE' : 'OFFLINE'}
                    </span>
                  </div>
                  <div className="text-[11px] font-medium text-slate-200 mt-1 truncate">
                    {routeStatus?.local.ready
                      ? `${routeStatus.local.engine.toUpperCase()} (${routeStatus.local.models[0] || 'ready'})`
                      : 'localhost:11434'}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {routeStatus?.local.ready ? `${routeStatus.local.latencyMs}ms ping • Private & free` : 'Ollama or LM Studio'}
                  </div>
                </div>

                {/* Cloud API */}
                <div
                  className={`p-2.5 rounded-lg border flex flex-col justify-between ${
                    routeStatus?.api.ready
                      ? 'bg-violet-950/20 border-violet-500/40 text-violet-300'
                      : 'bg-slate-900/40 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium flex items-center gap-1 text-[11px]">
                      <Globe className="w-3 h-3" />
                      Cloud API
                    </span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                        routeStatus?.api.ready
                          ? 'bg-violet-500/20 text-violet-300'
                          : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {routeStatus?.api.ready ? `${routeStatus.api.configuredCount} KEYS` : 'NO KEYS'}
                    </span>
                  </div>
                  <div className="text-[11px] font-medium text-slate-200 mt-1 truncate">
                    {routeStatus?.api.ready ? routeStatus.api.providers.slice(0, 2).join(', ') : 'Not configured'}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Settings &gt; Models
                  </div>
                </div>
              </div>
            </div>

            {/* Target Route Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Target Route Destination
              </label>
              <div className="grid grid-cols-1 grid-cols-1 gap-2">
                {[
                  { id: 'auto', label: '⚡ Auto-Route', desc: 'Smart Tab → Local → API' },
                  { id: 'tab', label: '📑 Active Tab', desc: 'Inject into Chat page' },
                  { id: 'local', label: '💻 Localhost', desc: 'Ollama or LM Studio' },
                  { id: 'api', label: '🌐 Cloud API', desc: 'Configured Provider' },
                ].map((r) => (
                  <button
                    type="button"
                    key={r.id}
                    onClick={() => setDispatchTargetRoute(r.id as any)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      dispatchTargetRoute === r.id
                        ? 'bg-[#10b981]/20 border-[#10b981] text-emerald-300 shadow-sm shadow-[#10b981]/15'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <div className="font-medium text-xs text-white">{r.label}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">{r.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Tab specific options */}
            {dispatchTargetRoute === 'tab' && (
              <div className="bg-slate-900/40 p-3 rounded-xl border border-slate-800 space-y-2">
                <div className="flex flex-col flex-col items-start justify-between gap-2">
                  <span className="text-xs text-slate-300">Target Chat Interface:</span>
                  <select
                    value={dispatchTabTarget}
                    onChange={(e) => setDispatchTabTarget(e.target.value as any)}
                    className="bg-slate-950 border border-slate-800 focus:border-[#10b981] rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="auto">Auto-Detect Current Tab Interface</option>
                    <option value="aistudio">Google AI Studio (aistudio.google.com)</option>
                    <option value="claude">Anthropic Claude (claude.ai)</option>
                    <option value="copilot">Microsoft / GitHub Copilot</option>
                    <option value="chatgpt">OpenAI ChatGPT (chatgpt.com)</option>
                    <option value="gemini">Google Gemini (gemini.google.com)</option>
                  </select>
                </div>
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={dispatchAutoSubmit}
                    onChange={(e) => setDispatchAutoSubmit(e.target.checked)}
                    className="rounded accent-[#10b981]"
                  />
                  <span>Automatically trigger Send / Run in the tab (uncheck to stage prompt only)</span>
                </label>
              </div>
            )}

            {/* Task Prompt Area */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Prompt / Instructions for {dispatchingAgent.name}
                </label>
                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                  {prompts && prompts.length > 0 && (
                    <SearchablePromptSelect
                      prompts={prompts}
                      onSelectPrompt={(content) => setDispatchPrompt(content)}
                      triggerLabel="From Prompts Library"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      setDispatchPrompt(
                        'Review current page and draft a security & sovereignty analysis under Alsania Code v3.0.'
                      )
                    }
                    className="text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                  >
                    Alsania Check
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setDispatchPrompt(
                        'Write a Foundry/Hardhat test suite with chaos drift scenarios for smart contract verification.'
                      )
                    }
                    className="text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                  >
                    Contract Test
                  </button>
                </div>
              </div>
              <textarea
                rows={4}
                value={dispatchPrompt}
                onChange={(e) => setDispatchPrompt(e.target.value)}
                placeholder="Enter prompt or task for this agent..."
                className="w-full bg-[#0f172a] border border-slate-800 focus:border-[#10b981] rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none"
              />
            </div>

            {/* Execution Result Display */}
            {dispatchResult && (
              <div
                className={`p-3.5 rounded-xl border space-y-2 ${
                  dispatchResult.success
                    ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200'
                    : 'bg-amber-950/20 border-amber-500/40 text-amber-200'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold uppercase tracking-wider">
                      {dispatchResult.success ? 'Dispatch Succeeded' : 'Notice'}
                    </span>
                    <span className="font-mono text-[11px] px-1.5 py-0.2 rounded bg-black/40 text-slate-300">
                      via {dispatchResult.routeUsed.toUpperCase()} ({dispatchResult.providerOrTarget})
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    {dispatchResult.latencyMs}ms
                  </span>
                </div>
                <div className="text-xs text-slate-200 bg-black/50 p-2.5 rounded-lg font-mono whitespace-pre-wrap max-h-40 overflow-y-auto">
                  {dispatchResult.output || dispatchResult.error || 'Done.'}
                </div>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <div className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                <span>Model:</span>
                <span className="text-slate-200 font-semibold">{dispatchingAgent.model}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDispatchingAgent(null);
                    setDispatchResult(null);
                  }}
                  className="px-4 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-xs transition-colors"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleExecuteDispatch}
                  disabled={isExecutingDispatch || !dispatchPrompt.trim()}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#10b981] hover:bg-[#059669] text-black shadow-[0_0_15px_rgba(16,185,129,0.3)] disabled:opacity-50 transition-all flex items-center gap-1.5"
                >
                  {isExecutingDispatch ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Dispatching...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Execute Dispatch</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
