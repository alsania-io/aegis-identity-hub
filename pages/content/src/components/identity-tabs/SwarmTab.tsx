import React, { useState, useEffect, useMemo } from 'react';
import {
  Bot, Play, Plus, Settings, ChevronRight, CheckCircle2, Clock,
  XCircle, Sparkles, RefreshCw, Calendar, Pause, History, Trash2,
  Zap, CalendarDays, ListFilter, Activity, Check, AlertCircle, FileText,
  Download, Search, Copy, Cpu
} from 'lucide-react';
import { SwarmTask, SwarmConfig, AiModelItem, ModelAssignments, Prompt } from '../../types/identity';
import { SearchableModelSelect } from './SearchableModelSelect';
import { SearchablePromptSelect } from './SearchablePromptSelect';
import { swarmService } from '../../services/swarm.service';
import { withBrowserModels } from '../../lib/browser-models';

interface SwarmTabProps {
  tasks: SwarmTask[];
  config: SwarmConfig;
  models?: AiModelItem[];
  modelAssignments?: ModelAssignments;
  prompts?: Prompt[];
  onUpdateTasks: (tasks: SwarmTask[]) => void;
  onUpdateConfig: (config: SwarmConfig) => void;
}

// Simple cron utilities (inlined for self-containment)
const CRON_PRESETS = [
  { label: 'Every 5m', expression: '*/5 * * * *' },
  { label: 'Every 15m', expression: '*/15 * * * *' },
  { label: 'Hourly', expression: '0 * * * *' },
  { label: 'Daily', expression: '0 0 * * *' },
  { label: 'Weekly', expression: '0 0 * * 0' },
];

const validateCron = (expr: string): boolean => {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return false;
  const patterns = [
    /^(\*|([0-9]+|\*\/[0-9]+))$/,
    /^(\*|([0-9]+|\*\/[0-9]+))$/,
    /^(\*|([0-9]+|\*\/[0-9]+))$/,
    /^(\*|([0-9]+|\*\/[0-9]+))$/,
    /^(\*|([0-9]+|\*\/[0-9]+))$/,
  ];
  for (let i = 0; i < 5; i++) {
    if (!patterns[i].test(parts[i])) return false;
  }
  return true;
};

const describeCron = (expr: string): string => {
  const parts = expr.trim().split(/\s+/);
  const labels = ['minute', 'hour', 'day', 'month', 'weekday'];
  const desc = parts.map((p, i) => {
    if (p === '*') return `every ${labels[i]}`;
    if (p.startsWith('*/')) return `every ${p.substring(2)} ${labels[i]}${p.substring(2) !== '1' ? 's' : ''}`;
    return `at ${p} ${labels[i]}`;
  });
  return desc.join(', ');
};

const calculateNextRun = (expr: string): string => {
  const now = new Date();
  const next = new Date(now.getTime() + 60000); // Simple: 1 minute from now
  return next.toISOString();
};

const getTimeUntil = (iso: string): string => {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff < 0) return 'now';
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'less than a minute';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m`;
};

export const SwarmTab: React.FC<SwarmTabProps> = ({
  tasks, config, models = [], modelAssignments, prompts = [], onUpdateTasks, onUpdateConfig
}) => {
  const defaultWorkerModel =
    modelAssignments?.swarmWorkerModel || (models.length > 0 ? models[0].id : 'local/llama3.2:3b');
  const defaultCronModel =
    modelAssignments?.cronTasksDefaultModel || (models.length > 0 ? models[0].id : 'kilo/kilo-coder-pro');

  // Browser-model options come from ONE shared source (lib/browser-models.ts)
  // so the `tab/<site>` list can never drift between SwarmTab, SettingsTab and
  // AgentsTab. withBrowserModels() prepends them to the provider models.
  const workerModelOptions: AiModelItem[] = withBrowserModels(models || []);

  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [dispatchMode, setDispatchMode] = useState<'immediate' | 'cron'>('immediate');
  const [cronExpr, setCronExpr] = useState('*/15 * * * *');
  const [assignedAi, setAssignedAi] = useState('Nyx Swarm Leader');
  const [taskModel, setTaskModel] = useState(defaultWorkerModel);
  const [showConfig, setShowConfig] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'cron' | 'immediate' | 'completed'>('all');
  const [selectedLogsTask, setSelectedLogsTask] = useState<SwarmTask | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'completed' | 'failed' | 'cron'>('all');
  const [historySearch, setHistorySearch] = useState('');
  const [copiedLogId, setCopiedLogId] = useState<string | null>(null);

  // Switch model to role default when dispatch mode changes if user hasn't overridden
  const handleModeChange = (mode: 'immediate' | 'cron') => {
    setDispatchMode(mode);
    if (mode === 'cron') {
      setTaskModel(defaultCronModel);
    } else {
      setTaskModel(defaultWorkerModel);
    }
  };

  // Auto-runner for cron tasks
  useEffect(() => {
    const interval = setInterval(async () => {
      const now = Date.now();
      const due = tasks.filter(task =>
        task.isScheduled && task.scheduleEnabled !== false && task.nextRunAt &&
        new Date(task.nextRunAt).getTime() <= now
      );
      if (due.length === 0) return;

      // Reschedule immediately so the tick doesn't re-fire.
      const rescheduled = tasks.map(task => {
        if (!due.some(d => d.id === task.id)) return task;
        return {
          ...task,
          status: 'scheduled' as const,
          lastRunAt: new Date().toISOString(),
          nextRunAt: calculateNextRun(task.cronExpression || '*/15 * * * *'),
          runCount: (task.runCount || 0) + 1,
        };
      });
      onUpdateTasks(rescheduled);

      // Fire the REAL swarm run for each due task.
      for (const task of due) {
        setToast(`⚡ Cron: "${task.title}"`);
        setTimeout(() => setToast(null), 3000);
        try {
          const cronWorkerModel = taskModel || task.model || defaultWorkerModel;
          const result = await swarmService.run({
            goal: task.description ?? task.title,
            workerModel: cronWorkerModel,
            orchestratorModel: config.orchestratorModel || modelAssignments?.swarmOrchestratorModel || cronWorkerModel,
            maxConcurrent: config.maxConcurrent || 3,
          });
          onUpdateTasks(tasks.map(t => t.id === task.id
            ? { ...t, result: result.output, executionLog: [{ id: 'log-' + Date.now(), timestamp: new Date().toISOString(), status: 'completed' as const, output: `Cron run: ${result.output}` }, ...(t.executionLog || [])] }
            : t));
        } catch (err: any) {
          onUpdateTasks(tasks.map(t => t.id === task.id
            ? { ...t, executionLog: [{ id: 'log-' + Date.now(), timestamp: new Date().toISOString(), status: 'failed' as const, output: `Cron error: ${err?.message ?? err}` }, ...(t.executionLog || [])] }
            : t));
        }
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [tasks, onUpdateTasks]);

  const handleAdd = () => {
    if (!newTitle) return;
    const isCron = dispatchMode === 'cron';
    const validCron = isCron ? validateCron(cronExpr) : true;
    const finalExpr = isCron && validCron ? cronExpr : '*/15 * * * *';
    const now = new Date().toISOString();
    const newTask: SwarmTask = {
      id: 'task-' + Date.now(),
      name: newTitle,
      title: newTitle,
      description: newDesc,
      config: {},
      model: taskModel || 'openrouter/free',
      status: isCron ? 'scheduled' : 'pending',
      assignedAi: assignedAi || 'Nyx Swarm Agent',
      createdAt: now,
      updatedAt: now,
      isScheduled: isCron,
      cronExpression: isCron ? finalExpr : undefined,
      cronDescription: isCron ? describeCron(finalExpr) : undefined,
      scheduleEnabled: isCron ? true : undefined,
      nextRunAt: isCron ? calculateNextRun(finalExpr) : undefined,
      runCount: isCron ? 0 : undefined,
      executionLog: []
    };
    onUpdateTasks([newTask, ...tasks]);
    setNewTitle('');
    setNewDesc('');
  };

  const handleStart = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const setTask = (patch: Partial<SwarmTask>) =>
      onUpdateTasks(tasks.map(t => (t.id === id ? { ...t, ...patch } : t)));

    setTask({ status: 'running' as const });
    const logs: NonNullable<SwarmTask['executionLog']> = [
      { id: 'log-' + Date.now(), timestamp: new Date().toISOString(), status: 'running' as const, output: `Swarm started: "${task.title}"` },
    ];
    setTask({ executionLog: logs });

    try {
      // Use the CURRENT dropdown selection at run time (not the model frozen
      // into the task at creation), so changing the worker model works.
      const runWorkerModel = taskModel || task.model || defaultWorkerModel;
      const result = await swarmService.run({
        goal: task.description ?? task.title,
        workerModel: runWorkerModel,
        orchestratorModel: config.orchestratorModel || modelAssignments?.swarmOrchestratorModel || runWorkerModel,
        maxConcurrent: config.maxConcurrent || 3,
        onProgress: (ev) => {
          logs.unshift({
            id: 'log-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
            timestamp: new Date().toISOString(),
            status: ev.phase === 'error' ? ('failed' as const) : ('running' as const),
            output: `[${ev.phase}] ${ev.message}`,
          });
          setTask({ executionLog: [...logs] });
        },
      });

      const finalLog = {
        id: 'log-' + Date.now(),
        timestamp: new Date().toISOString(),
        status: (result.success ? 'completed' : 'failed') as 'completed' | 'failed',
        output: result.output,
      };
      setTask({
        status: result.success ? ('completed' as const) : ('failed' as const),
        result: result.output,
        completedAt: new Date().toISOString(),
        executionLog: [finalLog, ...logs],
      } as Partial<SwarmTask>);
      setToast(result.success ? `✅ Swarm complete (${result.metrics.totalDurationMs}ms)` : '⚠️ Swarm had failures');
    } catch (err: any) {
      const finalLog = {
        id: 'log-' + Date.now(),
        timestamp: new Date().toISOString(),
        status: 'failed' as const,
        output: `Swarm error: ${err?.message ?? err}`,
      };
      setTask({ status: 'failed' as const, executionLog: [finalLog, ...logs] });
      setToast('❌ Swarm failed — see logs');
    } finally {
      setTimeout(() => setToast(null), 4000);
    }
  };

  const handleTriggerCron = (task: SwarmTask) => {
    const runNum = (task.runCount || 0) + 1;
    const nextRun = calculateNextRun(task.cronExpression || '*/15 * * * *');
    const log = { id: 'log-' + Date.now(), timestamp: new Date().toISOString(), status: 'completed' as const, output: `Manual trigger #${runNum}` };
    const updated = tasks.map(t => {
      if (t.id === task.id) {
        return { ...t, lastRunAt: new Date().toISOString(), nextRunAt: nextRun, runCount: runNum, result: log.output, executionLog: [log, ...(t.executionLog || [])] };
      }
      return t;
    });
    onUpdateTasks(updated);
    setToast(`Triggered "${task.title}"`);
    setTimeout(() => setToast(null), 3000);
  };

  const handleToggleSchedule = (id: string) => {
    onUpdateTasks(tasks.map(t => {
      if (t.id === id) {
        const nextEnabled = !t.scheduleEnabled;
        return { ...t, scheduleEnabled: nextEnabled, nextRunAt: nextEnabled ? calculateNextRun(t.cronExpression || '*/15 * * * *') : undefined };
      }
      return t;
    }));
  };

  const handleDelete = (id: string) => {
    onUpdateTasks(tasks.filter(t => t.id !== id));
  };

  const filtered = tasks.filter(t => {
    if (activeFilter === 'cron') return t.isScheduled;
    if (activeFilter === 'immediate') return !t.isScheduled;
    if (activeFilter === 'completed') return t.status === 'completed';
    return true;
  });

  const allLogs = useMemo(() => {
    const entries: any[] = [];
    tasks.forEach(t => {
      if (t.executionLog) {
        t.executionLog.forEach(log => {
          entries.push({ ...log, taskId: t.id, taskTitle: t.title, isCron: t.isScheduled, assignedAi: t.assignedAi, model: t.model });
        });
      }
      if (t.status === 'completed' && t.completedAt) {
        entries.push({ id: 'completed-' + t.id, timestamp: t.completedAt, status: 'completed', output: t.result || 'Done', taskId: t.id, taskTitle: t.title, isCron: t.isScheduled, assignedAi: t.assignedAi, model: t.model });
      }
    });
    return entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [tasks]);

  const filteredLogs = allLogs.filter(log => {
    if (historyFilter === 'completed' && log.status !== 'completed') return false;
    if (historyFilter === 'failed' && log.status !== 'failed') return false;
    if (historyFilter === 'cron' && !log.isCron) return false;
    if (historySearch.trim()) {
      const q = historySearch.toLowerCase();
      return log.taskTitle.toLowerCase().includes(q) || log.output.toLowerCase().includes(q);
    }
    return true;
  });

  const scheduled = tasks.filter(t => t.isScheduled);
  const immediate = tasks.filter(t => !t.isScheduled);
  const completed = tasks.filter(t => t.status === 'completed');

  return (
    <div className="space-y-6 pb-16 md:pb-6">
      {toast && (
        <div className="fixed top-16 right-4 z-50 bg-[#10b981] text-slate-950 px-4 py-2.5 rounded-xl font-bold text-xs shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <Activity className="w-4 h-4 animate-spin" /> {toast}
        </div>
      )}

      <div className="flex flex-col flex-col items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-[#10b981] flex items-center gap-2">
            <Bot className="w-5 h-5" /> Swarm & Cron
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Multi-agent orchestration with cron scheduling</p>
        </div>
        <button onClick={() => setShowConfig(!showConfig)}
          className="p-2.5 text-slate-300 hover:text-[#10b981] bg-slate-900/90 rounded-xl border border-slate-800 min-h-[44px] min-w-[44px] flex items-center justify-center transition-all">
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {showConfig && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl">
          <h3 className="font-bold text-sm text-slate-200">Orchestrator Settings</h3>
          <div className="grid grid-cols-1 grid-cols-1 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Orchestrator Model</label>
              <SearchableModelSelect
                value={config.orchestratorModel || modelAssignments?.swarmOrchestratorModel || ''}
                onChange={(val) => onUpdateConfig({ ...config, orchestratorModel: val })}
                models={workerModelOptions}
                placeholder={`Default (${modelAssignments?.swarmOrchestratorModel || 'Not assigned'})`}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Max Parallel</label>
              <input type="number" value={config.maxConcurrent || 3}
                onChange={e => onUpdateConfig({ ...config, maxConcurrent: Number(e.target.value) || 3 })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-[#10b981] min-h-[44px]" />
            </div>
          </div>
        </div>
      )}

      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-md">
        <div className="flex flex-col flex-col items-start justify-between gap-2 pb-2 border-b border-slate-800">
          <h3 className="font-bold text-xs text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Plus className="w-4 h-4 text-[#10b981]" /> New Task
          </h3>
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button onClick={() => handleModeChange('immediate')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${dispatchMode === 'immediate' ? 'bg-slate-800 text-slate-100 shadow border border-slate-700' : 'text-slate-400 hover:text-slate-200'}`}>
              <Zap className="w-3.5 h-3.5 text-amber-400" /> Immediate
            </button>
            <button onClick={() => handleModeChange('cron')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${dispatchMode === 'cron' ? 'bg-[#10b981]/20 text-[#10b981] shadow border border-[#10b981]/40' : 'text-slate-400 hover:text-slate-200'}`}>
              <CalendarDays className="w-3.5 h-3.5 text-[#10b981]" /> Cron
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 grid-cols-1 gap-3">
          <input type="text" placeholder="Task title" value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            className="bg-slate-800/90 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-[#10b981] min-h-[44px]" />
          <select value={assignedAi} onChange={e => setAssignedAi(e.target.value)}
            className="bg-slate-800/90 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-[#10b981] min-h-[44px]">
            <option value="Nyx Swarm Leader">Nyx Swarm Leader</option>
            <option value="Nyx Cron Scheduler">Nyx Cron Scheduler</option>
            <option value="Nyx Code Auditor">Nyx Code Auditor</option>
            <option value="Sigma Sovereign Agent">Sigma Sovereign Agent</option>
            <option value="Echo Continuity Sentinel">Echo Continuity Sentinel</option>
          </select>
        </div>

        {/* Model Selection Row */}
        <div>
          <label className="block text-[11px] text-slate-400 mb-1 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Cpu className="w-3 h-3 text-[#10b981]" />
              Model ({dispatchMode === 'cron' ? 'Cron Task Model' : 'Swarm Worker Model'})
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              Role default: {dispatchMode === 'cron' ? modelAssignments?.cronTasksDefaultModel || 'Auto' : modelAssignments?.swarmWorkerModel || 'Auto'}
            </span>
          </label>
          <SearchableModelSelect
            value={taskModel}
            onChange={(val) => setTaskModel(val)}
            models={workerModelOptions}
            placeholder="Search and select task execution model..."
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] text-slate-400">Instructions / Payload</label>
            {prompts && prompts.length > 0 && (
              <SearchablePromptSelect
                prompts={prompts}
                onSelectPrompt={(content) => setNewDesc(content)}
                triggerLabel="From Prompt Library"
              />
            )}
          </div>
          <textarea
            placeholder="Instructions / payload for the worker or cron task..."
            value={newDesc}
            onChange={e => setNewDesc(e.target.value)}
            rows={2}
            className="w-full bg-slate-800/90 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-[#10b981]"
          />
        </div>

        {dispatchMode === 'cron' && (
          <div className="bg-slate-950/80 border border-[#10b981]/30 rounded-xl p-3.5 space-y-3 animate-in fade-in duration-200">
            <div className="flex flex-wrap gap-1.5">
              {CRON_PRESETS.map(p => (
                <button key={p.expression} onClick={() => setCronExpr(p.expression)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono border transition-all ${cronExpr === p.expression ? 'bg-[#10b981]/20 border-[#10b981] text-[#10b981] font-bold' : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'}`}>
                  {p.label}
                </button>
              ))}
            </div>
            <input type="text" value={cronExpr} onChange={e => setCronExpr(e.target.value)}
              placeholder="e.g. */15 * * * *"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 font-mono text-xs text-[#10b981] font-bold focus:outline-none focus:border-[#10b981] min-h-[42px]" />
            {validateCron(cronExpr) ? (
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-[#10b981]" /> {describeCron(cronExpr)}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-amber-400">
                <AlertCircle className="w-4 h-4" /> Invalid cron syntax
              </div>
            )}
          </div>
        )}

        <button onClick={handleAdd} disabled={!newTitle || (dispatchMode === 'cron' && !validateCron(cronExpr))}
          className={`w-full flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[44px] active:scale-95 disabled:opacity-50 ${dispatchMode === 'cron' ? 'bg-[#10b981]/20 text-[#10b981] hover:bg-[#10b981]/30 border border-[#10b981]/50' : 'bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 border border-indigo-500/40'}`}>
          {dispatchMode === 'cron' ? <CalendarDays className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          <span>{dispatchMode === 'cron' ? 'Schedule Cron Task' : 'Add to Queue'}</span>
        </button>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'all', label: `All (${tasks.length})` },
            { id: 'cron', label: `Cron (${scheduled.length})` },
            { id: 'immediate', label: `Queue (${immediate.length})` },
            { id: 'completed', label: `Done (${completed.length})` }
          ].map(f => (
            <button key={f.id} onClick={() => setActiveFilter(f.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all min-h-[36px] ${activeFilter === f.id ? 'bg-[#10b981]/20 border border-[#10b981]/50 text-[#10b981] font-bold' : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'}`}>
              {f.label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center text-xs text-slate-500">No tasks</div>
        ) : (
          filtered.map(task => {
            const isCron = task.isScheduled;
            const isPaused = isCron && task.scheduleEnabled === false;
            return (
              <div key={task.id} className={`bg-slate-900/90 border rounded-2xl p-4 flex flex-col flex-col items-start justify-between gap-3 shadow-sm transition-all ${isCron ? (isPaused ? 'border-amber-500/30' : 'border-[#10b981]/40') : 'border-slate-800'}`}>
                <div className="space-y-1 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${isCron ? (isPaused ? 'bg-amber-400' : 'bg-[#10b981] animate-pulse') : task.status === 'completed' ? 'bg-[#10b981]' : task.status === 'running' ? 'bg-indigo-400 animate-ping' : 'bg-slate-500'}`} />
                    <h4 className="font-bold text-xs text-slate-200">{task.title}</h4>
                    {isCron && <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/30">CRON</span>}
                  </div>
                  {task.description && <p className="text-xs text-slate-400 line-clamp-2">{task.description}</p>}
                  <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-slate-500">
                    <span>Model: {task.model}</span>
                    <span>Agent: {task.assignedAi}</span>
                    {isCron && task.runCount !== undefined && <span className="text-[#10b981]">Runs: {task.runCount}</span>}
                  </div>
                  {isCron && (
                    <div className="pt-1.5 text-[11px] font-mono text-slate-400 border-t border-slate-800/80">
                      Next: {isPaused ? 'Paused' : getTimeUntil(task.nextRunAt || '')}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 pt-2 sm:pt-0 border-t sm:border-0 border-slate-800">
                  {isCron && (
                    <>
                      <button onClick={() => handleToggleSchedule(task.id)}
                        className={`p-2 rounded-xl text-xs font-bold border min-h-[40px] flex items-center justify-center gap-1 transition-all ${isPaused ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-slate-800 text-slate-300 border-slate-700'}`}>
                        {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => handleTriggerCron(task)}
                        className="px-3 py-2 bg-[#10b981]/20 hover:bg-[#10b981]/30 text-[#10b981] border border-[#10b981]/40 font-bold rounded-xl text-xs min-h-[40px]">
                        Run Now
                      </button>
                      <button onClick={() => setSelectedLogsTask(task)}
                        className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 min-h-[40px] min-w-[40px]">
                        <History className="w-4 h-4 text-[#10b981]" />
                      </button>
                    </>
                  )}
                  {!isCron && task.status === 'pending' && (
                    <button onClick={() => handleStart(task.id)}
                      className="px-3 py-2 bg-[#10b981]/20 text-[#10b981] hover:bg-[#10b981]/30 border border-[#10b981]/40 rounded-xl text-xs font-bold min-h-[40px]">
                      <Play className="w-3.5 h-3.5 inline mr-1" /> Start
                    </button>
                  )}
                  {!isCron && task.status === 'running' && (
                    <span className="px-3 py-2 bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 rounded-xl text-xs font-bold animate-pulse">Running...</span>
                  )}
                  <button onClick={() => handleDelete(task.id)}
                    className="p-2 text-slate-500 hover:text-red-400 rounded-xl hover:bg-red-500/10 min-h-[40px] min-w-[40px]">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* History Logs */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-lg">
        <div className="flex flex-col flex-col items-start justify-between gap-3 pb-3 border-b border-slate-800">
          <h3 className="font-extrabold text-sm text-slate-100 flex items-center gap-2">
            <History className="w-4 h-4 text-[#10b981]" /> Execution Logs
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'all', label: `All (${allLogs.length})` },
            { id: 'completed', label: 'Success' },
            { id: 'failed', label: 'Failed' },
            { id: 'cron', label: 'Cron' }
          ].map(f => (
            <button key={f.id} onClick={() => setHistoryFilter(f.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all min-h-[36px] ${historyFilter === f.id ? 'bg-[#10b981]/20 border border-[#10b981]/50 text-[#10b981] font-bold' : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'}`}>
              {f.label}
            </button>
          ))}
          <div className="relative flex-1 max-w-xs ml-auto">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input type="text" placeholder="Search logs..." value={historySearch}
              onChange={e => setHistorySearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-[#10b981] min-h-[36px]" />
          </div>
        </div>

        <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1">
          {filteredLogs.length === 0 ? (
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-8 text-center text-xs text-slate-500">No logs found</div>
          ) : (
            filteredLogs.map(log => (
              <div key={log.id} className="bg-slate-950/90 border border-slate-800/90 rounded-xl p-3.5 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs border-b border-slate-900 pb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${log.status === 'completed' ? 'bg-[#10b981]/15 text-[#10b981] border-[#10b981]/30' : 'bg-rose-500/15 text-rose-400 border-rose-500/30'}`}>
                      {log.status === 'completed' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {log.status.toUpperCase()}
                    </span>
                    {log.isCron && <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">CRON</span>}
                    <span className="font-bold text-slate-200 text-xs">{log.taskTitle}</span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">{new Date(log.timestamp).toLocaleString()}</span>
                </div>
                <div className="text-[11px] font-mono text-slate-300 whitespace-pre-wrap select-text bg-slate-900/90 border border-slate-800/80 rounded-lg p-2.5">
                  {log.output}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Logs Modal */}
      {selectedLogsTask && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e1628] border border-[#10b981]/40 rounded-2xl max-w-2xl w-full p-5 space-y-4 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
              <div>
                <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                  <History className="w-4 h-4 text-[#10b981]" /> {selectedLogsTask.title}
                </h3>
                <p className="text-xs text-[#10b981] font-mono">{selectedLogsTask.cronExpression}</p>
              </div>
              <button onClick={() => setSelectedLogsTask(null)}
                className="text-xs text-slate-400 hover:text-white px-2.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700">
                Close
              </button>
            </div>
            <div className="space-y-2 overflow-y-auto pr-1 flex-1">
              {!selectedLogsTask.executionLog || selectedLogsTask.executionLog.length === 0 ? (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 text-center text-xs text-slate-500">No logs yet</div>
              ) : (
                selectedLogsTask.executionLog.map(log => (
                  <div key={log.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5 font-mono text-xs">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pb-1 border-b border-slate-900">
                      <span className="text-[#10b981] font-bold">{log.status.toUpperCase()}</span>
                      <span>{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                    <p className="text-slate-300 text-xs whitespace-pre-wrap">{log.output}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};