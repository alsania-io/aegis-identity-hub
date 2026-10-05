/**
 * Aegis Identity Hub - Self-Improvement Engine
 * Powered by @alsania-io/self-improve (Alsania Ecosystem)
 * Validated self-improvement gate for Alsania agents:
 * - 6-item Start Packet
 * - 7-state machine: candidate | validated | applied | rejected | superseded | no-delta | open-question
 * - Falsifiable proof rule (command | re-read)
 * - Negative-feedback buffer (RejectedEntry)
 * - Failure category regex classifier
 * - Epoch classification & reward hacking detection
 * - EME persistence & Evolution markers
 */

import {
  runGate,
  classifyLesson,
  validateProof,
  computeConfidence,
  isCritical,
  seriesSlope,
  classifyEpoch,
  detectRewardHacking,
  safeScore,
  round3,
  isHoldoutDay,
  attributionVerdict,
  classifyFailure,
  verifyAgainstEvidence,
  toRejectedEntry,
  renderEvolutionMarker,
  markerFromLesson,
  recordFromLesson,
  applyLesson,
  MemorySink,
  EmeHttpSink,
  type Lesson,
  type LessonState,
  type StartPacket,
  type ProofLine,
  type EditManifest,
  type RejectedEntry,
  type EvolutionMarker,
  type FailureCategory,
  type CriticVerdict,
  type EpochClass,
  type DimensionSample,
  LESSON_STATES,
} from '@alsania-io/self-improve';

import { loadLocalState, saveLocalState } from './identity-storage';
import { createLogger } from '@extension/shared/lib/logger';

const logger = createLogger('SelfImprovementService');

export interface SelfImprovementState {
  lessons: Lesson[];
  rejectedEntries: RejectedEntry[];
  scoreHistory: number[];
  dimensionSamples?: DimensionSample[];
}

// Canonical seed lessons reflecting Alsania's sovereign agent principles
export const INITIAL_LESSONS: Lesson[] = [
  {
    id: 'lesson-atomic-backup',
    state: 'applied',
    packet: {
      futureBehavior: 'Always execute read-before-write and atomic backup before file migration',
      representativeTask: 'Migrate critical identity chunks without silent data loss',
      evidence: 'Detected cross-device move_file race condition during node bootstrap',
      owner: 'aegis-core-agent',
      writeBoundary: 'packages/storage/src/identity-storage.ts',
      proof: 're-read of packages/storage/src/identity-storage.ts',
    },
    confidence: computeConfidence(4, true),
    repeats: 4,
    hasFocusedTest: true,
    proof: {
      kind: 're-read',
      value: 'packages/storage/src/identity-storage.ts',
    },
    manifest: {
      editType: 'modify_storage_layer',
      target: 'aegis-core-agent',
      intendedEffect: 'prevent destructive unconfirmed file overwrites',
      predictedImpact: '100% preservation of local identity keys across sync events',
    },
    createdAt: '2026-09-20T10:00:00.000Z',
  },
  {
    id: 'lesson-sovereignty-audit',
    state: 'applied',
    packet: {
      futureBehavior: 'Verify zero telemetry and refuse proprietary paid APIs at runtime gate',
      representativeTask: 'Audit agent model dispatch targets against Alsania Code v3.0',
      evidence: 'Blocked unconfigured telemetry beacons in upstream dependency tree',
      owner: 'echo-sentinel',
      writeBoundary: 'pages/content/src/lib/model-dispatcher.ts',
      proof: 're-read of pages/content/src/lib/model-dispatcher.ts',
    },
    confidence: computeConfidence(3, true),
    repeats: 3,
    hasFocusedTest: true,
    proof: {
      kind: 're-read',
      value: 'pages/content/src/lib/model-dispatcher.ts',
    },
    manifest: {
      editType: 'modify_dispatch_policy',
      target: 'echo-sentinel',
      intendedEffect: 'enforce open-format and local-first AI dispatch precedence',
      predictedImpact: 'zero data leakage to third-party closed platforms',
    },
    createdAt: '2026-09-22T14:30:00.000Z',
  },
  {
    id: 'lesson-falsifiable-proofs',
    state: 'applied',
    packet: {
      futureBehavior: 'Reject subjective phrases like "looks good" or "verified" in all agent audits',
      representativeTask: 'Self-evaluate agent execution output with concrete runnable verification',
      evidence: 'Unverified assertions passed CI without concrete reproducible tests',
      owner: 'sigma-auditor',
      writeBoundary: 'pages/content/src/lib/ai-enhancer.ts',
      proof: 'npm test -- --run',
    },
    confidence: computeConfidence(5, true),
    repeats: 5,
    hasFocusedTest: true,
    proof: {
      kind: 'command',
      value: 'npm test -- --run',
    },
    manifest: {
      editType: 'enforce_proof_discipline',
      target: 'sigma-auditor',
      intendedEffect: 'eliminate hallucinatory self-certifications',
      predictedImpact: 'strict falsifiable proof requirements for all proposed evolutions',
    },
    createdAt: '2026-09-25T08:15:00.000Z',
  },
  {
    id: 'lesson-local-memory-chunking',
    state: 'candidate',
    packet: {
      futureBehavior: 'Pre-index vector embeddings into localized blake3 memory IDs before dispatch',
      representativeTask: 'Retrieve agent memory context in under 15ms without external cloud vector DB',
      evidence: 'High roundtrip latency in multi-agent swarm context retrieval',
      owner: 'alsania-swarm-coordinator',
      writeBoundary: 'packages/shared/src/lib/memory.ts',
      proof: 'bench-memory.sh --iterations 100',
    },
    confidence: computeConfidence(2, false),
    repeats: 2,
    hasFocusedTest: false,
    proof: {
      kind: 'command',
      value: 'bench-memory.sh --iterations 100',
    },
    manifest: {
      editType: 'optimize_memory_index',
      target: 'alsania-swarm-coordinator',
      intendedEffect: 'cut swarm context retrieval latency by 60%',
      predictedImpact: 'sub-20ms memory hydration across all local tabs',
    },
    createdAt: '2026-09-27T18:00:00.000Z',
  },
];

export const INITIAL_REJECTED_ENTRIES: RejectedEntry[] = [
  {
    name: 'Auto-bypass verification for small prompt edits',
    reason: 'Violates Alsania Code v3.0: no shortcuts, only loopholes. Every change requires verifiable proof.',
    timestamp: '2026-09-21T11:20:00.000Z',
    confidence: 0.95,
    origin: 'sigma-auditor',
  },
  {
    name: 'Silent fallback to remote closed APIs on localhost timeout',
    reason: 'Violates User Sovereignty: agent must never silently route private prompt context to closed cloud APIs without explicit user consent.',
    timestamp: '2026-09-23T16:45:00.000Z',
    confidence: 1.0,
    origin: 'echo-sentinel',
  },
];

export const INITIAL_SCORE_HISTORY: number[] = [0.65, 0.72, 0.81, 0.88, 0.93, 0.96];

class SelfImprovementService {
  private memorySink: MemorySink;
  private emeHttpSink: EmeHttpSink;

  constructor() {
    this.memorySink = new MemorySink();
    this.emeHttpSink = new EmeHttpSink('http://localhost:3100');
  }

  /**
   * Retrieves current self-improvement state from persistent storage
   */
  getState(): SelfImprovementState {
    if (typeof window !== 'undefined') {
      try {
        const appState = loadLocalState();
        const stored = (appState as any)?.selfImprovement;
        if (stored && Array.isArray(stored.lessons) && stored.lessons.length > 0) {
          return {
            lessons: stored.lessons,
            rejectedEntries: stored.rejectedEntries || INITIAL_REJECTED_ENTRIES,
            scoreHistory: stored.scoreHistory || INITIAL_SCORE_HISTORY,
            dimensionSamples: stored.dimensionSamples || [],
          };
        }
      } catch (e) {
        logger.warn('Failed to load self-improvement state from storage:', e);
      }
    }

    return {
      lessons: INITIAL_LESSONS,
      rejectedEntries: INITIAL_REJECTED_ENTRIES,
      scoreHistory: INITIAL_SCORE_HISTORY,
      dimensionSamples: [
        { outputQuality: 0.85, executionCost: 0.9 },
        { outputQuality: 0.9, executionCost: 0.92 },
        { outputQuality: 0.94, executionCost: 0.95 },
      ],
    };
  }

  /**
   * Saves self-improvement state to persistent storage
   */
  saveState(state: SelfImprovementState): void {
    if (typeof window === 'undefined') return;
    try {
      const appState = loadLocalState();
      (appState as any).selfImprovement = state;
      saveLocalState(appState);
      logger.info(`Persisted self-improvement state with ${state.lessons.length} lessons`);
    } catch (e) {
      logger.error('Failed to save self-improvement state:', e);
    }
  }

  /**
   * Evaluates a lesson candidate through the 7-state machine gate and records it
   */
  evaluateAndSaveLesson(params: {
    id?: string;
    packet: StartPacket;
    repeats?: number;
    hasFocusedTest?: boolean;
    proof?: ProofLine;
    manifest?: EditManifest;
    rejectionReason?: string;
    sourceMemoryId?: string;
  }): {
    lesson: Lesson;
    state: LessonState;
    proofValidation: { valid: boolean; reason?: string };
    criticVerdict: CriticVerdict;
    evolutionMarker?: string;
    isCriticalRepeat: boolean;
  } {
    const repeats = Math.max(1, params.repeats ?? 1);
    const hasFocusedTest = Boolean(params.hasFocusedTest);
    const confidence = computeConfidence(repeats, hasFocusedTest);
    const isCriticalRepeat = isCritical(repeats);

    // Validate proof line
    const proofValidation = validateProof(params.proof);

    // Verify against evidence using critic
    const criticVerdict = params.manifest
      ? verifyAgainstEvidence(params.manifest, {
          claimsLift: true,
          rewardHackingSuspected: false,
        })
      : { kind: 'approve' as const };

    const lesson: Lesson = {
      id: params.id || `lesson-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      state: 'candidate',
      packet: params.packet,
      confidence,
      repeats,
      hasFocusedTest,
      proof: params.proof,
      manifest: params.manifest,
      rejectionReason: params.rejectionReason,
      createdAt: new Date().toISOString(),
      sourceMemoryId: params.sourceMemoryId,
    };

    // Run the gate
    const finalState = runGate(lesson);
    lesson.state = finalState;

    // Render evolution marker if applied
    let evolutionMarker: string | undefined;
    if (finalState === 'applied') {
      const m: EvolutionMarker = {
        date: new Date().toISOString().split('T')[0],
        source: params.sourceMemoryId || `hub-session-${Date.now()}`,
        skill: params.packet.owner || 'aegis-agent',
        pattern: params.packet.futureBehavior || 'autonomous behavior refinement',
        state: 'applied',
        proof: params.proof?.value || 'verified re-read',
        confidence,
      };
      evolutionMarker = renderEvolutionMarker(m);
    }

    // Persist into state
    const current = this.getState();
    const existingIndex = current.lessons.findIndex((l) => l.id === lesson.id);
    if (existingIndex >= 0) {
      current.lessons[existingIndex] = lesson;
    } else {
      current.lessons.unshift(lesson);
    }

    // If rejected, record in negative-feedback buffer
    if (finalState === 'rejected' && lesson.rejectionReason) {
      const rejectedEntry = toRejectedEntry(lesson, lesson.rejectionReason);
      current.rejectedEntries.unshift(rejectedEntry);
      if (current.rejectedEntries.length > 50) {
        current.rejectedEntries = current.rejectedEntries.slice(0, 50);
      }
    }

    // Update score history on applied lesson
    if (finalState === 'applied') {
      current.scoreHistory.push(round3(confidence));
      if (current.scoreHistory.length > 30) {
        current.scoreHistory.shift();
      }
    }

    this.saveState(current);

    return {
      lesson,
      state: finalState,
      proofValidation,
      criticVerdict,
      evolutionMarker,
      isCriticalRepeat,
    };
  }

  /**
   * Marks a prior lesson as superseded when replaced by an improved rule
   */
  supersedeLesson(oldLessonId: string, reason: string): Lesson | null {
    const current = this.getState();
    const target = current.lessons.find((l) => l.id === oldLessonId);
    if (!target) return null;

    target.state = 'superseded';
    target.rejectionReason = `Superseded: ${reason}`;
    this.saveState(current);
    return target;
  }

  /**
   * Removes a lesson from active list (moves to rejected or deletes record)
   */
  deleteLesson(lessonId: string): boolean {
    const current = this.getState();
    const initialLen = current.lessons.length;
    current.lessons = current.lessons.filter((l) => l.id !== lessonId);
    if (current.lessons.length !== initialLen) {
      this.saveState(current);
      return true;
    }
    return false;
  }

  /**
   * Classifies tool output or failure message using @alsania-io/self-improve regex rules
   */
  classifyFailureOutput(output: string): {
    category: FailureCategory | null;
    suggestedPacket: Partial<StartPacket>;
  } {
    const category = classifyFailure(output);

    const suggestions: Record<FailureCategory, Partial<StartPacket>> = {
      type_error: {
        futureBehavior: 'Introduce strict runtime type assertion and null-coalescing before property access',
        representativeTask: 'Execute action with unexpected null/undefined input without unhandled exception',
        evidence: output.slice(0, 300),
      },
      syntax_error: {
        futureBehavior: 'Verify syntax compliance and AST validation across target Node/browser runtimes',
        representativeTask: 'Compile and bundle target source without unexpected syntax tokens',
        evidence: output.slice(0, 300),
      },
      test_fail: {
        futureBehavior: 'Refactor target logic to satisfy failing unit/integration assertions',
        representativeTask: 'Run focused test suite to 100% passing state',
        evidence: output.slice(0, 300),
      },
      lint_fail: {
        futureBehavior: 'Enforce formatting rules and eliminate lint warnings during pre-commit pipeline',
        representativeTask: 'Execute linter without rule violations',
        evidence: output.slice(0, 300),
      },
      build_fail: {
        futureBehavior: 'Fix module export mappings and tsconfig references to achieve clean build',
        representativeTask: 'Build project bundle cleanly without exit code 1',
        evidence: output.slice(0, 300),
      },
      permission_denied: {
        futureBehavior: 'Check user authorization boundaries and filesystem permissions before invocation',
        representativeTask: 'Verify file access rights or request explicit user clearance before writing',
        evidence: output.slice(0, 300),
      },
      timeout: {
        futureBehavior: 'Implement progressive timeout handling with exponential backoff and circuit breaker failover',
        representativeTask: 'Handle delayed upstream response cleanly within timeout budget',
        evidence: output.slice(0, 300),
      },
      not_found: {
        futureBehavior: 'Verify file/endpoint existence before opening stream and fallback gracefully',
        representativeTask: 'Access resources with verified existence guards',
        evidence: output.slice(0, 300),
      },
      runtime_error: {
        futureBehavior: 'Wrap risky invocation in inspectable error boundary with diagnostics',
        representativeTask: 'Recover gracefully from runtime fault without silent resets',
        evidence: output.slice(0, 300),
      },
    };

    return {
      category,
      suggestedPacket: category ? suggestions[category] : { evidence: output.slice(0, 300) },
    };
  }

  /**
   * Computes epoch classification and performance metrics over score history
   */
  getMetrics(): {
    epoch: EpochClass;
    slope: number;
    averageScore: number;
    rewardHacking: boolean;
    history: number[];
  } {
    const { scoreHistory, dimensionSamples } = this.getState();
    const history = scoreHistory.length >= 2 ? scoreHistory : [0.8, 0.85];
    const epoch = classifyEpoch(history);
    const slope = round3(seriesSlope(history));
    const averageScore = round3(
      safeScore(history.reduce((a, b) => a + b, 0) / (history.length || 1))
    );
    const rewardHacking = dimensionSamples && dimensionSamples.length >= 3
      ? detectRewardHacking(dimensionSamples)
      : false;

    return {
      epoch,
      slope,
      averageScore,
      rewardHacking,
      history,
    };
  }

  /**
   * Generates formatted Markdown evolution markers for all applied lessons
   */
  renderAllEvolutionMarkers(ownerFilter?: string): string {
    const { lessons } = this.getState();
    const applied = lessons.filter(
      (l) => l.state === 'applied' && (!ownerFilter || l.packet.owner?.toLowerCase() === ownerFilter.toLowerCase())
    );

    if (applied.length === 0) {
      return '';
    }

    const markers = applied.map((lesson) => {
      const m: EvolutionMarker = {
        date: lesson.createdAt.split('T')[0],
        source: lesson.sourceMemoryId || lesson.id,
        skill: lesson.packet.owner || 'aegis-agent',
        pattern: lesson.packet.futureBehavior || 'evolution pattern',
        state: 'applied',
        proof: lesson.proof?.value || 'verified',
        confidence: lesson.confidence,
      };
      return renderEvolutionMarker(m);
    });

    return `### Alsania Self-Improvement & Evolution Directives\n${markers.join('\n\n')}`;
  }
}

export const selfImprovementService = new SelfImprovementService();
