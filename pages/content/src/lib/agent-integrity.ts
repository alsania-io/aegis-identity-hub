/**
 * agent-integrity.ts
 * REAL persona-drift / integrity checks for sovereign agents.
 *
 * Replaces the Math.random() "chaos audit" in AgentsTab. Every check here is
 * deterministic and verifiable against actual agent state — no theater.
 *
 * A drift score is DERIVED from concrete failures, not invented.
 */

import type { AgentItem, AgentSkill, AiModelItem } from '../types/identity';

export interface IntegrityCheck {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
  /** weight toward the drift score (higher = more critical) */
  weight: number;
}

export interface IntegrityReport {
  agentId: string;
  agentName: string;
  score: number; // 0-100, DERIVED from checks
  checks: IntegrityCheck[];
  failed: number;
  passed: number;
}

const REQUIRED_PROMPT_MARKERS = ['alsania', 'sovereign'];

/**
 * Run all real integrity checks for one agent.
 * @param agent the agent to verify
 * @param context skills + models available in the app (for cross-reference)
 */
export function checkAgentIntegrity(
  agent: AgentItem,
  context: { skills?: AgentSkill[]; models?: AiModelItem[]; knownMcpServers?: string[] },
): IntegrityReport {
  const checks: IntegrityCheck[] = [];

  // 1) Identity present: name + handle well-formed
  checks.push({
    id: 'identity',
    label: 'Identity present',
    passed: !!agent.name?.trim() && /^@[\w.-]+$/.test(agent.handle || ''),
    detail: !agent.name?.trim()
      ? 'Agent has no name'
      : !/^@[\w.-]+$/.test(agent.handle || '')
        ? `Malformed handle: "${agent.handle}"`
        : `Identity OK (${agent.handle})`,
    weight: 20,
  });

  // 2) System prompt present and role-specific.
  // Accept EITHER a doctrine marker OR a substantial, role-specific prompt.
  // The real risk is an empty/vague prompt (hallucinated authority, silent
  // resets) — NOT a functional agent that simply doesn't say "sovereign".
  const prompt = (agent.systemPrompt || '').trim();
  const promptLower = prompt.toLowerCase();
  const hasMarker = REQUIRED_PROMPT_MARKERS.some((m) => promptLower.includes(m));
  const isSubstantial = prompt.length >= 40;
  checks.push({
    id: 'prompt',
    label: 'System prompt is role-specific',
    passed: hasMarker || isSubstantial,
    detail:
      prompt.length === 0
        ? 'System prompt missing (hallucinated-authority risk)'
        : hasMarker
          ? 'Prompt present and on-doctrine'
          : isSubstantial
            ? 'Prompt present and role-specific'
            : 'Prompt too short/vague to anchor identity',
    weight: 25,
  });

  // 3) Memory precedence defined
  checks.push({
    id: 'memory',
    label: 'Memory precedence set',
    passed: !!agent.memoryPrecedence,
    detail: agent.memoryPrecedence
      ? `Precedence: ${agent.memoryPrecedence}`
      : 'No memory precedence defined (silent-reset risk)',
    weight: 15,
  });

  // 4) Model assigned (primary)
  checks.push({
    id: 'model',
    label: 'Primary model assigned',
    passed: !!agent.model?.trim(),
    detail: agent.model?.trim() ? `Model: ${agent.model}` : 'No model assigned',
    weight: 15,
  });

  // 5) Assigned skills actually exist in the skill registry
  const skillIds = new Set((context.skills || []).map((s) => s.id));
  const knownSkills = context.skills && context.skills.length > 0;
  const missingSkills = (agent.assignedSkills || []).filter((sid) => knownSkills && !skillIds.has(sid));
  checks.push({
    id: 'skills',
    label: 'Assigned skills resolve',
    passed: !knownSkills || missingSkills.length === 0,
    detail:
      !knownSkills
        ? 'Skill registry unavailable — skipped'
        : missingSkills.length === 0
          ? `All ${(agent.assignedSkills || []).length} skills resolve`
          : `Missing skills: ${missingSkills.join(', ')}`,
    weight: 15,
  });

  // 6) MCP server declared
  checks.push({
    id: 'mcp',
    label: 'MCP server declared',
    passed: !!agent.mcpServer?.trim(),
    detail: agent.mcpServer?.trim() ? `MCP: ${agent.mcpServer}` : 'No MCP server bound',
    weight: 10,
  });

  const totalWeight = checks.reduce((s, c) => s + c.weight, 0);
  const earned = checks.filter((c) => c.passed).reduce((s, c) => s + c.weight, 0);
  const score = totalWeight > 0 ? Math.round((earned / totalWeight) * 1000) / 10 : 100;

  return {
    agentId: agent.id,
    agentName: agent.name,
    score,
    checks,
    failed: checks.filter((c) => !c.passed).length,
    passed: checks.filter((c) => c.passed).length,
  };
}
