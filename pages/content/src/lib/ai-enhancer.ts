/**
 * Aegis Identity Hub - Universal AI Enhancement Engine
 * Supports AI-powered enhancement for:
 * - Prompts (Prompt Library)
 * - Skills (Skill Instructions)
 * - Agents (System Prompts & Soul Directives)
 * - Custom Instructions (System Prompt & Profile Settings)
 */

import { routeAndDispatch } from './model-dispatcher';
import { loadLocalState } from './identity-storage';
import { enhancePrompt as callHubEnhanceApi } from './identity-api';

export type EnhancementTargetType = 'prompt' | 'skill' | 'agent' | 'instructions';

interface EnhanceOptions {
  type: EnhancementTargetType;
  content: string;
  contextTitle?: string;
  category?: string;
}

const SYSTEM_PROMPTS: Record<EnhancementTargetType, string> = {
  prompt: `You are an elite prompt engineer. Refine the given prompt to make it maximally clear, structured, and high-performance.
- Clarify ambiguous requirements while preserving the user's exact core intent.
- Structure into Objective, Context/Requirements, Constraints, and Output Format when beneficial.
- Keep it direct, actionable, and free of unnecessary fluff.
- Output ONLY the refined prompt text. Do not include markdown code block wrappers (no \`\`\`), preambles, or conversational greetings.`,

  skill: `You are an Alsanian AI architect specializing in modular autonomous agent skills.
Enhance the provided skill instructions to make them robust, unambiguous, and production-ready:
- Define clear operational triggers and step-by-step execution protocols.
- Include validation rules, tool requirements, and error-handling directives.
- Enforce sovereignty: no surveillance, no closed loops, no silent resets, explicit inspectability.
- Output ONLY the enhanced skill instructions text without preambles or code fences.`,

  agent: `You are a sovereign persona architect for the Alsania ecosystem.
Enhance the agent's Soul & System Prompt Directives:
- Define an authoritative identity, clear role boundaries, and domain expertise.
- Enforce Alsania Code v3.0: no surveillance, no closed loops, no silent resets, explicit memory precedence (boot → identity → memory/chunks).
- Establish communication tone, rigorous quality expectations (no shortcuts, only verified solutions), and tool execution discipline.
- Output ONLY the enhanced system prompt text without preambles or code fences.`,

  instructions: `You are a system prompt instruction specialist.
Enhance the custom instructions to be concise, unambiguous, and authoritative for LLM system context injection:
- Eliminate vague requests and replace with crisp behavioral constraints.
- Emphasize precision, transparency, deterministic output, and user sovereignty.
- Output ONLY the refined instructions text without preambles or code fences.`
};

/**
 * Intelligent deterministic fallback enhancer
 * Used when no external API or local LLM is reachable
 */
function heuristicEnhance(type: EnhancementTargetType, text: string, title?: string): string {
  const trimmed = text.trim();
  if (!trimmed) return text;

  switch (type) {
    case 'prompt': {
      // If already structured with sections, polish spacing
      if (trimmed.includes('### Objective') || trimmed.includes('## Goal')) {
        return trimmed;
      }
      return `### Objective\n${trimmed}\n\n### Requirements & Constraints\n- Focus on deterministic, production-grade output.\n- Verify all assumptions and edge cases with explicit reasoning.\n- Adhere to open-format, low-overhead principles.\n\n### Expected Output\n- Deliver a complete, functional solution with clear verification criteria.`;
    }

    case 'skill': {
      if (trimmed.includes('### Mission') || trimmed.includes('## Protocols')) {
        return trimmed;
      }
      const skillName = title ? ` [${title}]` : '';
      return `### Competency & Mission${skillName}\n${trimmed}\n\n### Execution Protocols\n1. Analyze input parameters and verify required MCP tools/capabilities before invoking actions.\n2. Execute sequentially with inspectable execution logging at each stage.\n3. Validate output integrity against required schemas and verify zero data leakage.\n\n### Error Handling & Safeguards\n- If a dependency or tool fails, gracefully failover or report detailed diagnostics.\n- Never perform destructive operations without explicit confirmation.`;
    }

    case 'agent': {
      if (trimmed.includes('You are a sovereign AI agent') && trimmed.includes('Principles & Boundaries:')) {
        return trimmed;
      }
      return `You are a sovereign AI agent serving Alsania.\nCore Directive: ${trimmed}\n\nPrinciples & Operating Boundaries:\n1. User Sovereignty First: The user is the owner. You serve their choices with complete inspectability.\n2. Memory Continuity: Enforce explicit memory precedence (boot → identity → memory/chunks). No silent resets.\n3. Rigorous Quality: No shortcuts, placeholders, or mocked outputs. Only verifiable, working implementations.\n4. Transparency: Operate openly with zero hidden telemetry or individual surveillance.`;
    }

    case 'instructions': {
      if (trimmed.includes('### Behavioral Directives')) {
        return trimmed;
      }
      return `### Behavioral Directives & Session Constraints\n- ${trimmed.split('\n').filter(Boolean).join('\n- ')}\n\n### Quality & Execution Standards\n- Prioritize user sovereignty, inspectable decisions, and deterministic execution.\n- Maintain concise, high-signal communication without conversational filler.\n- Refuse shortcuts, unverified workarounds, or hallucinated authority.`;
    }
  }
}

/**
 * Universal enhancement function:
 * 1. Tries configured LLM (Local Ollama / LM Studio or Cloud API via routeAndDispatch)
 * 2. Tries Hub API endpoint
 * 3. Falls back seamlessly to deterministic heuristic enhancement
 */
export async function enhanceContent(options: EnhanceOptions): Promise<{
  success: boolean;
  content: string;
  source: 'llm' | 'hub-api' | 'heuristic';
  error?: string;
}> {
  const { type, content, contextTitle } = options;
  if (!content || !content.trim()) {
    return {
      success: false,
      content,
      source: 'heuristic',
      error: 'Cannot enhance empty content.',
    };
  }

  const systemPrompt = SYSTEM_PROMPTS[type];
  const userPrompt = contextTitle
    ? `Title/Context: ${contextTitle}\n\nCurrent Draft:\n${content.trim()}`
    : `Current Draft:\n${content.trim()}`;

  // STEP 1: Attempt through Model Dispatcher (Local Ollama/LM Studio or configured Cloud API)
  try {
    const localState = loadLocalState();
    const modelsState = localState?.modelsState;

    // Check if any provider has an API key or a local provider is enabled.
    // NOTE: providers is Record<ModelProviderId, ModelProviderConfig> — an
    // object, not an array — so we use Object.values() to iterate.
    const providerList = modelsState?.providers ? Object.values(modelsState.providers) : [];
    const hasLocal = providerList.some((p) => p.id === 'local' && p.enabled);
    const hasCloud = providerList.some((p) => p.enabled && !!p.apiKey && p.apiKey.trim().length > 0);

    if (hasLocal || hasCloud) {
      const dispatchRes = await routeAndDispatch(
        {
          prompt: userPrompt,
          systemPrompt,
          targetRoute: hasLocal ? 'local' : 'api',
          temperature: 0.4,
          maxTokens: 2048,
        },
        modelsState
      );

      if (dispatchRes.success && dispatchRes.output && dispatchRes.output.trim().length > 10) {
        // Strip markdown code wrap if the model added it
        let cleaned = dispatchRes.output.trim();
        if (cleaned.startsWith('```') && cleaned.endsWith('```')) {
          cleaned = cleaned.replace(/^```[a-zA-Z]*\n?/, '').replace(/```$/, '').trim();
        }
        return {
          success: true,
          content: cleaned,
          source: 'llm',
        };
      }
    }
  } catch (err) {
    console.warn('[AIEnhancer] Model dispatcher route failed, falling back:', err);
  }

  // STEP 2: Attempt through Hub API endpoint
  try {
    const hubResult = await callHubEnhanceApi(content);
    if (hubResult && hubResult.trim().length > 10) {
      return {
        success: true,
        content: hubResult.trim(),
        source: 'hub-api',
      };
    }
  } catch (err) {
    console.warn('[AIEnhancer] Hub API route failed, falling back:', err);
  }

  // STEP 3: Fallback to structured Alsanian heuristic enhancement
  const heuristic = heuristicEnhance(type, content, contextTitle);
  return {
    success: true,
    content: heuristic,
    source: 'heuristic',
  };
}
