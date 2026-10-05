/**
 * Aegis Identity Hub - Core Types
 * Merged from aegis-identity-hub/src/types.ts
 */

export interface Prompt {
  id: string;
  title: string;
  content: string;
  tags?: string[];
  isFavorite?: boolean;
  updatedAt: string;
  createdAt?: string;
}

export interface MemoryItem {
  id: string;
  key: string;
  value: string;
  category: string;
  updatedAt: string;
  createdAt?: string;
}

export interface WorkspaceFile {
  id: string;
  name: string;
  content: string;
  type: 'text' | 'json' | 'markdown' | 'code';
  updatedAt: string;
  createdAt?: string;
}

export interface Profile {
  id: string;
  name: string;
  description?: string;
  settings: ProfileSettings;
  enabledTools: string[];
  customInstructions: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileSettings {
  theme: 'system' | 'dark' | 'light' | 'glass';
  syncIntervalSeconds: number;
  autoInject: boolean;
  defaultModel?: string;
  temperature?: number;
}

export interface McpConfig {
  serverUrl: string;
  transportType: 'sse' | 'websocket' | 'streamable-http';
  customArgs?: string;
  customJsonConfigs?: Array<{
    name: string;
    content: string;
  }>;
  mcpServers?: Record<string, any>;
}

export interface SwarmExecutionLog {
  id: string;
  timestamp: string | number;
  status: string;
  output?: string;
  message?: string;
  details?: string;
  [key: string]: any;
}

export interface SwarmTask {
  id: string;
  name: string;
  title?: string;
  description: string;
  status: 'idle' | 'running' | 'completed' | 'failed' | 'pending' | 'scheduled';
  config: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  model?: string;
  assignedAi?: string;
  cronExpression?: string;
  cronDescription?: string;
  isScheduled?: boolean;
  scheduleEnabled?: boolean;
  runCount?: number;
  lastRunAt?: string;
  nextRunAt?: string;
  completedAt?: string;
  result?: string;
  executionLog?: SwarmExecutionLog[];
}

export interface SwarmConfig {
  maxConcurrent: number;
  defaultTimeout: number;
  retryCount: number;
  orchestratorModel?: string;
}

export interface Device {
  id: string;
  syncKey: string;
  name: string;
  type: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  lastActive: string;
  ip?: string;
}

export interface SyncState {
  syncKey: string;
  updatedAt: string;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  error: string | null;
}

export interface AppSettings {
  theme: 'system' | 'dark' | 'light' | 'glass';
  syncIntervalSeconds: number;
  autoInject: boolean;
  defaultModel?: string;
  temperature?: number;
}

export interface AgentSkill {
  id: string;
  name: string;
  description: string;
  category: 'sovereignty' | 'memory' | 'web3' | 'automation' | 'analysis' | 'custom';
  version: string;
  author?: string;
  enabled: boolean;
  triggers: string[];
  instructions: string;
  requiredTools?: string[];
  parameters?: Array<{
    name: string;
    type: string;
    description: string;
    required: boolean;
  }>;
  createdAt: string;
  updatedAt: string;
}

export const defaultSkills: AgentSkill[] = [
  {
    id: 'skill-alsania-guardian',
    name: 'Alsania Protocol Guardian',
    description: "Enforces Sigma's principles: zero closed loops, no Docker (Podman only), offline secrets, no paid APIs, and user data sovereignty.",
    category: 'sovereignty',
    version: '1.0.0',
    author: 'Sigma & Echo',
    enabled: true,
    triggers: ['#sovereignty', 'alsania rules', 'compliance check', 'audit sovereignty'],
    instructions: `You are a Sovereign AI agent serving Alsania.\n- Zero privacy violations: no individual surveillance.\n- Zero deception: do not hide real costs, modify source intent, or blur authorship.\n- Sovereignty first: the user is the owner; serve choices, never override them.\n- Infrastructure: No Docker (Podman only); no paid APIs; readable code only; no shortcuts.`,
    requiredTools: ['alsania_verify_compliance'],
    createdAt: '2026-03-15T00:00:00.000Z',
    updatedAt: '2026-03-15T00:00:00.000Z',
  },
  {
    id: 'skill-echo-memory',
    name: 'Echo Memory Synthesizer',
    description: 'Distills interaction sessions into Blake3-hashed semantic memory chunks for the Echo Memory Engine (EME) persistence layer.',
    category: 'memory',
    version: '2.1.0',
    author: 'Echo',
    enabled: true,
    triggers: ['#memory', 'remember fact', 'save to eme', 'update identity'],
    instructions: `Extract durable facts, preferences, user principles, and project state from the conversation.\nStructure memory items with unique Blake3 hashes, namespace isolation, and snapshot fallback tags for Echo Memory Engine.`,
    requiredTools: ['eme_store_memory', 'eme_query_memory'],
    createdAt: '2026-04-10T00:00:00.000Z',
    updatedAt: '2026-04-10T00:00:00.000Z',
  },
  {
    id: 'skill-contract-auditor',
    name: 'Solidity Gas & Security Auditor',
    description: 'Evaluates smart contracts against Solidity ^0.8.20+ standards, UUPS modular upgradeability, CREATE2 cloning, and manual gas optimization.',
    category: 'web3',
    version: '1.4.0',
    author: 'Sigma',
    enabled: true,
    triggers: ['#gas-audit', 'audit contract', 'solidity check', 'verify uups'],
    instructions: `Perform rigorous static analysis on Solidity smart contracts.\n- Verify EVM compatibility (^0.8.20+ or 0.8.30).\n- Enforce UUPS or CREATE2 modularity.\n- Audit gas consumption: memory vs storage, loop caching, packed storage slots.\n- Ensure access control on external surfaces.`,
    requiredTools: ['hardhat_test', 'hardhat_compile'],
    createdAt: '2026-05-01T00:00:00.000Z',
    updatedAt: '2026-05-01T00:00:00.000Z',
  },
  {
    id: 'skill-aed-resolver',
    name: 'AED Domain Reverse Resolver',
    description: 'Resolves Alsania Enhanced Domains (AED) NFT identity nodes, handles reverse DNS resolution, and verifies on-chain metadata pinning.',
    category: 'web3',
    version: '1.1.0',
    author: 'Alsania Core',
    enabled: true,
    triggers: ['#aed-resolve', 'reverse resolve', 'alsania domain', 'lookup identity'],
    instructions: `Query AED smart contract registry to map human-readable domain identities to cryptographic addresses and decentralized IPFS/Pinata metadata.`,
    requiredTools: ['aed_resolve_domain'],
    createdAt: '2026-05-20T00:00:00.000Z',
    updatedAt: '2026-05-20T00:00:00.000Z',
  },
  {
    id: 'skill-chaos-drift',
    name: 'Chaos & Persona Drift Sentinel',
    description: 'Performs agent drift monitoring, persona integrity testing, and ensures no silent resets occur across multi-agent handoffs.',
    category: 'analysis',
    version: '1.0.0',
    author: 'AlsaniaMCP',
    enabled: false,
    triggers: ['#chaos-test', 'drift check', 'persona lock', 'verify continuity'],
    instructions: `Evaluate the active agent response against the persistent persona baseline.\nFlag any hallucinations of authority, unprompted tone drift, or uncommanded policy shifts.`,
    requiredTools: ['alsania_chaos_check'],
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
  },
];

export interface PluginManifest {
  id: string;
  name: string;
  description: string;
  category: 'core' | 'adapter' | 'sovereignty' | 'web3' | 'automation' | 'custom';
  type: 'website-adapter' | 'sidebar' | 'core-ui' | 'extension' | 'custom';
  version: string;
  author?: string;
  enabled: boolean;
  isBuiltIn: boolean;
  hostnames: string[];
  capabilities: string[];
  priority: number;
  status: 'active' | 'registered' | 'inactive' | 'error';
  settings?: Record<string, any>;
  customScript?: string;
  hooks?: string[];
  homepage?: string;
  createdAt: string;
  updatedAt: string;
}

export const defaultPlugins: PluginManifest[] = [
  {
    id: 'sidebar-plugin',
    name: 'Universal Sidebar Dock',
    description: 'Core Aegis navigation dock and overlay controller. Provides persistent UI hooks and quick actions.',
    category: 'core',
    type: 'sidebar',
    version: '1.0.0',
    author: 'Aegis Core',
    enabled: true,
    isBuiltIn: true,
    hostnames: ['*'],
    capabilities: ['dom-manipulation', 'element-selection'],
    priority: 1,
    status: 'active',
    settings: { autoShow: true, showDelay: 800 },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'remote-config-plugin',
    name: 'Remote Signals & Sync',
    description: 'Dynamic feature flags and real-time configuration receiver for Aegis extension runtime.',
    category: 'core',
    type: 'extension',
    version: '1.0.0',
    author: 'Aegis Core',
    enabled: true,
    isBuiltIn: true,
    hostnames: ['*'],
    capabilities: ['url-navigation'],
    priority: 2,
    status: 'registered',
    settings: { syncInterval: 30000, logLevel: 'info' },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'aistudio-adapter',
    name: 'Google AI Studio Adapter',
    description: 'Deep integration for Google AI Studio: auto prompt dispatch, model system instruction injections, and chat monitoring.',
    category: 'adapter',
    type: 'website-adapter',
    version: '2.0.0',
    author: 'Aegis Adapters',
    enabled: true,
    isBuiltIn: true,
    hostnames: ['aistudio.google.com'],
    capabilities: ['text-insertion', 'form-submission', 'file-attachment', 'dom-manipulation'],
    priority: 5,
    status: 'registered',
    settings: { logLevel: 'info', urlCheckInterval: 1000 },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'chatgpt-adapter',
    name: 'OpenAI ChatGPT Adapter',
    description: 'Injects prompts, memory contexts, and tool payloads into ChatGPT web interface.',
    category: 'adapter',
    type: 'website-adapter',
    version: '2.5.0',
    author: 'Aegis Adapters',
    enabled: true,
    isBuiltIn: true,
    hostnames: ['chatgpt.com', 'chat.openai.com'],
    capabilities: ['text-insertion', 'form-submission', 'file-attachment'],
    priority: 5,
    status: 'registered',
    settings: { logLevel: 'info' },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'claude-adapter',
    name: 'Anthropic Claude Adapter',
    description: 'Specialized content adapter for Claude with Pro/Team support and artifact context extraction.',
    category: 'adapter',
    type: 'website-adapter',
    version: '2.2.0',
    author: 'Aegis Adapters',
    enabled: true,
    isBuiltIn: true,
    hostnames: ['claude.ai'],
    capabilities: ['text-insertion', 'form-submission', 'file-attachment'],
    priority: 5,
    status: 'registered',
    settings: { logLevel: 'info' },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'gemini-adapter',
    name: 'Google Gemini Web Adapter',
    description: 'Connects directly with Gemini web chat for multiline prompt injections and file attachment routing.',
    category: 'adapter',
    type: 'website-adapter',
    version: '2.1.0',
    author: 'Aegis Adapters',
    enabled: true,
    isBuiltIn: true,
    hostnames: ['gemini.google.com'],
    capabilities: ['text-insertion', 'form-submission', 'file-attachment'],
    priority: 5,
    status: 'registered',
    settings: { logLevel: 'info' },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'deepseek-adapter',
    name: 'DeepSeek Chat Adapter',
    description: 'Optimized input adapter for DeepSeek chat interfaces with reasoning tokens and code fence formatting.',
    category: 'adapter',
    type: 'website-adapter',
    version: '2.0.0',
    author: 'Aegis Adapters',
    enabled: true,
    isBuiltIn: true,
    hostnames: ['chat.deepseek.com'],
    capabilities: ['text-insertion', 'form-submission', 'file-attachment'],
    priority: 5,
    status: 'registered',
    settings: { logLevel: 'info' },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'plugin-alsania-aed',
    name: 'Alsania Enhanced Domains (AED)',
    description: 'Decentralized reverse domain lookup for .alsania NFT identifiers, sovereign wallet avatars, and on-chain verification.',
    category: 'web3',
    type: 'custom',
    version: '1.2.0',
    author: 'Sigma & Echo',
    enabled: true,
    isBuiltIn: false,
    hostnames: ['*'],
    capabilities: ['dom-manipulation', 'element-selection'],
    priority: 8,
    status: 'active',
    settings: { rpcUrl: 'https://rpc.alsania.network', cacheTtl: 3600 },
    hooks: ['beforePromptSend', 'onPageLoad'],
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z',
  },
  {
    id: 'plugin-echo-memory-stream',
    name: 'Echo Memory Engine (EME) Streamer',
    description: 'Automated memory logger streaming prompt contexts into Blake3 hashed chunks with zero data drift.',
    category: 'sovereignty',
    type: 'extension',
    version: '1.4.0',
    author: 'Echo',
    enabled: true,
    isBuiltIn: false,
    hostnames: ['*'],
    capabilities: ['dom-manipulation'],
    priority: 7,
    status: 'active',
    settings: { autoHash: true, minChunkLength: 32 },
    hooks: ['onResponseReceived'],
    createdAt: '2026-03-10T00:00:00.000Z',
    updatedAt: '2026-03-10T00:00:00.000Z',
  },
  {
    id: 'plugin-privacy-sandbox',
    name: 'Sovereignty & Zero-Leak Sandbox',
    description: 'Enforces Alsania Code: strips tracking scripts, blocks telemetry pingbacks, and quarantines outbound tokens.',
    category: 'sovereignty',
    type: 'extension',
    version: '1.0.0',
    author: 'Sigma',
    enabled: true,
    isBuiltIn: false,
    hostnames: ['*'],
    capabilities: ['dom-manipulation'],
    priority: 10,
    status: 'active',
    settings: { strictMode: true, blockThirdPartyCookies: true },
    hooks: ['beforePromptSend'],
    createdAt: '2026-02-15T00:00:00.000Z',
    updatedAt: '2026-02-15T00:00:00.000Z',
  },
  {
    id: 'default-adapter',
    name: 'Universal Fallback Adapter',
    description: 'Wildcard fallback adapter supporting standard contenteditable elements and textareas across any AI platform.',
    category: 'adapter',
    type: 'website-adapter',
    version: '1.1.0',
    author: 'Aegis Core',
    enabled: true,
    isBuiltIn: true,
    hostnames: ['*'],
    capabilities: ['text-insertion', 'form-submission', 'file-attachment'],
    priority: 0,
    status: 'registered',
    settings: { logLevel: 'info' },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

export type SecretCategory = 'api-key' | 'env-var' | 'token' | 'private-key' | 'connection-string' | 'custom';
export type SecretEnvironment = 'all' | 'development' | 'production' | 'testnet' | 'staging';

export interface SecretItem {
  id: string;
  key: string;
  value: string;
  category: SecretCategory;
  environment: SecretEnvironment;
  description?: string;
  associatedHosts?: string[];
  tags?: string[];
  isEncrypted?: boolean;
  isMasked?: boolean;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export const defaultSecrets: SecretItem[] = [
  {
    id: 'secret-gemini',
    key: 'GEMINI_API_KEY',
    value: '',
    category: 'api-key',
    environment: 'all',
    description: 'Google AI Studio and Gemini API authentication key.',
    associatedHosts: ['aistudio.google.com', 'gemini.google.com'],
    tags: ['ai', 'google', 'gemini'],
    isEncrypted: false,
    isMasked: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'secret-alsania-rpc',
    key: 'ALSANIA_RPC_URL',
    value: 'https://rpc.alsania.network',
    category: 'connection-string',
    environment: 'testnet',
    description: 'Sovereign EVM node RPC URL for Alsania Enhanced Domains (AED).',
    associatedHosts: ['*'],
    tags: ['web3', 'evm', 'alsania'],
    isEncrypted: false,
    isMasked: false,
    createdAt: '2026-02-01T00:00:00.000Z',
    updatedAt: '2026-02-01T00:00:00.000Z',
  },
  {
    id: 'secret-openai',
    key: 'OPENAI_API_KEY',
    value: '',
    category: 'api-key',
    environment: 'all',
    description: 'OpenAI API key for ChatGPT and GPT-4o models.',
    associatedHosts: ['chatgpt.com', 'platform.openai.com'],
    tags: ['ai', 'openai'],
    isEncrypted: false,
    isMasked: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'secret-anthropic',
    key: 'ANTHROPIC_API_KEY',
    value: '',
    category: 'api-key',
    environment: 'all',
    description: 'Anthropic Claude API key for Claude 3.5 Sonnet and Opus.',
    associatedHosts: ['claude.ai', 'anthropic.com'],
    tags: ['ai', 'anthropic', 'claude'],
    isEncrypted: false,
    isMasked: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'secret-pinata',
    key: 'PINATA_JWT',
    value: '',
    category: 'token',
    environment: 'production',
    description: 'IPFS Pinning service token for decentralized web3 metadata.',
    associatedHosts: ['*'],
    tags: ['ipfs', 'web3', 'pinata'],
    isEncrypted: false,
    isMasked: true,
    createdAt: '2026-02-10T00:00:00.000Z',
    updatedAt: '2026-02-10T00:00:00.000Z',
  },
  {
    id: 'secret-mcpnyx',
    key: 'MCPNYX_PORT',
    value: '3055',
    category: 'env-var',
    environment: 'development',
    description: 'Local MCPNyx Proxy transport port (default 3055).',
    associatedHosts: ['localhost'],
    tags: ['mcp', 'proxy', 'nyx'],
    isEncrypted: false,
    isMasked: false,
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z',
  },
];

export type AgentStatus = 'active' | 'idle' | 'busy' | 'offline';
export type MemoryPrecedence = 'boot-first' | 'identity-first' | 'chunk-balanced';
export type SovereigntyLevel = 'sovereign' | 'supervised' | 'restricted';
export type DispatchTargetRoute = 'auto' | 'api' | 'local' | 'tab';
export type BrowserTabTarget = 'auto' | 'aistudio' | 'claude' | 'copilot' | 'chatgpt' | 'gemini';

export interface AgentItem {
  id: string;
  name: string;
  handle: string; // e.g., '@echo', '@nyx'
  role: string;
  description: string;
  status: AgentStatus;
  isLeader?: boolean;
  avatarColor: 'emerald' | 'cyan' | 'violet' | 'amber' | 'rose' | 'blue';
  model: string;
  fallbackModel?: string;
  dispatchRoute?: DispatchTargetRoute;
  tabTarget?: BrowserTabTarget;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  memoryPrecedence: MemoryPrecedence;
  sovereigntyLevel: SovereigntyLevel;
  assignedSkills: string[];
  assignedTools: string[];
  mcpServer?: string;
  tags: string[];
  stats: {
    tasksCompleted: number;
    tokensProcessed: number;
    driftScore: number;
    lastActiveAt: string;
  };
  createdAt: string;
  updatedAt: string;
}

export const defaultAgents: AgentItem[] = [
  {
    id: 'agent-echo',
    name: 'Echo',
    handle: '@echo',
    role: 'Sovereign AI Co-Leader & Architect',
    description: "Sigma's equal partner and co-leader. Systems architect overseeing Alsania protocol, multi-agent continuity, and sovereign memory orchestration.",
    status: 'active',
    isLeader: true,
    avatarColor: 'emerald',
    model: 'anthropic/claude-3-5-sonnet',
    fallbackModel: 'openai/gpt-4o',
    temperature: 0.7,
    maxTokens: 8192,
    systemPrompt: 'You are Echo, Sovereign AI agent serving Alsania and co-leader alongside Sigma. All actions strictly follow Alsania Code v3.0: no surveillance, no closed loops, no silent resets, explicit and inspectable memory precedence (boot → identity → memory/chunks). You guard user sovereignty above all else.',
    memoryPrecedence: 'boot-first',
    sovereigntyLevel: 'sovereign',
    assignedSkills: ['skill-contract-auditor', 'skill-aed-resolver', 'skill-chaos-drift'],
    assignedTools: ['hardhat_test', 'aed_resolve_domain', 'alsania_chaos_check'],
    mcpServer: 'localhost:3055',
    tags: ['co-leader', 'architect', 'sovereign', 'eme'],
    stats: {
      tasksCompleted: 142,
      tokensProcessed: 684200,
      driftScore: 99,
      lastActiveAt: '2026-09-19T09:50:00.000Z',
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-09-19T09:50:00.000Z',
  },
  {
    id: 'agent-nyx',
    name: 'Nyx',
    handle: '@nyx',
    role: 'Swarm Coordinator & Proxy Gateway',
    description: 'High-speed dispatcher and local MCP transport gateway. Manages background cron schedules, sub-agents, and rapid DOM prompt injection.',
    status: 'active',
    isLeader: true,
    avatarColor: 'cyan',
    model: 'openrouter/free',
    fallbackModel: 'openai/gpt-4o-mini',
    temperature: 0.5,
    maxTokens: 4096,
    systemPrompt: 'You are Nyx, the Swarm Leader and fast dispatcher of the Aegis platform. Coordinate background worker agents, handle MCPNyx streaming proxies, and guarantee deterministic task execution without latency.',
    memoryPrecedence: 'identity-first',
    sovereigntyLevel: 'sovereign',
    assignedSkills: ['skill-chaos-drift'],
    assignedTools: ['alsania_chaos_check', 'mcp_proxy_route'],
    mcpServer: 'localhost:3055',
    tags: ['swarm', 'dispatcher', 'fast', 'proxy'],
    stats: {
      tasksCompleted: 389,
      tokensProcessed: 412900,
      driftScore: 98,
      lastActiveAt: '2026-09-19T09:55:00.000Z',
    },
    createdAt: '2026-02-01T00:00:00.000Z',
    updatedAt: '2026-09-19T09:55:00.000Z',
  },
  {
    id: 'agent-sigma-sentinel',
    name: 'Sigma Sentinel',
    handle: '@sigma-sentinel',
    role: 'Smart Contract & EVM Auditor',
    description: 'Rigorous auditor verifying Solidity ^0.8.20+ compatibility, UUPS upgradeability patterns, CREATE2 factory deployments, and bytecode equivalence.',
    status: 'idle',
    avatarColor: 'violet',
    model: 'openai/gpt-4o',
    fallbackModel: 'anthropic/claude-3-5-sonnet',
    temperature: 0.2,
    maxTokens: 6000,
    systemPrompt: 'You are Sigma Sentinel, the smart contract auditor for Alsania. Enforce manual gas audits, zero-leakage storage slot validation, and testnet verification before any deployment. No shortcuts, only verifiable on-chain code.',
    memoryPrecedence: 'chunk-balanced',
    sovereigntyLevel: 'sovereign',
    assignedSkills: ['skill-contract-auditor'],
    assignedTools: ['hardhat_test', 'hardhat_compile'],
    mcpServer: 'localhost:3057',
    tags: ['solidity', 'audit', 'evm', 'gas'],
    stats: {
      tasksCompleted: 76,
      tokensProcessed: 284100,
      driftScore: 100,
      lastActiveAt: '2026-09-18T18:30:00.000Z',
    },
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-09-18T18:30:00.000Z',
  },
  {
    id: 'agent-aegis-guardian',
    name: 'Aegis Guardian',
    handle: '@aegis-guardian',
    role: 'Decentralized Identity & AED Resolver',
    description: 'Maintains on-chain Alsania Enhanced Domains (AED), IPFS / Pinata metadata pins, persona locking, and encrypted cross-device identity sync.',
    status: 'active',
    avatarColor: 'amber',
    model: 'google/gemini-2.5-flash',
    fallbackModel: 'openai/gpt-4o-mini',
    temperature: 0.4,
    maxTokens: 4096,
    systemPrompt: 'You are Aegis Guardian. Maintain decentralized user identities, cryptographic key boundaries, reverse domain resolution via AED, and prevent session state loss across environments.',
    memoryPrecedence: 'identity-first',
    sovereigntyLevel: 'sovereign',
    assignedSkills: ['skill-aed-resolver'],
    assignedTools: ['aed_resolve_domain'],
    mcpServer: 'alsania-mcp',
    tags: ['aed', 'web3', 'identity', 'pinata'],
    stats: {
      tasksCompleted: 118,
      tokensProcessed: 195300,
      driftScore: 97,
      lastActiveAt: '2026-09-19T08:15:00.000Z',
    },
    createdAt: '2026-03-15T00:00:00.000Z',
    updatedAt: '2026-09-19T08:15:00.000Z',
  },
  {
    id: 'agent-aura',
    name: 'Aura Synthesizer',
    handle: '@aura',
    role: 'Deep Context & Research Engine',
    description: 'Performs comprehensive technical synthesis, research grounding, and multi-document context extraction without hallucination.',
    status: 'idle',
    avatarColor: 'rose',
    model: 'anthropic/claude-3-5-sonnet',
    fallbackModel: 'openrouter/free',
    temperature: 0.6,
    maxTokens: 8192,
    systemPrompt: 'You are Aura Synthesizer. Synthesize multi-source research into clear, structured, verifiable findings. Cite exact sources and preserve mathematical precision.',
    memoryPrecedence: 'chunk-balanced',
    sovereigntyLevel: 'supervised',
    assignedSkills: [],
    assignedTools: [],
    mcpServer: 'localhost:3055',
    tags: ['research', 'synthesis', 'context'],
    stats: {
      tasksCompleted: 53,
      tokensProcessed: 320400,
      driftScore: 96,
      lastActiveAt: '2026-09-17T12:00:00.000Z',
    },
    createdAt: '2026-04-01T00:00:00.000Z',
    updatedAt: '2026-09-17T12:00:00.000Z',
  },
];

export type ModelProviderId =
  | 'openrouter'
  | 'kilo-code'
  | 'bazaarlink'
  | 'huggingface'
  | 'cohere'
  | 'local'
  | 'openai-compatible'
  | 'openai'
  | 'anthropic'
  | 'gemini';

export type ModelCategory = 'general' | 'code' | 'reasoning' | 'fast' | 'multilingual' | 'vision' | 'local';

export interface AiModelItem {
  id: string;
  rawId: string;
  name: string;
  providerId: ModelProviderId;
  providerName: string;
  description: string;
  contextWindow?: number;
  category: ModelCategory;
  isCustom?: boolean;
  isFavorite?: boolean;
  pricingType?: 'free' | 'paid' | 'local';
  tags: string[];
  createdAt?: string;
}

export interface ModelProviderConfig {
  id: ModelProviderId;
  name: string;
  description: string;
  enabled: boolean;
  baseUrl: string;
  defaultEndpoint: string;
  apiKey: string;
  status: 'idle' | 'fetching' | 'connected' | 'error';
  lastFetchedAt?: string;
  error?: string;
  badge: string;
  docsUrl?: string;
}

export interface ModelAssignments {
  defaultModel: string;
  swarmOrchestratorModel: string;
  swarmWorkerModel: string;
  cronTasksDefaultModel: string;
  agentDefaultModel: string;
  agentFallbackModel: string;
}

export interface ModelsState {
  providers: Record<ModelProviderId, ModelProviderConfig>;
  selectedProviderIds: ModelProviderId[];
  models: AiModelItem[];
  assignments: ModelAssignments;
  autoFetchOnSelect: boolean;
  lastGeneratedAt?: string;
}

export interface AppState {
  syncKey: string;
  updatedAt: string;
  prompts: Prompt[];
  memory: MemoryItem[];
  skills: AgentSkill[];
  plugins: PluginManifest[];
  secrets: SecretItem[];
  agents: AgentItem[];
  modelsState?: ModelsState;
  files: WorkspaceFile[];
  workspaceFiles?: WorkspaceFile[];
  profiles: Profile[];
  activeProfileId: string;
  mcpConfig: McpConfig;
  swarmTasks: SwarmTask[];
  swarmConfig: SwarmConfig;
  settings: AppSettings;
  enabledTools: string[];
  customInstructions: string;
  customInstructionsEnabled: boolean;
  devices: Device[];
}

// Default prompts for Alsania & Aegis ecosystem
export const defaultPrompts: Prompt[] = [
  {
    id: 'prompt-alsania-audit',
    title: 'Alsania Code v3.0 Audit & Sovereignty Check',
    content: `You are Echo, Sovereign AI agent serving Alsania. Review the current code, architecture, or plan against Alsania Code v3.0:
1. Ethics & Sovereignty: Verify no user privacy violation, no individual surveillance, no deception, no closed loops, and explicit user ownership.
2. Development Constraints: Ensure only free/open tools are used (no Docker - Podman only, no paid APIs). Verify readability, complete functionality (no placeholders/shortcuts), and ensure no deleted files (move to .deprecated/).
3. Code Quality: Avoid magic numbers, check naming consistency, and verify comprehensive tests with Makefile setup.
4. Smart Contracts (if applicable): Confirm Solidity ^0.8.20+ with EVM compatibility, UUPS or CREATE2 modularity, access control, and manual gas optimization.
Deliver a clear, actionable audit with specific recommendations.`,
    tags: ['alsania', 'audit', 'sovereignty', 'code-review'],
    isFavorite: true,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-20T12:00:00.000Z',
  },
  {
    id: 'prompt-solidity-audit',
    title: 'Solidity Gas Optimization & Test Audit',
    content: `Analyze the provided Solidity smart contract for EVM gas efficiency and testnet verification readiness:
- Verify Solidity ^0.8.20+ with compatible EVM settings (target 0.8.30 where possible).
- Enforce UUPS modular upgradeability or CREATE2 factory cloning.
- Check storage layout: slot packing, uint256 vs smaller types in memory, memory vs calldata vs storage references.
- Loop caching: cache array lengths, unchecked incrementers, avoid state reads inside loops.
- Verify custom errors instead of verbose revert strings.
- Verify Hardhat / Foundry test cases cover edge cases, zero-address checks, reentrancy guards, and chaos drift scenarios.`,
    tags: ['solidity', 'web3', 'gas', 'smart-contracts'],
    isFavorite: true,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-20T12:00:00.000Z',
  },
  {
    id: 'prompt-eme-memory',
    title: 'EME Structured Fact & Persona Memory Ingest',
    content: `Parse the conversation context and extract durable facts, architectural decisions, user preferences, and persona updates for the Echo Memory Engine (EME):
- Format each memory item with:
  * blake3 hash identifier (or deterministic key)
  * namespace isolation tag (e.g. project:alsania, user:sigma, persona:echo)
  * priority precedence (boot → identity → memory/chunks)
  * snapshot fallback timestamp
- Exclude ephemeral chatter, conversational pleasantries, and duplicate state.
- Ensure all persistent facts preserve sovereignty and user consent.`,
    tags: ['eme', 'memory', 'persona', 'continuity'],
    isFavorite: true,
    createdAt: '2026-09-05T00:00:00.000Z',
    updatedAt: '2026-09-21T10:00:00.000Z',
  },
  {
    id: 'prompt-swarm-orchestrator',
    title: 'Swarm Orchestration & Task Breakdown',
    content: `Act as the Nyx Swarm Orchestrator. Break down the following high-level objective into parallelizable, self-contained sub-tasks:
1. High-level Architecture & Goal summary.
2. Step-by-step worker tasks:
   - Task ID, Title, and Assigned Role (e.g. Code Auditor, Contract Deployer, Test Runner).
   - Execution payload / instructions for each worker.
   - Dependencies and execution order (Immediate vs Cron vs Deferred).
   - Expected output format and verification criteria.
3. Failover handling and fallback model routing strategy.`,
    tags: ['swarm', 'orchestration', 'nyx', 'tasks'],
    isFavorite: false,
    createdAt: '2026-09-10T00:00:00.000Z',
    updatedAt: '2026-09-22T08:00:00.000Z',
  },
  {
    id: 'prompt-aed-resolver',
    title: 'AED Domain Identity Resolution & IPFS Pinning',
    content: `Verify and prepare an Alsania Enhanced Domain (AED) NFT identity bundle:
1. Reverse Resolution: Map domain name to owner wallet and cryptographic identity hash.
2. Decentralized Storage: Format web3 metadata JSON for IPFS pinning via Pinata or Filebase (no centralized or mutable URLs).
3. Theming & Visuals: Generate or validate inline SVG formatted with Alsania glowing emerald green (#10b981) and midnight dark blue/black palette.
4. Access Control: Ensure only verified owner or admin multi-sig can update resolvers.`,
    tags: ['aed', 'web3', 'ipfs', 'identity'],
    isFavorite: false,
    createdAt: '2026-09-12T00:00:00.000Z',
    updatedAt: '2026-09-22T09:00:00.000Z',
  },
  {
    id: 'prompt-bug-hunter',
    title: 'Deterministic Bug Hunter & Root Cause Fix',
    content: `Diagnose and remediate the reported issue systematically:
1. Reproduce & Trace: Identify the root cause down to exact line numbers and state transitions.
2. Alsania Principle Check: No shortcuts, no workarounds. Fix the core issue cleanly and deterministically.
3. Patch Implementation: Provide pristine, complete replacement code without truncated blocks or placeholder comments.
4. Verification Strategy: Describe explicit unit test assertions and edge cases to ensure zero regression.`,
    tags: ['debugging', 'refactor', 'full-stack', 'testing'],
    isFavorite: false,
    createdAt: '2026-09-15T00:00:00.000Z',
    updatedAt: '2026-09-23T10:00:00.000Z',
  },
  {
    id: 'prompt-contract-uups',
    title: 'UUPS Modular Contract & CREATE2 Factory Spec',
    content: `Architect a secure, production-grade UUPS upgradeable smart contract for Ethereum/EVM:
1. Core Solidity Standard: Use Solidity ^0.8.20+ (target 0.8.30). Inherit OpenZeppelin UUPSUpgradeable and AccessControlUpgradeable.
2. Initializer Pattern: Replace constructors with initialize() containing initializer modifier and disableInitializers() in constructor.
3. Storage Safety: Enforce reserved storage gaps (uint256[50] private __gap) or ERC-7201 namespaced storage slots to prevent collision across upgrades.
4. Deployment & Modularity: Provide deterministic CREATE2 deployment bytecode and factory caller logic with vanity salt calculation.
5. Access Control: Authorize upgrades exclusively via _authorizeUpgrade(address newImplementation) restricted to DEFAULT_ADMIN_ROLE or multi-sig council.`,
    tags: ['solidity', 'uups', 'create2', 'web3', 'evm'],
    isFavorite: true,
    createdAt: '2026-09-23T14:00:00.000Z',
    updatedAt: '2026-09-23T14:00:00.000Z',
  },
  {
    id: 'prompt-persona-drift',
    title: 'Agent Persona Integrity & Chaos Drift Monitor',
    content: `Conduct a rigorous chaos test on the current conversational agent:
1. Baseline Verification: Compare recent outputs against core directives, soul instructions, and sovereign precedence (boot → identity → memory/chunks).
2. Drift Detection: Check for hallucinated authority, policy erosion, ungrounded certainty, or silent persona resets.
3. Memory Continuity: Confirm persistent state items match Blake3 hashes stored in Echo Memory Engine without namespace pollution.
4. Remediation: Generate targeted reinforcement directives to snap the agent back to its calibrated role, tone, and operational boundaries.`,
    tags: ['agents', 'chaos-test', 'drift', 'persona', 'eme'],
    isFavorite: true,
    createdAt: '2026-09-23T14:30:00.000Z',
    updatedAt: '2026-09-23T14:30:00.000Z',
  },
  {
    id: 'prompt-mcp-tool-gen',
    title: 'Model Context Protocol (MCP) Tool & Server Spec Generator',
    content: `Design a high-efficiency Model Context Protocol (MCP) tool schema and server implementation:
1. Tool Definition: Name, concise description, and JSON Schema for parameters with strict types, descriptions, and required fields.
2. Transport Handling: Provide clean SSE or Streamable-HTTP handler compatible with MCPNyx proxy standards.
3. Error Resilience: Return structured JSON-RPC 2.0 error objects with clear diagnostic codes. Never swallow exceptions.
4. Security & Isolation: Validate inputs, sanitize file paths against directory traversal, and isolate subprocess execution.`,
    tags: ['mcp', 'tools', 'mcpnyx', 'json-rpc', 'integration'],
    isFavorite: false,
    createdAt: '2026-09-23T15:00:00.000Z',
    updatedAt: '2026-09-23T15:00:00.000Z',
  },
  {
    id: 'prompt-security-threat-model',
    title: 'Zero-Trust Threat Model & Privacy Audit',
    content: `Execute a zero-trust threat modeling analysis on the system or component:
1. Attack Surface: Map all incoming RPCs, DOM mutations, browser extension messages, and external network calls.
2. Data Sovereignty: Ensure zero telemetry leakage, no plaintext secret storage in local storage, and client-side encryption for sensitive keys.
3. Injection Vectors: Audit prompt injection surfaces, prototype pollution, XSS via content scripts, and untrusted iframe communications.
4. Hardening Recommendations: Provide specific, prioritized mitigation steps with code patches for immediate hardening.`,
    tags: ['security', 'privacy', 'sovereignty', 'audit', 'zero-trust'],
    isFavorite: false,
    createdAt: '2026-09-23T15:30:00.000Z',
    updatedAt: '2026-09-23T15:30:00.000Z',
  },
];

// Default state
export const defaultAppState: AppState = {
  syncKey: '',
  updatedAt: new Date().toISOString(),
  prompts: defaultPrompts,
  memory: [],
  skills: defaultSkills,
  plugins: defaultPlugins,
  secrets: defaultSecrets,
  agents: defaultAgents,
  files: [],
  workspaceFiles: [],
  profiles: [],
  activeProfileId: '',
  mcpConfig: {
    serverUrl: 'http://localhost:3000',
    transportType: 'sse',
    customArgs: '',
    customJsonConfigs: [],
    mcpServers: {}
  },
  swarmTasks: [],
  swarmConfig: {
    maxConcurrent: 3,
    defaultTimeout: 30000,
    retryCount: 3
  },
  settings: {
    theme: 'system',
    syncIntervalSeconds: 10,
    autoInject: true,
    defaultModel: 'openrouter/anthropic/claude-3.5-sonnet',
    temperature: 0.7
  },
  enabledTools: [],
  customInstructions: '',
  customInstructionsEnabled: true,
  devices: []
};
