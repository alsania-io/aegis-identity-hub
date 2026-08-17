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

export interface SwarmTask {
  id: string;
  name: string;
  description: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  config: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface SwarmConfig {
  maxConcurrent: number;
  defaultTimeout: number;
  retryCount: number;
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

export interface AppState {
  syncKey: string;
  updatedAt: string;
  prompts: Prompt[];
  memory: MemoryItem[];
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

// Default state
export const defaultAppState: AppState = {
  syncKey: '',
  updatedAt: new Date().toISOString(),
  prompts: [],
  memory: [],
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
    defaultModel: 'openai/gpt-4o-mini',
    temperature: 0.7
  },
  enabledTools: [],
  customInstructions: '',
  customInstructionsEnabled: true,
  devices: []
};