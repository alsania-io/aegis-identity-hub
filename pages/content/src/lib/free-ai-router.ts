import './node-shims';

/**
 * Aegis Identity Hub - Free AI Routing Engine
 * Powered by @alsania-io/ai-router (Alsania Ecosystem)
 * Protocol-neutral AI provider routing, quota tracking, resilience, and capability orchestration.
 */

import {
  CapabilityRouter,
  Registry,
  MemoryConfigurationSource,
  QuotaTracker,
  CircuitBreaker,
  EventBus,
  LowestLatencyStrategy,
  AdaptiveHealthStrategy,
  ALL_CAPABILITIES,
  Capability,
  ProviderLoader,
  GoogleAIStudioAdapter,
  GroqAdapter,
  SambaNovaAdapter,
  NvidiaNimAdapter,
  CohereAdapter,
  OpenRouterAdapter,
  OpenCodeZenAdapter,
  BazaarlinkAdapter,
  AimlApiAdapter,
  OvhCloudAdapter,
  JinaAdapter,
  VoyageAdapter,
  HuggingFaceAdapter,
  CloudflareWorkersAIAdapter,
  GoogleCloudAdapter,
  MyMemoryAdapter,
  UnstructuredAdapter,
  ExaAdapter,
  TavilyAdapter,
  OllamaAdapter,
} from '@alsania-io/ai-router';

// Import the bundled provider catalog directly
import providersCatalog from '@alsania-io/ai-router/src/config/providers.json';
import { ModelsState, ModelProviderConfig } from '../types/identity';
import { createLogger } from '@extension/shared/lib/logger';

const logger = createLogger('FreeAiRouter');

export type RouterStrategyType = 'lowest-latency' | 'adaptive-health';

export interface FreeAiRouteRequest {
  prompt: string;
  systemPrompt?: string;
  capabilities?: Capability[];
  preferredProvider?: string;
  preferredModel?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  strategy?: RouterStrategyType;
  modelsState?: ModelsState;
}

export interface FreeAiRouteResult {
  success: boolean;
  servedBy?: {
    provider: string;
    model: string;
  };
  output: string;
  latencyMs: number;
  error?: string;
  fallbackTriggered?: boolean;
  meta?: {
    candidatesEvaluated?: number;
    strategyUsed?: string;
    circuitState?: string;
  };
}

export interface RouterTelemetryEvent {
  id: string;
  timestamp: string;
  type: 'start' | 'success' | 'rate_limited' | 'circuit_break' | 'error';
  message: string;
  providerId?: string;
  modelId?: string;
  latencyMs?: number;
}

// Router Singleton and State
class FreeAiRouterService {
  private registry: Registry;
  private quotaTracker: QuotaTracker;
  private circuitBreaker: CircuitBreaker;
  private eventBus: EventBus;
  private lowestLatencyStrategy: LowestLatencyStrategy;
  private adaptiveHealthStrategy: AdaptiveHealthStrategy;
  private currentStrategyType: RouterStrategyType = 'lowest-latency';
  private router: CapabilityRouter;
  private eventHistory: RouterTelemetryEvent[] = [];
  private maxHistoryLength = 50;

  constructor() {
    // 0. Explicitly register all 20 provider adapters to bypass filesystem auto-discovery in browser
    try {
      (ProviderLoader as any).initialized = true;
      const builtinAdapters: Array<[string, any]> = [
        ['google_ai_studio', GoogleAIStudioAdapter],
        ['groq', GroqAdapter],
        ['sambanova', SambaNovaAdapter],
        ['nvidia_nim', NvidiaNimAdapter],
        ['cohere', CohereAdapter],
        ['openrouter', OpenRouterAdapter],
        ['opencode_zen', OpenCodeZenAdapter],
        ['bazaarlink_ai', BazaarlinkAdapter],
        ['aimlapi', AimlApiAdapter],
        ['ovhcloud_ai_endpoints', OvhCloudAdapter],
        ['jina_ai', JinaAdapter],
        ['voyage_ai', VoyageAdapter],
        ['huggingface', HuggingFaceAdapter],
        ['cloudflare_workers_ai', CloudflareWorkersAIAdapter],
        ['google_cloud', GoogleCloudAdapter],
        ['mymemory', MyMemoryAdapter],
        ['unstructured_io', UnstructuredAdapter],
        ['exa_ai', ExaAdapter],
        ['tavily', TavilyAdapter],
        ['ollama', OllamaAdapter],
      ];
      for (const [id, cls] of builtinAdapters) {
        if (cls) {
          ProviderLoader.register(id, cls);
        }
      }
    } catch (e) {
      logger.warn('Failed to pre-register router adapters:', e);
    }

    // 1. Initialize configuration source with the Alsania providers catalog
    const configSource = new MemoryConfigurationSource(providersCatalog as any);
    this.registry = new Registry(configSource);

    // 2. Initialize resilience components
    this.quotaTracker = new QuotaTracker();
    this.circuitBreaker = new CircuitBreaker();
    this.eventBus = new EventBus();
    this.lowestLatencyStrategy = new LowestLatencyStrategy();
    this.adaptiveHealthStrategy = new AdaptiveHealthStrategy();

    // 3. Setup router with default lowest latency strategy
    this.router = new CapabilityRouter(
      this.registry,
      this.quotaTracker,
      this.circuitBreaker,
      undefined,
      this.eventBus,
      this.lowestLatencyStrategy
    );

    // 4. Hook telemetry events
    this.attachTelemetryListeners();
    logger.info('Free AI Router initialized with 20 provider adapters and 70+ capability models.');
  }

  private attachTelemetryListeners() {
    this.eventBus.on('request:start', (data: any) => {
      this.addEvent({
        id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
        type: 'start',
        message: `Routing capability request: [${(data.capabilities || []).join(', ')}]`,
        providerId: data.preferredProvider,
        modelId: data.preferredModel,
      });
    });

    this.eventBus.on('request:success', (data: any) => {
      this.addEvent({
        id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
        type: 'success',
        message: `Request fulfilled by ${data.providerId} (${data.modelId}) in ${data.latencyMs}ms`,
        providerId: data.providerId,
        modelId: data.modelId,
        latencyMs: data.latencyMs,
      });
    });

    this.eventBus.on('provider:rate_limited', (data: any) => {
      this.addEvent({
        id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
        type: 'rate_limited',
        message: `Provider ${data.providerId} rate-limited. Retry after ${data.retryAfterMs || 5000}ms. Auto-failing over...`,
        providerId: data.providerId,
        modelId: data.modelId,
      });
    });
  }

  private addEvent(event: RouterTelemetryEvent) {
    this.eventHistory.unshift(event);
    if (this.eventHistory.length > this.maxHistoryLength) {
      this.eventHistory.pop();
    }
  }

  public setStrategy(type: RouterStrategyType) {
    this.currentStrategyType = type;
    const strategy = type === 'adaptive-health' ? this.adaptiveHealthStrategy : this.lowestLatencyStrategy;
    this.router = new CapabilityRouter(
      this.registry,
      this.quotaTracker,
      this.circuitBreaker,
      undefined,
      this.eventBus,
      strategy
    );
    logger.info(`Free AI Router strategy switched to: ${type}`);
  }

  public getStrategy(): RouterStrategyType {
    return this.currentStrategyType;
  }

  /**
   * Synchronizes API keys from Aegis state or local storage into process.env
   * so provider adapters can resolve them dynamically.
   */
  public syncKeysToEnvironment(modelsState?: ModelsState) {
    if (typeof globalThis === 'undefined') return;
    const env = ((globalThis as any).process = (globalThis as any).process || {}).env || {};
    (globalThis as any).process.env = env;

    if (!modelsState?.providers) return;

    for (const [id, prov] of Object.entries(modelsState.providers)) {
      if (prov.enabled && prov.apiKey && prov.apiKey.trim().length > 3 && prov.apiKey !== 'not-needed') {
        const key = prov.apiKey.trim();
        switch (id) {
          case 'groq':
            env.GROQ_API_KEY = key;
            break;
          case 'google_ai_studio':
          case 'gemini':
            env.GOOGLE_AI_STUDIO_API_KEY = key;
            env.GOOGLE_API_KEY = key;
            break;
          case 'openrouter':
            env.OPENROUTER_API_KEY = key;
            break;
          case 'cohere':
            env.COHERE_API_KEY = key;
            break;
          case 'huggingface':
            env.HUGGINGFACE_API_KEY = key;
            break;
          case 'sambanova':
            env.SAMBANOVA_API_KEY = key;
            break;
          case 'nvidia_nim':
            env.NVIDIA_NIM_API_KEY = key;
            break;
          case 'bazaarlink':
          case 'bazaarlink_ai':
            env.BAZAARLINK_AI_API_KEY = key;
            break;
          default:
            const varName = id.toUpperCase().replace(/[^A-Z0-9_]/g, '_') + '_API_KEY';
            env[varName] = key;
            break;
        }
      }
    }
  }

  /**
   * Returns list of providers that have an API key configured or are local/free
   */
  public getConfiguredProviderIds(modelsState?: ModelsState): string[] {
    const configured: string[] = ['ollama']; // Ollama doesn't require keys
    if (modelsState?.providers) {
      for (const [id, prov] of Object.entries(modelsState.providers)) {
        if (prov.enabled && prov.apiKey && prov.apiKey.trim().length > 3 && prov.apiKey !== 'not-needed') {
          if (id === 'gemini') configured.push('google_ai_studio');
          else if (id === 'bazaarlink') configured.push('bazaarlink_ai');
          else configured.push(id);
        }
      }
    }
    return Array.from(new Set(configured));
  }

  /**
   * Routes and executes an AI request using @alsania-io/ai-router
   */
  public async route(request: FreeAiRouteRequest): Promise<FreeAiRouteResult> {
    const startTime = performance.now();
    this.syncKeysToEnvironment(request.modelsState);

    if (request.strategy && request.strategy !== this.currentStrategyType) {
      this.setStrategy(request.strategy);
    }

    const capabilities: Capability[] = request.capabilities && request.capabilities.length > 0
      ? request.capabilities
      : ['text'];

    // Construct unified messages payload
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];
    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }
    messages.push({ role: 'user', content: request.prompt });

    const payload: any = {
      messages,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? 2048,
    };

    // Determine candidate providers to try
    const configured = this.getConfiguredProviderIds(request.modelsState);
    const hasKeys = configured.length > 1; // More than just 'ollama'

    try {
      // 1. Attempt primary routing via @alsania-io/ai-router
      const routerRequest: any = {
        capabilities,
        payload,
        timeoutMs: request.timeoutMs ?? 18000,
        preferredProvider: request.preferredProvider,
        preferredModel: request.preferredModel,
      };

      // If user hasn't configured external keys, prefer free/local candidates
      if (!hasKeys && !request.preferredProvider) {
        routerRequest.preferredProvider = 'ollama';
      }

      const response: any = await this.router.route(routerRequest);
      const latencyMs = Math.round(performance.now() - startTime);

      // Extract text content from unified response
      let outputText = '';
      if (typeof response?.data === 'string') {
        outputText = response.data;
      } else if (response?.data?.choices?.[0]?.message?.content) {
        outputText = response.data.choices[0].message.content;
      } else if (response?.data?.response) {
        outputText = response.data.response;
      } else if (response?.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        outputText = response.data.candidates[0].content.parts[0].text;
      } else if (response?.data) {
        outputText = JSON.stringify(response.data);
      }

      return {
        success: true,
        servedBy: response.servedBy || {
          provider: 'free-ai-router',
          model: request.preferredModel || 'auto',
        },
        output: outputText,
        latencyMs,
        meta: {
          strategyUsed: this.currentStrategyType,
          circuitState: 'closed (healthy)',
        },
      };
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - startTime);
      logger.warn(`Primary @alsania-io/ai-router route failed: ${err.message}. Checking resilient fallback...`);

      // 2. Intelligent local fallback if Ollama or LM Studio is alive
      try {
        const localCheck = await fetch('http://localhost:11434/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'llama3.2:3b',
            prompt: `${request.systemPrompt ? request.systemPrompt + '\n\n' : ''}${request.prompt}`,
            stream: false,
          }),
        });

        if (localCheck.ok) {
          const localData = await localCheck.json();
          return {
            success: true,
            servedBy: { provider: 'ollama (local fallback)', model: 'llama3.2:3b' },
            output: localData.response || '',
            latencyMs: Math.round(performance.now() - startTime),
            fallbackTriggered: true,
            meta: { strategyUsed: 'local-resilience' },
          };
        }
      } catch (_) {
        // Local engine not running
      }

      return {
        success: false,
        output: '',
        latencyMs,
        error: err.message || 'No free AI provider available. Check API keys in Settings > Models or run Ollama locally.',
        meta: {
          strategyUsed: this.currentStrategyType,
        },
      };
    }
  }

  /**
   * Diagnostic inspection of router health, quotas, circuits, and adapters
   */
  public getStatus(modelsState?: ModelsState) {
    const allAdapters = this.registry.getAllAdapters();
    const configuredIds = this.getConfiguredProviderIds(modelsState);

    const providerSummaries = allAdapters.map((adapter) => {
      const id = adapter.config.id;
      const isOpen = this.circuitBreaker.isOpen(id);
      const isConfigured = configuredIds.includes(id);
      return {
        id,
        name: adapter.config.name,
        baseUrl: adapter.config.base_url,
        modelCount: adapter.config.models.length,
        models: adapter.config.models.map((m: any) => ({
          id: m.id,
          capabilities: m.capabilities,
          limits: m.limits,
        })),
        isConfigured,
        circuitBreakerState: isOpen ? ('OPEN (tripped)' as const) : ('CLOSED (healthy)' as const),
      };
    });

    const capabilityStats: Record<string, number> = {};
    for (const cap of ALL_CAPABILITIES) {
      capabilityStats[cap] = this.registry.getCandidates([cap]).length;
    }

    return {
      version: '1.1.1',
      engine: '@alsania-io/ai-router',
      totalAdapters: allAdapters.length,
      totalModels: allAdapters.reduce((acc, a) => acc + (a.config.models?.length || 0), 0),
      strategy: this.currentStrategyType,
      configuredCount: configuredIds.length,
      configuredProviders: configuredIds,
      providers: providerSummaries,
      capabilities: capabilityStats,
      allSupportedCapabilities: ALL_CAPABILITIES,
      recentEvents: [...this.eventHistory],
    };
  }
}

// Global Singleton
export const freeAiRouter = new FreeAiRouterService();
