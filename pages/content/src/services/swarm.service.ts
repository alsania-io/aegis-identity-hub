/**
 * swarm.service.ts
 * REAL multi-agent orchestration for Aegis Identity Hub.
 *
 * Ports the orchestration engine from alsania-agent-swarm (task decomposition,
 * capability routing, dependency phases, retry/backoff, aggregation) and wires
 * it to the extension's REAL MCP client — no setTimeout mocks.
 *
 * Execution path: SwarmTab -> swarmService.run() -> mcpClient.callTool('chat')
 */

import { mcpClient } from '../core/mcp-client';
import { routeAndDispatch } from '../lib/model-dispatcher';

export interface SubTask {
  id: string;
  description: string;
  taskType: string;
  complexity: 'low' | 'medium' | 'high';
  dependsOn: string[];
  model: string;
}

export interface SubTaskResult {
  id: string;
  description: string;
  taskType: string;
  status: 'success' | 'error';
  output?: string;
  error?: string;
  model: string;
  durationMs: number;
  attempts: number;
}

export interface SwarmRunOptions {
  goal: string;
  context?: string;
  workerModel: string;
  orchestratorModel?: string;
  maxConcurrent?: number;
  onProgress?: (ev: SwarmProgressEvent) => void;
}

export interface SwarmProgressEvent {
  phase: 'decompose' | 'plan' | 'execute' | 'subtask_start' | 'subtask_done' |
         'subtask_error' | 'aggregate' | 'done' | 'error';
  message: string;
  subtasks?: SubTask[];
  subtaskId?: string;
  model?: string;
  result?: SwarmRunResult;
}

export interface SwarmRunResult {
  success: boolean;
  goal: string;
  output: string;
  subtasks: SubTaskResult[];
  metrics: {
    totalSubtasks: number;
    succeeded: number;
    failed: number;
    totalDurationMs: number;
    modelsUsed: string[];
  };
}

const MAX_SUBTASKS = 8;
const RETRY_COUNT = 3;
const RETRY_DELAY_BASE = 500;
const DEFAULT_MAX_CONCURRENT = 3;

// ── Task type / complexity inference (heuristic, no LLM) ──────────────────────

const TASK_PATTERNS: [RegExp, string][] = [
  [/\b(code|function|class|bug|error|implement|script|refactor|debug)\b/, 'coding'],
  [/\b(analy[sz]e|compare|evaluate|assess|audit)\b/, 'analysis'],
  [/\b(research|find|gather|search|look up)\b/, 'research'],
  [/\b(summar[iy]ze|tldr|brief|condense|extract)\b/, 'summarize'],
  [/\b(write|draft|compose|create|generate text)\b/, 'writing'],
  [/\b(brainstorm|idea|creative|imagine|design)\b/, 'brainstorm'],
];

function inferTaskType(text: string): string {
  const d = text.toLowerCase();
  for (const [re, type] of TASK_PATTERNS) if (re.test(d)) return type;
  return 'default';
}

function inferComplexity(text: string): 'low' | 'medium' | 'high' {
  const words = text.split(/\s+/).length;
  if (/\b(complex|comprehensive|detailed|full|complete|deep|advanced)\b/i.test(text) || words > 80)
    return 'high';
  if (words > 10) return 'medium';
  return 'low';
}

/** Phase templates per task type (from alsania-agent-swarm). */
const PHASE_TEMPLATES: Record<string, { action: string; taskType: string; parallel: boolean }[]> = {
  analysis: [
    { action: 'Summarize context and inputs for', taskType: 'summarize', parallel: true },
    { action: 'Perform deep analysis of', taskType: 'analysis', parallel: false },
    { action: 'Identify key findings and risks in', taskType: 'analysis', parallel: false },
    { action: 'Write final conclusions for', taskType: 'writing', parallel: false },
  ],
  coding: [
    { action: 'Define requirements and architecture for', taskType: 'analysis', parallel: true },
    { action: 'Implement core logic for', taskType: 'coding', parallel: false },
    { action: 'Write tests for', taskType: 'coding', parallel: false },
    { action: 'Review and document', taskType: 'writing', parallel: false },
  ],
  research: [
    { action: 'Gather information about', taskType: 'research', parallel: true },
    { action: 'Analyze gathered data on', taskType: 'analysis', parallel: false },
    { action: 'Synthesize and summarize findings on', taskType: 'summarize', parallel: false },
  ],
  default: [
    { action: 'Analyze and plan approach for', taskType: 'analysis', parallel: true },
    { action: 'Execute main work on', taskType: 'default', parallel: false },
    { action: 'Review and finalize', taskType: 'summarize', parallel: false },
  ],
};

// ── Task decomposition ────────────────────────────────────────────────────────

function decompose(goal: string, context: string, workerModel: string): SubTask[] {
  const words = (s: string) => s.split(/\s+/).filter(Boolean).length;

  // 1) multi-sentence goal -> one subtask per sentence
  const sentences = goal
    .split(/[.!?;]/)
    .map((s) => s.trim())
    .filter((s) => words(s) >= 5)
    .slice(0, MAX_SUBTASKS);

  if (sentences.length > 1) {
    return sentences.map((desc, i) => ({
      id: String(i + 1),
      description: desc,
      taskType: inferTaskType(desc),
      complexity: inferComplexity(desc),
      dependsOn: [],
      model: workerModel,
    }));
  }

  // 2) single goal -> phase template
  const taskType = inferTaskType(goal);
  const complexity = inferComplexity(goal + ' ' + context);
  const phases = PHASE_TEMPLATES[taskType] ?? PHASE_TEMPLATES.default;

  return phases.map((phase, i) => ({
    id: String(i + 1),
    description: `${phase.action}: ${goal}`,
    taskType: phase.taskType,
    complexity: i === 0 ? 'low' : complexity,
    dependsOn: i === 0 ? [] : [String(i)],
    model: workerModel,
  }));
}

// ── Execution plan (dependency-aware phases) ─────────────────────────────────

function buildExecutionPlan(subtasks: SubTask[], maxConcurrent: number): SubTask[][] {
  const resolved = new Set<string>();
  const phases: SubTask[][] = [];
  let remaining = [...subtasks];

  while (remaining.length > 0) {
    const ready = remaining.filter((t) => t.dependsOn.every((d) => resolved.has(d)));
    if (ready.length === 0) {
      phases.push(remaining);
      break;
    }
    const batch = ready.slice(0, maxConcurrent);
    phases.push(batch);
    batch.forEach((t) => resolved.add(t.id));
    remaining = remaining.filter((t) => !resolved.has(t.id));
  }
  return phases;
}

// ── Subtask executor (REAL mcpClient.callTool) ────────────────────────────────

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function runSubtask(
  subtask: SubTask,
  onProgress: (ev: SwarmProgressEvent) => void,
): Promise<SubTaskResult> {
  const start = Date.now();
  onProgress({
    phase: 'subtask_start',
    message: `Agent ${subtask.id} starting on ${subtask.model}`,
    subtaskId: subtask.id,
    model: subtask.model,
  });

  for (let attempt = 1; attempt <= RETRY_COUNT; attempt++) {
    try {
      // Route by model prefix: 'tab/<site>' -> browser tab, 'openrouter/...' ->
      // cloud API, 'local/...' -> Ollama/LM Studio. 'auto' lets the router pick.
      const call = await routeAndDispatch({
        prompt: subtask.description,
        systemPrompt: `You are a specialized ${subtask.taskType} agent. Be precise, concise, high quality.`,
        targetRoute: 'auto',
        modelId: subtask.model,
      } as any);
      if (!call.success) throw new Error(call.error || 'dispatch failed');
      const output = call.output;

      const result: SubTaskResult = {
        id: subtask.id,
        description: subtask.description,
        taskType: subtask.taskType,
        status: 'success',
        output: normalizeToolOutput(output),
        model: subtask.model,
        durationMs: Date.now() - start,
        attempts: attempt,
      };
      onProgress({
        phase: 'subtask_done',
        message: `Agent ${subtask.id} done in ${result.durationMs}ms`,
        subtaskId: subtask.id,
        model: subtask.model,
      });
      return result;
    } catch (err: any) {
      if (attempt === RETRY_COUNT) {
        const result: SubTaskResult = {
          id: subtask.id,
          description: subtask.description,
          taskType: subtask.taskType,
          status: 'error',
          error: err?.message ?? String(err),
          model: subtask.model,
          durationMs: Date.now() - start,
          attempts: attempt,
        };
        onProgress({
          phase: 'subtask_error',
          message: `Agent ${subtask.id} failed: ${result.error}`,
          subtaskId: subtask.id,
          model: subtask.model,
        });
        return result;
      }
      await sleep(RETRY_DELAY_BASE * Math.pow(2, attempt - 1));
    }
  }
  // unreachable
  throw new Error('runSubtask: exhausted retries');
}

/** MCP tool results may be strings, content arrays, or objects — flatten to text. */
function normalizeToolOutput(output: any): string {
  if (typeof output === 'string') return output;
  if (Array.isArray(output)) {
    return output
      .map((c) => (typeof c === 'string' ? c : c?.text ?? JSON.stringify(c)))
      .join('\n');
  }
  if (output?.content) return normalizeToolOutput(output.content);
  return JSON.stringify(output);
}

// ── Aggregation (map-reduce) ──────────────────────────────────────────────────

function concatenate(results: SubTaskResult[]): string {
  return results
    .sort((a, b) => Number(a.id) - Number(b.id))
    .map((r) => `### ${r.description}\n\n${r.output}`)
    .join('\n\n');
}

async function aggregate(
  results: SubTaskResult[],
  goal: string,
  orchestratorModel: string,
): Promise<string> {
  const successful = results.filter((r) => r.status === 'success');
  if (successful.length === 0) return 'All subtasks failed.';
  if (successful.length === 1) return successful[0].output ?? '';

  const parts = successful
    .map((r) => `[Subtask ${r.id} — ${r.taskType}]\n${r.output}`)
    .join('\n\n---\n\n');
  const prompt =
    `Synthesize these agent results into one coherent, high-quality answer to the goal. ` +
    `Be concise, remove redundancy, preserve all unique insights. Do not mention subtasks.\n\n` +
    `GOAL: ${goal}\n\nRESULTS:\n${parts}`;

  try {
    const call = await routeAndDispatch({
      prompt,
      systemPrompt: 'You are a synthesis expert. Merge the agent results into one coherent answer.',
      targetRoute: 'auto',
      modelId: orchestratorModel,
    } as any);
    if (!call.success) return concatenate(successful);
    return call.output;
  } catch {
    return concatenate(successful);
  }
}

// ── Swarm Service ─────────────────────────────────────────────────────────────

export class SwarmService {
  private static instance: SwarmService;
  private history: Map<string, SwarmRunResult> = new Map();

  static getInstance(): SwarmService {
    if (!SwarmService.instance) SwarmService.instance = new SwarmService();
    return SwarmService.instance;
  }

  /** Run a full swarm task end-to-end using the REAL MCP client. */
  async run(opts: SwarmRunOptions): Promise<SwarmRunResult> {
    const {
      goal,
      context = '',
      workerModel,
      orchestratorModel = workerModel,
      maxConcurrent = DEFAULT_MAX_CONCURRENT,
      onProgress = () => {},
    } = opts;

    const startTime = Date.now();
    if (!mcpClient.isReady()) {
      throw new Error('MCP client not connected — cannot run swarm. Connect an MCP server first.');
    }

    // 1) Decompose
    onProgress({ phase: 'decompose', message: 'Decomposing task…' });
    const subtasks = decompose(goal, context, workerModel);

    onProgress({
      phase: 'plan',
      message: `Planned ${subtasks.length} subtasks`,
      subtasks,
    });

    // 2) Execute phases (dependency-aware, concurrency-capped)
    const plan = buildExecutionPlan(subtasks, maxConcurrent);
    const allResults: SubTaskResult[] = [];

    for (const phase of plan) {
      onProgress({ phase: 'execute', message: `Executing ${phase.length} agents…` });
      // SEQUENTIAL: the tab route drives ONE host chat at a time. Running
      // subtasks in parallel would interleave prompts in the same conversation
      // and corrupt the responses. One subtask -> one prompt -> one reply.
      const phaseResults: SubTaskResult[] = [];
      for (const s of phase) {
        phaseResults.push(await runSubtask(s, onProgress));
      }
      allResults.push(...phaseResults);

      const anyBlockingFail = phaseResults.some(
        (r) => r.status === 'error' && subtasks.find((s) => s.id === r.id)?.dependsOn.length,
      );
      if (anyBlockingFail) {
        onProgress({ phase: 'error', message: 'Blocking subtask failed — halting.' });
        break;
      }
    }

    // 3) Aggregate
    onProgress({ phase: 'aggregate', message: 'Synthesizing…' });
    const output = await aggregate(allResults, goal, orchestratorModel);

    const result: SwarmRunResult = {
      success: allResults.some((r) => r.status === 'success'),
      goal,
      output,
      subtasks: allResults,
      metrics: {
        totalSubtasks: allResults.length,
        succeeded: allResults.filter((r) => r.status === 'success').length,
        failed: allResults.filter((r) => r.status === 'error').length,
        totalDurationMs: Date.now() - startTime,
        modelsUsed: [...new Set(allResults.map((r) => r.model))],
      },
    };

    this.history.set(goal + startTime, result);
    onProgress({ phase: 'done', message: 'Complete', result });
    return result;
  }
}

export const swarmService = SwarmService.getInstance();
