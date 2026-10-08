import {
  AgentItem,
  BrowserTabTarget,
  DispatchTargetRoute,
  ModelProviderConfig,
  ModelProviderId,
  ModelsState,
} from '../types/identity';
import { useAdapterStore } from '../stores/adapter.store';
import { eventBus } from '../events/event-bus';
import { executeInTab, hostFromTabModel } from './cross-tab-client';
import { createLogger } from '@extension/shared/lib/logger';

const logger = createLogger('ModelDispatcher');

export interface RouteStatus {
  api: {
    ready: boolean;
    configuredCount: number;
    providers: string[];
  };
  local: {
    ready: boolean;
    endpoint: string;
    engine: 'ollama' | 'lmstudio' | 'vllm' | 'unknown' | 'none';
    models: string[];
    latencyMs?: number;
  };
  tab: {
    ready: boolean;
    currentHostname: string;
    detectedAdapter: string | null;
    isSupportedChatInterface: boolean;
    canInject: boolean;
  };
}

export interface ModelDispatchRequest {
  prompt: string;
  systemPrompt?: string;
  agent?: AgentItem;
  targetRoute?: DispatchTargetRoute; // 'auto' | 'api' | 'local' | 'tab'
  tabTarget?: BrowserTabTarget; // 'auto' | 'aistudio' | 'claude' | 'copilot' | 'chatgpt' | 'gemini'
  modelId?: string;
  providerId?: ModelProviderId;
  temperature?: number;
  maxTokens?: number;
  autoSubmitTab?: boolean; // Default true when tab is chosen
  /** timeout for cross-tab reply capture (ms), default 120000 */
  timeoutMs?: number;
}

export interface ModelDispatchResponse {
  success: boolean;
  routeUsed: 'api' | 'local' | 'tab';
  providerOrTarget: string;
  model: string;
  output: string;
  latencyMs: number;
  error?: string;
  fallbackTriggered?: boolean;
  meta?: {
    injectedIntoDom?: boolean;
    tokensIn?: number;
    tokensOut?: number;
  };
}

export const TAB_INTERFACES: Record<
  BrowserTabTarget,
  { name: string; hostPattern: string | RegExp; selectors: { input: string; button: string } }
> = {
  aistudio: {
    name: 'Google AI Studio',
    hostPattern: 'aistudio.google.com',
    selectors: {
      input:
        'textarea.textarea[placeholder*="prompt" i], textarea[aria-label*="prompt" i], ms-autosize-textarea textarea, .prompt-box-container textarea, textarea[placeholder*="Type something" i], textarea[placeholder*="Ask follow-up" i]',
      button:
        'button[aria-label*="Run" i], button.run-button, button[data-testid="run-button"], button[type="submit"], button[aria-label*="Submit" i], button[aria-label*="Send" i]',
    },
  },
  claude: {
    name: 'Anthropic Claude',
    hostPattern: 'claude.ai',
    selectors: {
      input:
        'div[contenteditable="true"][data-testid="composer-input"], div[contenteditable="true"], textarea[placeholder*="Reply " i], textarea[placeholder*="Talk " i]',
      button:
        'button[aria-label*="Send" i], button[data-testid="send-button"], button:has(svg[viewBox="0 0 16 16"]), button[type="submit"]',
    },
  },
  copilot: {
    name: 'Microsoft Copilot / GitHub',
    hostPattern: /copilot\.microsoft\.com|github\.com.*copilot|bing\.com.*chat/,
    selectors: {
      input:
        'textarea#userInput, textarea[placeholder*="Ask" i], textarea[placeholder*="Message" i], #copilot-chat-textarea, textarea[cib-control], div[contenteditable="true"][role="textbox"]',
      button:
        'button[aria-label*="Submit" i], button[aria-label*="Send" i], button:has(.octicon-paper-airplane), button[type="submit"]',
    },
  },
  chatgpt: {
    name: 'OpenAI ChatGPT',
    hostPattern: /chatgpt\.com|chat\.openai\.com/,
    selectors: {
      input: '#prompt-textarea, textarea[placeholder*="Message" i], div[contenteditable="true"][id="prompt-textarea"]',
      button: 'button[data-testid="send-button"], button[aria-label*="Send" i], button:has(svg.icon-send)',
    },
  },
  gemini: {
    name: 'Google Gemini',
    hostPattern: 'gemini.google.com',
    selectors: {
      input: '.ql-editor, div[contenteditable="true"][aria-label*="prompt" i], textarea[aria-label*="prompt" i]',
      button: 'button[aria-label*="Send" i], button.send-button, button[mat-icon-button]:has(mat-icon)',
    },
  },
  auto: {
    name: 'Auto-Detect Active Tab',
    hostPattern: /.*/,
    selectors: {
      input: 'textarea, div[contenteditable="true"]',
      button: 'button[type="submit"], button[aria-label*="Send" i], button[aria-label*="Run" i]',
    },
  },
};

/**
 * Probes status of all 3 routes (API, Local, Tab)
 */
export async function detectRouteStatus(modelsState?: ModelsState): Promise<RouteStatus> {
  const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';
  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  // 1. Detect Active Tab interface
  let matchedTabTarget: string | null = null;
  let canInject = false;
  let isSupportedChat = false;

  const adapterStore = useAdapterStore.getState();
  const activeAdapter = adapterStore.getActiveAdapter();

  if (activeAdapter) {
    matchedTabTarget = activeAdapter.plugin.name;
    isSupportedChat = true;
    canInject = true;
  } else {
    for (const [key, config] of Object.entries(TAB_INTERFACES)) {
      if (key === 'auto') continue;
      const matches =
        typeof config.hostPattern === 'string'
          ? currentHost.includes(config.hostPattern)
          : config.hostPattern.test(currentUrl);
      if (matches) {
        matchedTabTarget = config.name;
        isSupportedChat = true;
        const el = document.querySelector(config.selectors.input);
        canInject = !!el;
        break;
      }
    }
  }

  // 2. Check Local Engine (Ollama / LM Studio)
  let localReady = false;
  let localEngine: RouteStatus['local']['engine'] = 'none';
  let localModels: string[] = [];
  let localLatency = 0;

  try {
    const start = performance.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 800);

    // Try Ollama first
    const ollamaResp = await fetch('http://localhost:11434/api/tags', {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    }).catch(() => null);

    clearTimeout(timeout);

    if (ollamaResp && ollamaResp.ok) {
      const data = await ollamaResp.json();
      localReady = true;
      localEngine = 'ollama';
      localModels = (data.models || []).map((m: any) => m.name || m.model);
      localLatency = Math.round(performance.now() - start);
    } else {
      // Try LM Studio on :1234
      const lmController = new AbortController();
      const lmTimeout = setTimeout(() => lmController.abort(), 600);
      const lmResp = await fetch('http://localhost:1234/v1/models', {
        signal: lmController.signal,
      }).catch(() => null);
      clearTimeout(lmTimeout);

      if (lmResp && lmResp.ok) {
        const data = await lmResp.json();
        localReady = true;
        localEngine = 'lmstudio';
        localModels = (data.data || []).map((m: any) => m.id);
        localLatency = Math.round(performance.now() - start);
      }
    }
  } catch {
    localReady = false;
  }

  // 3. Check Configured API Keys
  const providersWithKeys: string[] = [];
  if (modelsState?.providers) {
    for (const [id, prov] of Object.entries(modelsState.providers)) {
      if (prov.enabled && prov.apiKey && prov.apiKey.trim().length > 3 && prov.apiKey !== 'not-needed') {
        providersWithKeys.push(prov.name);
      }
    }
  }

  return {
    api: {
      ready: providersWithKeys.length > 0,
      configuredCount: providersWithKeys.length,
      providers: providersWithKeys,
    },
    local: {
      ready: localReady,
      endpoint: localEngine === 'lmstudio' ? 'http://localhost:1234' : 'http://localhost:11434',
      engine: localEngine,
      models: localModels,
      latencyMs: localLatency,
    },
    tab: {
      ready: isSupportedChat,
      currentHostname: currentHost,
      detectedAdapter: matchedTabTarget,
      isSupportedChatInterface: isSupportedChat,
      canInject,
    },
  };
}

/**
 * Injects prompt text directly into the active browser tab's chat interface
 */
export async function dispatchToActiveTab(
  prompt: string,
  options: {
    agentName?: string;
    agentRole?: string;
    systemPrompt?: string;
    autoSubmit?: boolean;
    tabTarget?: BrowserTabTarget;
  } = {}
): Promise<{ success: boolean; message: string; target: string }> {
  const { agentName, agentRole, systemPrompt, autoSubmit = true, tabTarget = 'auto' } = options;

  // Format prompt with persona context if agent identity provided
  let formattedPrompt = prompt;
  if (agentName) {
    const header = `[Agent: ${agentName}${agentRole ? ` — ${agentRole}` : ''}]`;
    formattedPrompt = systemPrompt
      ? `${header}\n${systemPrompt}\n\nUser Task:\n${prompt}`
      : `${header}\n${prompt}`;
  }

  // 1. Check if an active adapter is running in useAdapterStore
  const adapterStore = useAdapterStore.getState();
  const activeAdapterReg = adapterStore.getActiveAdapter();

  if (activeAdapterReg && activeAdapterReg.plugin) {
    try {
      const plugin = activeAdapterReg.plugin;
      if (typeof plugin.insertText === 'function') {
        // Baseline: count assistant messages BEFORE we send, so readResponse
        // can detect the NEW reply that belongs to this prompt.
        const anyPlugin = plugin as any;
        const baselineCount =
          typeof anyPlugin.countAssistantMessages === 'function'
            ? anyPlugin.countAssistantMessages()
            : 0;

        const insertOk = await plugin.insertText(formattedPrompt);
        if (insertOk) {
          if (autoSubmit && typeof plugin.submitForm === 'function') {
            await new Promise(r => setTimeout(r, 150));
            await plugin.submitForm();
          }

          // If the adapter supports reading the reply, wait for it and return it.
          if (typeof anyPlugin.readResponse === 'function') {
            const resp = await anyPlugin.readResponse({ baselineCount });
            eventBus.emit('agent:dispatched-to-tab', {
              target: plugin.name,
              promptLength: formattedPrompt.length,
              submitted: autoSubmit,
            });
            return {
              success: true,
              message: resp?.success ? resp.text : `Dispatched to ${plugin.name} (no reply captured)`,
              target: plugin.name,
            };
          }

          // Adapter has no response capture — legacy submit-only behaviour.
          eventBus.emit('agent:dispatched-to-tab', {
            target: plugin.name,
            promptLength: formattedPrompt.length,
            submitted: autoSubmit,
          });
          return {
            success: true,
            message: `Dispatched to ${plugin.name}${autoSubmit ? ' and submitted' : ' (ready to send)'}`,
            target: plugin.name,
          };
        }
      }
    } catch (e: any) {
      logger.warn('Active adapter insertText failed, falling back to direct DOM selectors:', e);
    }
  }

  // 2. Direct DOM Selector Injection
  let targetInput: HTMLElement | null = null;
  let targetButton: HTMLElement | null = null;
  let targetName = 'Active Tab';

  // Determine selector set
  const candidates: Array<{ name: string; input: string; button: string }> = [];
  if (tabTarget && tabTarget !== 'auto' && TAB_INTERFACES[tabTarget]) {
    const cfg = TAB_INTERFACES[tabTarget];
    candidates.push({ name: cfg.name, input: cfg.selectors.input, button: cfg.selectors.button });
  } else {
    for (const [key, cfg] of Object.entries(TAB_INTERFACES)) {
      if (key !== 'auto') {
        candidates.push({ name: cfg.name, input: cfg.selectors.input, button: cfg.selectors.button });
      }
    }
    candidates.push({
      name: 'Generic Chat',
      input: 'textarea, div[contenteditable="true"]',
      button: 'button[type="submit"], button[aria-label*="Send" i], button[aria-label*="Run" i]',
    });
  }

  for (const cand of candidates) {
    const input = document.querySelector(cand.input) as HTMLElement | null;
    if (input && (input.offsetWidth > 0 || input.offsetHeight > 0 || (input as any).offsetParent !== null)) {
      targetInput = input;
      targetButton = document.querySelector(cand.button) as HTMLElement | null;
      targetName = cand.name;
      break;
    }
  }

  if (!targetInput) {
    // Copy to clipboard as graceful fallback
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(formattedPrompt).catch(() => {});
    }
    return {
      success: false,
      message:
        'No chat input field found on current tab. Prompt copied to clipboard so you can paste it directly.',
      target: window.location.hostname || 'Unknown Tab',
    };
  }

  targetInput.focus();

  // Inject text based on element type
  if ('value' in targetInput) {
    const inputEl = targetInput as HTMLTextAreaElement | HTMLInputElement;
    const existing = inputEl.value;
    const newContent = existing ? `${existing}\n\n${formattedPrompt}` : formattedPrompt;
    inputEl.value = newContent;
    inputEl.selectionStart = inputEl.selectionEnd = inputEl.value.length;
    inputEl.dispatchEvent(new InputEvent('input', { bubbles: true }));
    inputEl.dispatchEvent(new Event('change', { bubbles: true }));

    // Trigger React's internal input tracker if available
    const nativeSetter = Object.getOwnPropertyDescriptor(
      inputEl instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
      'value'
    )?.set;
    if (nativeSetter) {
      nativeSetter.call(inputEl, newContent);
      inputEl.dispatchEvent(new Event('input', { bubbles: true }));
    }
  } else if (targetInput.getAttribute('contenteditable') === 'true') {
    targetInput.focus();
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(targetInput);
    range.collapse(false);
    selection?.removeAllRanges();
    selection?.addRange(range);
    const inserted = document.execCommand('insertText', false, formattedPrompt);
    if (!inserted) {
      targetInput.textContent = formattedPrompt;
    }
    targetInput.dispatchEvent(new InputEvent('input', { bubbles: true }));
    targetInput.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // Trigger submission if requested
  if (autoSubmit) {
    await new Promise(r => setTimeout(r, 250));

    // Re-check targetButton or look for any enabled submit button
    const submitBtn =
      targetButton ||
      (document.querySelector(
        'button[aria-label*="Run" i], button[aria-label*="Send" i], button[aria-label*="Submit" i], button[type="submit"]'
      ) as HTMLElement | null);

    const isBtnDisabled =
      submitBtn &&
      ((submitBtn as HTMLButtonElement).disabled ||
        submitBtn.getAttribute('aria-disabled') === 'true' ||
        submitBtn.classList.contains('disabled'));

    if (submitBtn && !isBtnDisabled) {
      submitBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      try {
        submitBtn.click();
      } catch (_) {}
    } else {
      // Simulate Enter or Ctrl+Enter (for AI Studio)
      const isAIStudio = window.location.hostname.includes('aistudio');
      targetInput.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Enter',
          code: 'Enter',
          keyCode: 13,
          which: 13,
          ctrlKey: isAIStudio,
          metaKey: isAIStudio,
          bubbles: true,
          cancelable: true,
        })
      );
      targetInput.dispatchEvent(
        new KeyboardEvent('keyup', {
          key: 'Enter',
          code: 'Enter',
          keyCode: 13,
          which: 13,
          ctrlKey: isAIStudio,
          metaKey: isAIStudio,
          bubbles: true,
          cancelable: true,
        })
      );
    }
  }

  eventBus.emit('agent:dispatched-to-tab', {
    target: targetName,
    promptLength: formattedPrompt.length,
    submitted: autoSubmit,
  });

  return {
    success: true,
    message: `Dispatched to ${targetName}${autoSubmit ? ' and executed' : ' (ready to send)'}`,
    target: targetName,
  };
}

/**
 * Dispatches prompt to a local engine (Ollama or LM Studio)
 */
export async function dispatchToLocalEngine(
  prompt: string,
  options: {
    systemPrompt?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    baseUrl?: string;
  } = {}
): Promise<{ success: boolean; output: string; model: string; error?: string }> {
  const {
    systemPrompt = 'You are a sovereign Alsanian AI assistant.',
    model = 'llama3.2:3b',
    temperature = 0.7,
    maxTokens = 2048,
    baseUrl = 'http://localhost:11434',
  } = options;

  // Clean raw model name
  const cleanModel = model.replace(/^local\//, '');

  try {
    // 1. Try standard OpenAI-compatible completions endpoint on localhost
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000); // 60s max for local inference

    const endpoint = baseUrl.endsWith('/v1') ? `${baseUrl}/chat/completions` : `${baseUrl}/v1/chat/completions`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: cleanModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        temperature,
        max_tokens: maxTokens,
      }),
    });

    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || '';
      return {
        success: true,
        output: content,
        model: cleanModel,
      };
    }

    // 2. Fallback to native Ollama /api/generate
    const ollamaController = new AbortController();
    const ollamaTimeout = setTimeout(() => ollamaController.abort(), 60000);

    const nativeOllamaRes = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: ollamaController.signal,
      body: JSON.stringify({
        model: cleanModel,
        prompt: `${systemPrompt}\n\nTask: ${prompt}`,
        stream: false,
        options: { temperature },
      }),
    });

    clearTimeout(ollamaTimeout);

    if (nativeOllamaRes.ok) {
      const data = await nativeOllamaRes.json();
      return {
        success: true,
        output: data.response || '',
        model: cleanModel,
      };
    }

    return {
      success: false,
      output: '',
      model: cleanModel,
      error: `Local engine returned HTTP ${res.status}. Ensure model "${cleanModel}" is pulled.`,
    };
  } catch (err: any) {
    return {
      success: false,
      output: '',
      model: cleanModel,
      error: `Could not connect to local model engine (${err.message || 'offline'}). Is Ollama / LM Studio running?`,
    };
  }
}

/**
 * Dispatches prompt to a Cloud API Endpoint using configured credentials
 */
export async function dispatchToCloudApi(
  prompt: string,
  options: {
    provider: ModelProviderConfig;
    model: string;
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
  }
): Promise<{ success: boolean; output: string; model: string; error?: string }> {
  const { provider, model, systemPrompt, temperature = 0.7, maxTokens = 4096 } = options;

  if (!provider.apiKey || provider.apiKey.trim().length === 0) {
    return {
      success: false,
      output: '',
      model,
      error: `No API Key configured for ${provider.name}. Add your key in Settings > Models.`,
    };
  }

  const cleanModel = model.includes('/') && !model.startsWith('openrouter/')
    ? model.split('/').pop() || model
    : model;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);

    // Google Gemini Direct (ModelProviderId uses 'gemini', not 'google-ai')
    if (provider.id === 'gemini') {
      const geminiModel = cleanModel || 'gemini-2.5-flash';
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${provider.apiKey.trim()}`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [
            ...(systemPrompt ? [{ role: 'user', parts: [{ text: systemPrompt }] }] : []),
            { role: 'user', parts: [{ text: prompt }] },
          ],
          generationConfig: {
            temperature,
            maxOutputTokens: maxTokens,
          },
        }),
      });

      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        return { success: true, output: text, model: geminiModel };
      }

      const errData = await res.json().catch(() => ({}));
      return {
        success: false,
        output: '',
        model: geminiModel,
        error: errData.error?.message || `Google AI API error HTTP ${res.status}`,
      };
    }

    // Anthropic Direct
    if (provider.id === 'anthropic') {
      const claudeModel = cleanModel || 'claude-3-5-sonnet-20241022';
      const endpoint = `${provider.baseUrl || 'https://api.anthropic.com/v1'}/messages`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': provider.apiKey.trim(),
          'anthropic-version': '2023-06-01',
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: claudeModel,
          max_tokens: maxTokens,
          system: systemPrompt || undefined,
          messages: [{ role: 'user', content: prompt }],
          temperature,
        }),
      });

      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        const text = data.content?.[0]?.text || '';
        return { success: true, output: text, model: claudeModel };
      }

      const errData = await res.json().catch(() => ({}));
      return {
        success: false,
        output: '',
        model: claudeModel,
        error: errData.error?.message || `Anthropic API error HTTP ${res.status}`,
      };
    }

    // OpenAI-Compatible (OpenRouter, OpenAI, Kilo Code, Grok, DeepSeek, Mistral, HuggingFace, BazaarLink)
    const baseUrl = provider.baseUrl || 'https://openrouter.ai/api/v1';
    const endpoint = baseUrl.endsWith('/chat/completions')
      ? baseUrl
      : `${baseUrl.replace(/\/+$/, '')}/chat/completions`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${provider.apiKey.trim()}`,
    };

    if (provider.id === 'openrouter') {
      headers['HTTP-Referer'] = 'https://alsania.network';
      headers['X-Title'] = 'Aegis Identity Hub';
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        model: cleanModel,
        messages: [
          ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
          { role: 'user', content: prompt },
        ],
        temperature,
        max_tokens: maxTokens,
      }),
    });

    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content || '';
      return { success: true, output: text, model: cleanModel };
    }

    const errData = await res.json().catch(() => ({}));
    return {
      success: false,
      output: '',
      model: cleanModel,
      error: errData.error?.message || `${provider.name} returned HTTP ${res.status}`,
    };
  } catch (err: any) {
    return {
      success: false,
      output: '',
      model: cleanModel,
      error: `Network error reaching ${provider.name}: ${err.message || 'CORS / offline'}`,
    };
  }
}

/**
 * Universal Model Router & Dispatcher Engine
 * Automatically routes prompts between:
 * 1. Active Browser Tabs (via adapters / DOM injection)
 * 2. Local Models (Ollama, LM Studio on localhost)
 * 3. Cloud APIs (configured providers and keys)
 */
export async function routeAndDispatch(
  request: ModelDispatchRequest,
  modelsState?: ModelsState
): Promise<ModelDispatchResponse> {
  const start = performance.now();
  const routeTarget = request.targetRoute || request.agent?.dispatchRoute || 'auto';
  const modelId = request.modelId || request.agent?.model || 'openrouter/anthropic/claude-3.5-sonnet';
  const tabTarget = request.tabTarget || request.agent?.tabTarget || 'auto';

  // Helper to record result
  const finish = (
    success: boolean,
    routeUsed: 'api' | 'local' | 'tab',
    providerOrTarget: string,
    output: string,
    error?: string,
    fallbackTriggered = false
  ): ModelDispatchResponse => ({
    success,
    routeUsed,
    providerOrTarget,
    model: modelId,
    output,
    latencyMs: Math.round(performance.now() - start),
    error,
    fallbackTriggered,
  });

  // CASE 0: Specific browser tab requested — tab/<site> (cross-tab execution).
  // Drives a NAMED site's tab (find or create), reads the reply. This is the
  // keystone: browser models as any slot, and correct cross-tab capture.
  const namedHost = hostFromTabModel(modelId);
  if (namedHost) {
    const xt = await executeInTab(namedHost, request.prompt, { timeoutMs: request.timeoutMs });
    if (xt.success) {
      return finish(true, 'tab', namedHost, xt.text ?? '');
    }
    return finish(false, 'tab', namedHost, '', xt.error ?? 'cross-tab dispatch failed');
  }

  // CASE 1: Tab Route explicitly requested OR model starts with 'tab/'
  if (routeTarget === 'tab' || modelId.startsWith('tab/') || modelId.startsWith('tab:')) {
    const tabResult = await dispatchToActiveTab(request.prompt, {
      agentName: request.agent?.name,
      agentRole: request.agent?.role,
      systemPrompt: request.systemPrompt || request.agent?.systemPrompt,
      autoSubmit: request.autoSubmitTab !== false,
      tabTarget,
    });

    if (tabResult.success) {
      return finish(true, 'tab', tabResult.target, tabResult.message);
    }

    // Fallback to local or API if tab injection failed
    logger.info('Tab dispatch failed or not in supported tab, evaluating fallback...');
    const localRes = await dispatchToLocalEngine(request.prompt, {
      systemPrompt: request.systemPrompt || request.agent?.systemPrompt,
      model: request.agent?.fallbackModel || 'llama3.2:3b',
    });
    if (localRes.success) {
      return finish(true, 'local', 'Localhost (Fallback)', localRes.output, undefined, true);
    }

    return finish(false, 'tab', tabResult.target, tabResult.message, tabResult.message);
  }

  // CASE 2: Local Route explicitly requested OR model starts with 'local/'
  if (routeTarget === 'local' || modelId.startsWith('local/')) {
    const localRes = await dispatchToLocalEngine(request.prompt, {
      systemPrompt: request.systemPrompt || request.agent?.systemPrompt,
      model: modelId,
      temperature: request.temperature || request.agent?.temperature,
      maxTokens: request.maxTokens || request.agent?.maxTokens,
    });

    if (localRes.success) {
      return finish(true, 'local', 'Localhost Engine', localRes.output);
    }

    // Fallback to Tab if current tab is supported AI chat interface
    const status = await detectRouteStatus(modelsState);
    if (status.tab.ready && status.tab.canInject) {
      const tabRes = await dispatchToActiveTab(request.prompt, {
        agentName: request.agent?.name,
        agentRole: request.agent?.role,
        systemPrompt: request.systemPrompt || request.agent?.systemPrompt,
        autoSubmit: true,
      });
      if (tabRes.success) {
        return finish(true, 'tab', `${tabRes.target} (Local Fallback)`, tabRes.message, undefined, true);
      }
    }

    return finish(false, 'local', 'Localhost Engine', '', localRes.error);
  }

  // CASE 3: API Route explicitly requested
  if (routeTarget === 'api') {
    // Resolve provider from model string or state
    let targetProvider: ModelProviderConfig | undefined;
    if (modelsState?.providers) {
      for (const prov of Object.values(modelsState.providers)) {
        if (prov.enabled && prov.apiKey && prov.apiKey.length > 3) {
          targetProvider = prov;
          break;
        }
      }
    }

    if (targetProvider) {
      const apiRes = await dispatchToCloudApi(request.prompt, {
        provider: targetProvider,
        model: modelId,
        systemPrompt: request.systemPrompt || request.agent?.systemPrompt,
        temperature: request.temperature || request.agent?.temperature,
      });

      if (apiRes.success) {
        return finish(true, 'api', targetProvider.name, apiRes.output);
      }
    }
  }

  // CASE 4: Auto Route (Smart Priority: Active Tab -> Local -> Cloud API)
  const status = await detectRouteStatus(modelsState);

  // If user is currently on an active AI tab (e.g. AI Studio, Claude, Copilot, ChatGPT), prioritize Tab injection!
  if (status.tab.ready && status.tab.canInject) {
    const tabRes = await dispatchToActiveTab(request.prompt, {
      agentName: request.agent?.name,
      agentRole: request.agent?.role,
      systemPrompt: request.systemPrompt || request.agent?.systemPrompt,
      autoSubmit: request.autoSubmitTab !== false,
      tabTarget,
    });
    if (tabRes.success) {
      return finish(true, 'tab', tabRes.target, tabRes.message);
    }
  }

  // Otherwise if Local engine is alive, use Localhost (100% private, zero cost, Alsania sovereign!)
  if (status.local.ready) {
    const localRes = await dispatchToLocalEngine(request.prompt, {
      systemPrompt: request.systemPrompt || request.agent?.systemPrompt,
      model: modelId.startsWith('local/') ? modelId : status.local.models[0] || 'llama3.2:3b',
    });
    if (localRes.success) {
      return finish(true, 'local', `Localhost (${status.local.engine})`, localRes.output);
    }
  }

  // Otherwise, use Cloud API if key exists
  if (modelsState?.providers) {
    for (const prov of Object.values(modelsState.providers)) {
      if (prov.enabled && prov.apiKey && prov.apiKey.trim().length > 3 && prov.apiKey !== 'not-needed') {
        const apiRes = await dispatchToCloudApi(request.prompt, {
          provider: prov,
          model: modelId,
          systemPrompt: request.systemPrompt || request.agent?.systemPrompt,
        });
        if (apiRes.success) {
          return finish(true, 'api', prov.name, apiRes.output);
        }
      }
    }
  }

  // Fallback: Copy to clipboard and inform user
  if (navigator.clipboard) {
    const textToCopy = `[${request.agent?.name || 'Agent'}]\n${request.prompt}`;
    await navigator.clipboard.writeText(textToCopy).catch(() => {});
  }

  return finish(
    false,
    'tab',
    'Clipboard Dispatch',
    'Prompt copied to clipboard. Ready to paste in any browser chat!',
    'No active browser tab detected, localhost engine offline, and no Cloud API key configured.'
  );
}
