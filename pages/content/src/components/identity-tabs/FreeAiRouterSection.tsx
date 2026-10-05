import React, { useState, useEffect, useMemo } from 'react';
import {
  Zap,
  Activity,
  Shield,
  Layers,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Play,
  Copy,
  Check,
  Cpu,
  Clock,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Sliders,
  Terminal,
  Globe,
  Radio,
} from 'lucide-react';
import { freeAiRouter, RouterStrategyType, FreeAiRouteResult } from '../../lib/free-ai-router';
import { ModelsState } from '../../types/identity';
import type { Capability } from '@alsania-io/ai-router';

interface FreeAiRouterSectionProps {
  modelsState: ModelsState;
  onUpdateModelsState?: (newState: ModelsState) => void;
}

export const FreeAiRouterSection: React.FC<FreeAiRouterSectionProps> = ({
  modelsState,
}) => {
  const [selectedStrategy, setSelectedStrategy] = useState<RouterStrategyType>(
    () => freeAiRouter.getStrategy()
  );
  const [selectedCapability, setSelectedCapability] = useState<Capability>('text');
  const [testPrompt, setTestPrompt] = useState(
    'Explain how Alsania Code v3.0 protects AI agent sovereignty and prevents silent resets.'
  );
  const [preferredProvider, setPreferredProvider] = useState<string>('auto');
  const [isRouting, setIsRouting] = useState(false);
  const [routeResult, setRouteResult] = useState<FreeAiRouteResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Sync keys from modelsState into router environment
  useEffect(() => {
    freeAiRouter.syncKeysToEnvironment(modelsState);
  }, [modelsState]);

  // Fetch current router status
  const routerStatus = useMemo(() => {
    return freeAiRouter.getStatus(modelsState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelsState, refreshTrigger]);

  const handleStrategyChange = (strategy: RouterStrategyType) => {
    setSelectedStrategy(strategy);
    freeAiRouter.setStrategy(strategy);
  };

  const handleExecuteTest = async () => {
    if (!testPrompt.trim() || isRouting) return;
    setIsRouting(true);
    setRouteResult(null);

    try {
      const result = await freeAiRouter.route({
        prompt: testPrompt.trim(),
        capabilities: [selectedCapability],
        preferredProvider: preferredProvider === 'auto' ? undefined : preferredProvider,
        strategy: selectedStrategy,
        modelsState,
      });
      setRouteResult(result);
    } catch (err: any) {
      setRouteResult({
        success: false,
        output: '',
        latencyMs: 0,
        error: err.message || 'Routing failed',
      });
    } finally {
      setIsRouting(false);
      setRefreshTrigger((prev) => prev + 1);
    }
  };

  const handleCopy = (text: string) => {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Filter providers that support the currently selected capability
  const matchingProviders = useMemo(() => {
    return routerStatus.providers.filter((p) =>
      p.models.some((m: any) => m.capabilities.includes(selectedCapability))
    );
  }, [routerStatus.providers, selectedCapability]);

  return (
    <div className="space-y-6">
      {/* Top Banner & Strategy Control */}
      <div className="bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-emerald-950/40 border border-emerald-500/30 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col flex-col items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <Zap className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Free AI Routing Engine</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono border border-emerald-500/30">
                    @alsania-io/ai-router v1.1.1
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Protocol-neutral capability router with proactive quota tracking, circuit breakers, and zero token costs.
                </p>
              </div>
            </div>
          </div>

          {/* Strategy Selector Pills */}
          <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 p-1.5 rounded-xl">
            <span className="text-[11px] font-semibold text-slate-400 px-2 flex items-center gap-1">
              <Sliders className="w-3 h-3 text-cyan-400" />
              Strategy:
            </span>
            <button
              type="button"
              onClick={() => handleStrategyChange('lowest-latency')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedStrategy === 'lowest-latency'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              Lowest Latency
            </button>
            <button
              type="button"
              onClick={() => handleStrategyChange('adaptive-health')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedStrategy === 'adaptive-health'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              Adaptive Health
            </button>
          </div>
        </div>

        {/* Global Router Metrics Bar */}
        <div className="grid grid-cols-1 gap-3 mt-5 pt-4 border-t border-slate-800/80 text-xs">
          <div className="bg-slate-950/60 border border-slate-800/60 rounded-xl p-3">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Total Adapters</div>
            <div className="text-base font-bold text-white mt-0.5 flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-emerald-400" />
              <span>{routerStatus.totalAdapters} Providers</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Groq, Google, SambaNova, Ollama...</div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/60 rounded-xl p-3">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Capability Catalog</div>
            <div className="text-base font-bold text-white mt-0.5 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>{routerStatus.totalModels} Models</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Categorized across 15 capabilities</div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/60 rounded-xl p-3">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Resilience Engine</div>
            <div className="text-base font-bold text-emerald-300 mt-0.5 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Circuit Breaker Active</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Sliding-window RPM/RPD limits</div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/60 rounded-xl p-3">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Key Synchronization</div>
            <div className="text-base font-bold text-violet-300 mt-0.5 flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-violet-400" />
              <span>{routerStatus.configuredCount} Configured</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Synchronized with Hub Secrets</div>
          </div>
        </div>
      </div>

      {/* Main Grid: Interactive Test Console & Capability Inspector */}
      <div className="grid grid-cols-1 grid-cols-1 gap-6">
        {/* Left Column: Interactive Routing Test Runner (7 cols) */}
        <div className="w-full bg-[#0b1120] border border-slate-800/90 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">Live Router Test Dispatcher</h3>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              Strategy: <span className="text-emerald-400 font-semibold">{selectedStrategy}</span>
            </span>
          </div>

          {/* Capability Selector Pills */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Select AI Capability Target
            </label>
            <div className="flex flex-wrap gap-1.5">
              {routerStatus.allSupportedCapabilities.slice(0, 8).map((cap) => {
                const count = routerStatus.capabilities[cap] || 0;
                return (
                  <button
                    type="button"
                    key={cap}
                    onClick={() => setSelectedCapability(cap as Capability)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all flex items-center gap-1.5 ${
                      selectedCapability === cap
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/60 font-semibold'
                        : 'bg-slate-900/60 text-slate-400 border border-slate-800 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <span>{cap}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-400">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preferred Provider Selection */}
          <div className="grid grid-cols-1 grid-cols-1 gap-3 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Provider Preference</label>
              <select
                value={preferredProvider}
                onChange={(e) => setPreferredProvider(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
              >
                <option value="auto">⚡ Auto (Optimal Healthy Candidate)</option>
                <option value="groq">Groq (Ultra-Fast LPU)</option>
                <option value="google_ai_studio">Google AI Studio (Gemini 2.5 Flash)</option>
                <option value="openrouter">OpenRouter (Free Tier Pool)</option>
                <option value="sambanova">SambaNova (Llama 3.1 405B)</option>
                <option value="cohere">Cohere (Command R / Aya)</option>
                <option value="huggingface">Hugging Face Serverless</option>
                <option value="ollama">Ollama (Localhost / Offline)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Preset Prompts</label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() =>
                    setTestPrompt(
                      'Explain how Alsania Code v3.0 protects AI agent sovereignty and prevents silent resets.'
                    )
                  }
                  className="flex-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-lg px-2 py-2 text-[11px] truncate"
                >
                  Sovereignty Audit
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setTestPrompt(
                      'Write a TypeScript function to validate EVM Blake3 memory IDs with zero external dependencies.'
                    )
                  }
                  className="flex-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-lg px-2 py-2 text-[11px] truncate"
                >
                  EVM Coding
                </button>
              </div>
            </div>
          </div>

          {/* Prompt Textarea */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Input Payload
            </label>
            <textarea
              rows={3}
              value={testPrompt}
              onChange={(e) => setTestPrompt(e.target.value)}
              placeholder="Enter task or question to dispatch..."
              className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl p-3 text-xs text-slate-200 focus:outline-none resize-none font-mono"
            />
          </div>

          {/* Action Button */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-500">
              Dispatches through @alsania-io/ai-router with auto-failover
            </span>
            <button
              type="button"
              onClick={handleExecuteTest}
              disabled={isRouting || !testPrompt.trim()}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRouting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Routing Prompt...
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Dispatch via Free AI Router
                </>
              )}
            </button>
          </div>

          {/* Result Output Display */}
          {routeResult && (
            <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  {routeResult.success ? (
                    <span className="flex items-center gap-1.5 text-emerald-400 font-semibold font-mono">
                      <CheckCircle2 className="w-4 h-4" />
                      SUCCESS ({routeResult.latencyMs}ms)
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-rose-400 font-semibold font-mono">
                      <AlertCircle className="w-4 h-4" />
                      ROUTING FAILED
                    </span>
                  )}
                  {routeResult.servedBy && (
                    <span className="px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-cyan-300 font-mono text-[10px]">
                      Served by: {routeResult.servedBy.provider} • {routeResult.servedBy.model}
                    </span>
                  )}
                </div>

                {routeResult.output && (
                  <button
                    type="button"
                    onClick={() => handleCopy(routeResult.output)}
                    className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px]"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy Output'}</span>
                  </button>
                )}
              </div>

              {routeResult.output && (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 font-sans max-h-60 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                  {routeResult.output}
                </div>
              )}

              {routeResult.error && (
                <div className="bg-rose-950/20 border border-rose-500/40 rounded-xl p-3 text-xs text-rose-300 font-mono">
                  {routeResult.error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Providers & Quota / Circuit Inspector (5 cols) */}
        <div className="w-full bg-[#0b1120] border border-slate-800/90 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">
                Adapters for "{selectedCapability}" ({matchingProviders.length})
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setRefreshTrigger((prev) => prev + 1)}
              className="text-slate-400 hover:text-emerald-400 text-xs flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              Refresh
            </button>
          </div>

          <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
            {matchingProviders.map((provider) => {
              const isHealthy = provider.circuitBreakerState === 'CLOSED (healthy)';
              return (
                <div
                  key={provider.id}
                  className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-3 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-white flex items-center gap-1.5">
                      <Cpu className="w-3 h-3 text-slate-400" />
                      {provider.name}
                    </span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-semibold ${
                        isHealthy
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {isHealthy ? 'CIRCUIT CLOSED' : 'CIRCUIT TRIPPED'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="truncate max-w-[200px]">{provider.baseUrl}</span>
                    <span className="font-mono text-cyan-400">
                      {provider.models.length} model{provider.models.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Sample model limits */}
                  <div className="flex flex-wrap gap-1 pt-1">
                    {provider.models.slice(0, 3).map((m: any) => (
                      <span
                        key={m.id}
                        className="text-[9px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 font-mono border border-slate-800/60"
                      >
                        {m.id}
                        {m.limits?.rpm ? ` (${m.limits.rpm} RPM)` : ''}
                      </span>
                    ))}
                    {provider.models.length > 3 && (
                      <span className="text-[9px] px-1 py-0.5 text-slate-500 font-mono">
                        +{provider.models.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Telemetry & Failover Stream */}
      {routerStatus.recentEvents.length > 0 && (
        <div className="bg-[#0b1120] border border-slate-800/90 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              Real-time Router Event Stream
            </h3>
            <span className="text-[10px] text-slate-500 font-mono">
              EventBus listener ({routerStatus.recentEvents.length} events logged)
            </span>
          </div>

          <div className="space-y-1.5 max-h-40 overflow-y-auto font-mono text-[11px]">
            {routerStatus.recentEvents.map((ev) => (
              <div
                key={ev.id}
                className="flex items-center justify-between py-1 px-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60 text-slate-300"
              >
                <div className="flex items-center gap-2 truncate">
                  <span
                    className={`text-[9px] px-1 rounded uppercase font-bold ${
                      ev.type === 'success'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : ev.type === 'rate_limited'
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-cyan-500/20 text-cyan-300'
                    }`}
                  >
                    {ev.type}
                  </span>
                  <span className="truncate">{ev.message}</span>
                </div>
                <span className="text-[10px] text-slate-500 shrink-0 ml-2">
                  {new Date(ev.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
