import {
  AiModelItem,
  ModelAssignments,
  ModelProviderConfig,
  ModelProviderId,
  ModelsState,
} from '../types/identity';

export const DEFAULT_MODEL_PROVIDERS: Record<ModelProviderId, ModelProviderConfig> = {
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter',
    description: 'Unified gateway to 300+ frontier and open models, free tiers, Claude, GPT, DeepSeek, and Llama.',
    enabled: true,
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultEndpoint: 'https://openrouter.ai/api/v1',
    apiKey: '',
    status: 'idle',
    badge: 'Multi-Model Gateway',
    docsUrl: 'https://openrouter.ai/docs',
  },
  'kilo-code': {
    id: 'kilo-code',
    name: 'Kilo Code',
    description: 'Specialized ultra-low-latency coding, syntax repair, EVM auditing, and reasoning engine.',
    enabled: true,
    baseUrl: 'https://api.kilo.code/v1',
    defaultEndpoint: 'https://api.kilo.code/v1',
    apiKey: '',
    status: 'idle',
    badge: 'Code & Reasoning',
    docsUrl: 'https://kilo.code/docs',
  },
  bazaarlink: {
    id: 'bazaarlink',
    name: 'BazaarLink',
    description: 'Decentralized Web3 AI marketplace, peer-to-peer compute nodes, and sovereign agent models.',
    enabled: true,
    baseUrl: 'https://api.bazaarlink.com/v1',
    defaultEndpoint: 'https://api.bazaarlink.com/v1',
    apiKey: '',
    status: 'idle',
    badge: 'P2P & Web3 Sovereign',
    docsUrl: 'https://bazaarlink.com',
  },
  huggingface: {
    id: 'huggingface',
    name: 'Hugging Face',
    description: 'Serverless Inference Router with open-weight state-of-the-art models (DeepSeek, Llama, Qwen, Mistral).',
    enabled: true,
    baseUrl: 'https://router.huggingface.co/hf-inference/v1',
    defaultEndpoint: 'https://router.huggingface.co/hf-inference/v1',
    apiKey: '',
    status: 'idle',
    badge: 'Open Weights Hub',
    docsUrl: 'https://huggingface.co/docs/api-inference',
  },
  cohere: {
    id: 'cohere',
    name: 'Cohere',
    description: 'Command R+ reasoning, multilingual Aya Expanse, enterprise RAG, and fast execution.',
    enabled: true,
    baseUrl: 'https://api.cohere.com/v1',
    defaultEndpoint: 'https://api.cohere.com/v1',
    apiKey: '',
    status: 'idle',
    badge: 'Command R & Aya',
    docsUrl: 'https://docs.cohere.com',
  },
  local: {
    id: 'local',
    name: 'Localhost / Llama',
    description: 'Local runtime (Ollama, LM Studio, LocalAI, vLLM, llama.cpp) running completely offline on your device.',
    enabled: true,
    baseUrl: 'http://localhost:11434/v1',
    defaultEndpoint: 'http://localhost:11434/v1',
    apiKey: 'not-needed',
    status: 'idle',
    badge: 'Localhost / 100% Private',
    docsUrl: 'https://ollama.com',
  },
  'openai-compatible': {
    id: 'openai-compatible',
    name: 'OpenAI Compatible',
    description: 'Connect any OpenAI-compatible API endpoint (Groq, Together, Mistral, DeepInfra, self-hosted proxy).',
    enabled: false,
    baseUrl: 'https://api.openai.com/v1',
    defaultEndpoint: 'https://api.openai.com/v1',
    apiKey: '',
    status: 'idle',
    badge: 'Custom Endpoint',
    docsUrl: 'https://platform.openai.com/docs/api-reference',
  },
  openai: {
    id: 'openai',
    name: 'OpenAI Direct',
    description: 'Direct access to OpenAI GPT-4o, GPT-4o Mini, o1, and o3-mini models.',
    enabled: false,
    baseUrl: 'https://api.openai.com/v1',
    defaultEndpoint: 'https://api.openai.com/v1',
    apiKey: '',
    status: 'idle',
    badge: 'Direct Cloud',
    docsUrl: 'https://platform.openai.com',
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic Direct',
    description: 'Direct Claude 3.5 Sonnet, Haiku, and Opus API integrations.',
    enabled: false,
    baseUrl: 'https://api.anthropic.com/v1',
    defaultEndpoint: 'https://api.anthropic.com/v1',
    apiKey: '',
    status: 'idle',
    badge: 'Direct Cloud',
    docsUrl: 'https://docs.anthropic.com',
  },
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    description: 'Google AI Studio & Gemini 2.5 Flash, 2.0 Pro, and Flash Experimental models.',
    enabled: false,
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    defaultEndpoint: 'https://generativelanguage.googleapis.com/v1beta/openai',
    apiKey: '',
    status: 'idle',
    badge: 'Google AI Studio',
    docsUrl: 'https://aistudio.google.com',
  },
};

export const DEFAULT_MODEL_ASSIGNMENTS: ModelAssignments = {
  defaultModel: 'openrouter/anthropic/claude-3.5-sonnet',
  swarmOrchestratorModel: 'openrouter/anthropic/claude-3.5-sonnet',
  swarmWorkerModel: 'local/llama3.2:3b',
  cronTasksDefaultModel: 'kilo/kilo-coder-pro',
  agentDefaultModel: 'openrouter/anthropic/claude-3.5-sonnet',
  agentFallbackModel: 'local/deepseek-r1:8b',
};

// Built-in curated catalog for guaranteed instant auto-generation per provider
export const PROVIDER_CATALOGUES: Record<ModelProviderId, AiModelItem[]> = {
  openrouter: [
    {
      id: 'openrouter/free',
      rawId: 'openrouter/free',
      name: 'OpenRouter Free Pool (Auto-Route)',
      providerId: 'openrouter',
      providerName: 'OpenRouter',
      description: 'Dynamically routes to the best available free model with zero token costs.',
      contextWindow: 32768,
      category: 'fast',
      pricingType: 'free',
      isFavorite: true,
      tags: ['free', 'auto-router', 'fast'],
    },
    {
      id: 'openrouter/anthropic/claude-3.5-sonnet',
      rawId: 'anthropic/claude-3.5-sonnet',
      name: 'Claude 3.5 Sonnet',
      providerId: 'openrouter',
      providerName: 'OpenRouter',
      description: 'Frontier intelligence for complex programming, visual analysis, and long-context synthesis.',
      contextWindow: 200000,
      category: 'code',
      pricingType: 'paid',
      isFavorite: true,
      tags: ['top-pick', 'code', 'vision', 'reasoning'],
    },
    {
      id: 'openrouter/anthropic/claude-3.5-haiku',
      rawId: 'anthropic/claude-3.5-haiku',
      name: 'Claude 3.5 Haiku',
      providerId: 'openrouter',
      providerName: 'OpenRouter',
      description: 'High-speed, low-latency version of Claude 3.5 for swarm workers and automation.',
      contextWindow: 200000,
      category: 'fast',
      pricingType: 'paid',
      tags: ['fast', 'swarm', 'agent'],
    },
    {
      id: 'openrouter/openai/gpt-4o',
      rawId: 'openai/gpt-4o',
      name: 'GPT-4o (Omni)',
      providerId: 'openrouter',
      providerName: 'OpenRouter',
      description: 'Flagship multimodal flagship model from OpenAI with balanced speed and capability.',
      contextWindow: 128000,
      category: 'general',
      pricingType: 'paid',
      isFavorite: true,
      tags: ['openai', 'vision', 'multimodal'],
    },
    {
      id: 'openrouter/openai/gpt-4o-mini',
      rawId: 'openai/gpt-4o-mini',
      name: 'GPT-4o Mini',
      providerId: 'openrouter',
      providerName: 'OpenRouter',
      description: 'Cost-effective, lightning fast model for recurring tasks and background workers.',
      contextWindow: 128000,
      category: 'fast',
      pricingType: 'paid',
      tags: ['fast', 'cron', 'affordable'],
    },
    {
      id: 'openrouter/deepseek/deepseek-r1',
      rawId: 'deepseek/deepseek-r1',
      name: 'DeepSeek R1 (Full Reasoning)',
      providerId: 'openrouter',
      providerName: 'OpenRouter',
      description: 'Open-weights reasoning champion with detailed chain-of-thought verification.',
      contextWindow: 64000,
      category: 'reasoning',
      pricingType: 'paid',
      isFavorite: true,
      tags: ['reasoning', 'math', 'logic'],
    },
    {
      id: 'openrouter/deepseek/deepseek-chat',
      rawId: 'deepseek/deepseek-chat',
      name: 'DeepSeek V3 (Chat)',
      providerId: 'openrouter',
      providerName: 'OpenRouter',
      description: '671B parameter mixture-of-experts general intelligence and programming powerhouse.',
      contextWindow: 64000,
      category: 'general',
      pricingType: 'paid',
      tags: ['moe', 'code', 'chat'],
    },
    {
      id: 'openrouter/meta-llama/llama-3.3-70b-instruct',
      rawId: 'meta-llama/llama-3.3-70b-instruct',
      name: 'Llama 3.3 70B Instruct',
      providerId: 'openrouter',
      providerName: 'OpenRouter',
      description: 'Flagship open weights model from Meta with 70B parameters and 128k context.',
      contextWindow: 128000,
      category: 'general',
      pricingType: 'paid',
      tags: ['open-weights', 'meta', '128k'],
    },
    {
      id: 'openrouter/qwen/qwen-2.5-coder-32b-instruct',
      rawId: 'qwen/qwen-2.5-coder-32b-instruct',
      name: 'Qwen 2.5 Coder 32B Instruct',
      providerId: 'openrouter',
      providerName: 'OpenRouter',
      description: 'Alibaba code model rivaling top closed models on code benchmark suites.',
      contextWindow: 128000,
      category: 'code',
      pricingType: 'paid',
      tags: ['code', 'python', 'solidity', 'typescript'],
    },
  ],

  'kilo-code': [
    {
      id: 'kilo/kilo-coder-pro',
      rawId: 'kilo-coder-pro',
      name: 'Kilo Coder Pro (v3)',
      providerId: 'kilo-code',
      providerName: 'Kilo Code',
      description: 'Deeply tuned on multi-file repo refactoring, AST transforms, and modern TypeScript / Solidity.',
      contextWindow: 131072,
      category: 'code',
      pricingType: 'paid',
      isFavorite: true,
      tags: ['refactor', 'repo-wide', 'typescript'],
    },
    {
      id: 'kilo/kilo-reasoner-r1',
      rawId: 'kilo-reasoner-r1',
      name: 'Kilo Reasoner R1',
      providerId: 'kilo-code',
      providerName: 'Kilo Code',
      description: 'Extended chain-of-thought code architect for algorithmic planning and theorem proving.',
      contextWindow: 65536,
      category: 'reasoning',
      pricingType: 'paid',
      isFavorite: true,
      tags: ['architecture', 'reasoning', 'planning'],
    },
    {
      id: 'kilo/kilo-audit-evm',
      rawId: 'kilo-audit-evm',
      name: 'Kilo EVM Security Auditor',
      providerId: 'kilo-code',
      providerName: 'Kilo Code',
      description: 'Specialized for smart contract bytecode verification, reentrancy guards, and gas profiling.',
      contextWindow: 65536,
      category: 'code',
      pricingType: 'paid',
      tags: ['solidity', 'security', 'gas-optimization'],
    },
    {
      id: 'kilo/kilo-fast-inline',
      rawId: 'kilo-fast-inline',
      name: 'Kilo Fast Inline (Sub-100ms)',
      providerId: 'kilo-code',
      providerName: 'Kilo Code',
      description: 'Ultra-fast inline completions and one-shot lint/type corrections.',
      contextWindow: 32768,
      category: 'fast',
      pricingType: 'paid',
      tags: ['fast', 'inline', 'cron'],
    },
    {
      id: 'kilo/kilo-qwen-coder-32b',
      rawId: 'kilo-qwen-coder-32b',
      name: 'Kilo Qwen Coder 32B Supercharged',
      providerId: 'kilo-code',
      providerName: 'Kilo Code',
      description: 'Kilo-optimized Qwen 2.5 Coder checkpoint with tailored system prompt anchors.',
      contextWindow: 128000,
      category: 'code',
      pricingType: 'paid',
      tags: ['qwen', 'kilo', 'full-stack'],
    },
  ],

  bazaarlink: [
    {
      id: 'bazaarlink/alsania-sovereign-70b',
      rawId: 'alsania-sovereign-70b',
      name: 'BazaarLink Alsania Sovereign 70B',
      providerId: 'bazaarlink',
      providerName: 'BazaarLink',
      description: 'Alsania-aligned sovereign foundation model with strict user privacy and zero data tracking.',
      contextWindow: 131072,
      category: 'reasoning',
      pricingType: 'free',
      isFavorite: true,
      tags: ['alsania', 'sovereign', 'p2p', 'privacy'],
    },
    {
      id: 'bazaarlink/decentralized-agent-swarm',
      rawId: 'decentralized-agent-swarm-v2',
      name: 'BazaarLink Swarm Coordinator v2',
      providerId: 'bazaarlink',
      providerName: 'BazaarLink',
      description: 'Decentralized orchestrator for multi-agent DAG pipelines across decentralized nodes.',
      contextWindow: 65536,
      category: 'general',
      pricingType: 'free',
      isFavorite: true,
      tags: ['swarm', 'dag', 'coordinator'],
    },
    {
      id: 'bazaarlink/p2p-inference-free',
      rawId: 'p2p-inference-free-pool',
      name: 'BazaarLink P2P Free Inference Pool',
      providerId: 'bazaarlink',
      providerName: 'BazaarLink',
      description: 'Community hosted P2P nodes offering distributed open-weights compute for Alsania agents.',
      contextWindow: 32768,
      category: 'fast',
      pricingType: 'free',
      tags: ['free', 'community', 'p2p'],
    },
    {
      id: 'bazaarlink/web3-smart-contract',
      rawId: 'web3-smart-contract-v1',
      name: 'BazaarLink Web3 Smart Contract Specialist',
      providerId: 'bazaarlink',
      providerName: 'BazaarLink',
      description: 'Trained on EVM, Hardhat, AED (Alsania Enhanced Domains), and ERC standards.',
      contextWindow: 65536,
      category: 'code',
      pricingType: 'paid',
      tags: ['web3', 'solidity', 'hardhat', 'aed'],
    },
    {
      id: 'bazaarlink/ipfs-memory-synthesizer',
      rawId: 'ipfs-memory-synthesizer',
      name: 'BazaarLink IPFS & EME Memory Engine',
      providerId: 'bazaarlink',
      providerName: 'BazaarLink',
      description: 'Extracts semantic chunks, Blake3 hashes, and builds IPFS-pinned continuity state for Echo & Aegis.',
      contextWindow: 65536,
      category: 'reasoning',
      pricingType: 'paid',
      tags: ['eme', 'ipfs', 'memory', 'blake3'],
    },
  ],

  huggingface: [
    {
      id: 'huggingface/meta-llama/Llama-3.3-70B-Instruct',
      rawId: 'meta-llama/Llama-3.3-70B-Instruct',
      name: 'HF Llama 3.3 70B Instruct',
      providerId: 'huggingface',
      providerName: 'Hugging Face',
      description: 'Meta state-of-the-art open model served via Hugging Face serverless inference routers.',
      contextWindow: 128000,
      category: 'general',
      pricingType: 'paid',
      isFavorite: true,
      tags: ['serverless', 'meta', 'hf-router'],
    },
    {
      id: 'huggingface/deepseek-ai/DeepSeek-R1',
      rawId: 'deepseek-ai/DeepSeek-R1',
      name: 'HF DeepSeek R1 Full',
      providerId: 'huggingface',
      providerName: 'Hugging Face',
      description: 'Full DeepSeek R1 reasoning model deployed directly on Hugging Face inference endpoints.',
      contextWindow: 64000,
      category: 'reasoning',
      pricingType: 'paid',
      tags: ['deepseek', 'reasoning', 'open-weights'],
    },
    {
      id: 'huggingface/Qwen/Qwen2.5-Coder-32B-Instruct',
      rawId: 'Qwen/Qwen2.5-Coder-32B-Instruct',
      name: 'HF Qwen 2.5 Coder 32B',
      providerId: 'huggingface',
      providerName: 'Hugging Face',
      description: 'Dedicated code model for multi-language development and repository maintenance.',
      contextWindow: 128000,
      category: 'code',
      pricingType: 'paid',
      isFavorite: true,
      tags: ['code', 'programming', 'hf'],
    },
    {
      id: 'huggingface/mistralai/Mistral-Small-24B-Instruct-2501',
      rawId: 'mistralai/Mistral-Small-24B-Instruct-2501',
      name: 'HF Mistral Small 24B (2501)',
      providerId: 'huggingface',
      providerName: 'Hugging Face',
      description: 'Mistral latest small reasoning model with fast instruction following and tool calling.',
      contextWindow: 32768,
      category: 'fast',
      pricingType: 'paid',
      tags: ['mistral', 'fast', 'tool-use'],
    },
    {
      id: 'huggingface/microsoft/Phi-4',
      rawId: 'microsoft/Phi-4',
      name: 'HF Microsoft Phi-4 (14B)',
      providerId: 'huggingface',
      providerName: 'Hugging Face',
      description: 'Synthetic data trained powerhouse for complex reasoning and mathematics in compact footprint.',
      contextWindow: 16384,
      category: 'reasoning',
      pricingType: 'paid',
      tags: ['phi', 'math', 'compact'],
    },
  ],

  cohere: [
    {
      id: 'cohere/command-r-plus-08-2024',
      rawId: 'command-r-plus-08-2024',
      name: 'Cohere Command R+ (Aug 2024)',
      providerId: 'cohere',
      providerName: 'Cohere',
      description: 'State-of-the-art enterprise RAG, tool use, multi-step agent workflows, and multilingual reasoning.',
      contextWindow: 128000,
      category: 'reasoning',
      pricingType: 'paid',
      isFavorite: true,
      tags: ['enterprise', 'rag', 'tool-use', 'multilingual'],
    },
    {
      id: 'cohere/command-r-08-2024',
      rawId: 'command-r-08-2024',
      name: 'Cohere Command R (Aug 2024)',
      providerId: 'cohere',
      providerName: 'Cohere',
      description: 'Optimized for high-throughput operational tasks, summarization, and scheduled cron jobs.',
      contextWindow: 128000,
      category: 'general',
      pricingType: 'paid',
      tags: ['fast', 'cron', 'rag'],
    },
    {
      id: 'cohere/command-light',
      rawId: 'command-light',
      name: 'Cohere Command Light',
      providerId: 'cohere',
      providerName: 'Cohere',
      description: 'Ultra-fast sub-second model ideal for rapid classification and prompt sanity checks.',
      contextWindow: 4096,
      category: 'fast',
      pricingType: 'paid',
      tags: ['lightweight', 'speed'],
    },
    {
      id: 'cohere/c4ai-aya-expanse-32b',
      rawId: 'c4ai-aya-expanse-32b',
      name: 'Cohere Aya Expanse 32B',
      providerId: 'cohere',
      providerName: 'Cohere',
      description: 'Breakthrough multilingual model supporting 23+ global languages with native cultural nuances.',
      contextWindow: 128000,
      category: 'multilingual',
      pricingType: 'paid',
      isFavorite: true,
      tags: ['multilingual', 'aya', 'open-science'],
    },
    {
      id: 'cohere/c4ai-aya-expanse-8b',
      rawId: 'c4ai-aya-expanse-8b',
      name: 'Cohere Aya Expanse 8B',
      providerId: 'cohere',
      providerName: 'Cohere',
      description: 'Compact 8B multilingual model for edge devices and low-resource environments.',
      contextWindow: 8192,
      category: 'multilingual',
      pricingType: 'paid',
      tags: ['multilingual', 'compact', 'fast'],
    },
  ],

  local: [
    {
      id: 'local/llama3.3:70b',
      rawId: 'llama3.3:70b',
      name: 'Local Llama 3.3 (70B)',
      providerId: 'local',
      providerName: 'Localhost / Llama',
      description: 'Top-tier local intelligence running on Ollama, LM Studio, or vLLM with zero cloud leakage.',
      contextWindow: 128000,
      category: 'general',
      pricingType: 'local',
      isFavorite: true,
      tags: ['local', '100%-private', 'ollama'],
    },
    {
      id: 'local/llama3.2:3b',
      rawId: 'llama3.2:3b',
      name: 'Local Llama 3.2 (3B Compact)',
      providerId: 'local',
      providerName: 'Localhost / Llama',
      description: 'Ultra-lightweight local model running on any laptop CPU with instant response times.',
      contextWindow: 128000,
      category: 'fast',
      pricingType: 'local',
      isFavorite: true,
      tags: ['local', 'laptop-friendly', 'fast'],
    },
    {
      id: 'local/deepseek-r1:14b',
      rawId: 'deepseek-r1:14b',
      name: 'Local DeepSeek R1 (14B Distill)',
      providerId: 'local',
      providerName: 'Localhost / Llama',
      description: 'Local reasoning champion with full step-by-step thinking traces on your hardware.',
      contextWindow: 65536,
      category: 'reasoning',
      pricingType: 'local',
      isFavorite: true,
      tags: ['reasoning', 'local', 'deepseek'],
    },
    {
      id: 'local/deepseek-r1:8b',
      rawId: 'deepseek-r1:8b',
      name: 'Local DeepSeek R1 (8B Distill)',
      providerId: 'local',
      providerName: 'Localhost / Llama',
      description: 'Fast local reasoning model running in under 6GB of VRAM or system RAM.',
      contextWindow: 65536,
      category: 'reasoning',
      pricingType: 'local',
      tags: ['local', 'low-vram', 'reasoning'],
    },
    {
      id: 'local/qwen2.5-coder:14b',
      rawId: 'qwen2.5-coder:14b',
      name: 'Local Qwen 2.5 Coder (14B)',
      providerId: 'local',
      providerName: 'Localhost / Llama',
      description: 'High-capability local coding assistant for offline code reviews and refactoring.',
      contextWindow: 65536,
      category: 'code',
      pricingType: 'local',
      tags: ['code', 'local', 'qwen'],
    },
    {
      id: 'local/mistral:7b',
      rawId: 'mistral:7b',
      name: 'Local Mistral (7B Instruct)',
      providerId: 'local',
      providerName: 'Localhost / Llama',
      description: 'Classic versatile 7B local workhorse for automated cron jobs and fast worker tasks.',
      contextWindow: 32768,
      category: 'fast',
      pricingType: 'local',
      tags: ['local', 'mistral', 'workhorse'],
    },
    {
      id: 'local/phi4:14b',
      rawId: 'phi4:14b',
      name: 'Local Phi-4 (14B)',
      providerId: 'local',
      providerName: 'Localhost / Llama',
      description: 'Microsoft synthetic data trained local reasoning model.',
      contextWindow: 16384,
      category: 'reasoning',
      pricingType: 'local',
      tags: ['local', 'math', 'phi'],
    },
  ],

  'openai-compatible': [
    {
      id: 'openai-compatible/custom-gpt-4o',
      rawId: 'gpt-4o',
      name: 'Custom Endpoint GPT-4o Route',
      providerId: 'openai-compatible',
      providerName: 'OpenAI Compatible',
      description: 'Proxied or self-hosted endpoint exposing standard v1/chat/completions.',
      contextWindow: 128000,
      category: 'general',
      pricingType: 'paid',
      tags: ['custom', 'proxy', 'openai-compatible'],
    },
    {
      id: 'openai-compatible/custom-deepseek-r1',
      rawId: 'deepseek-r1',
      name: 'Custom Endpoint DeepSeek R1',
      providerId: 'openai-compatible',
      providerName: 'OpenAI Compatible',
      description: 'Private cluster or cloud provider (Groq, Together, DeepInfra) DeepSeek R1 instance.',
      contextWindow: 65536,
      category: 'reasoning',
      pricingType: 'paid',
      tags: ['custom', 'deepseek', 'reasoning'],
    },
    {
      id: 'openai-compatible/custom-llama-3.3-70b',
      rawId: 'llama-3.3-70b',
      name: 'Custom Endpoint Llama 3.3 70B',
      providerId: 'openai-compatible',
      providerName: 'OpenAI Compatible',
      description: 'High-throughput private Llama instance.',
      contextWindow: 128000,
      category: 'general',
      pricingType: 'paid',
      tags: ['custom', 'llama', 'high-throughput'],
    },
  ],

  openai: [
    {
      id: 'openai/gpt-4o',
      rawId: 'gpt-4o',
      name: 'OpenAI GPT-4o',
      providerId: 'openai',
      providerName: 'OpenAI Direct',
      description: 'Direct OpenAI flagship omni-model.',
      contextWindow: 128000,
      category: 'general',
      pricingType: 'paid',
      tags: ['direct', 'openai'],
    },
    {
      id: 'openai/gpt-4o-mini',
      rawId: 'gpt-4o-mini',
      name: 'OpenAI GPT-4o Mini',
      providerId: 'openai',
      providerName: 'OpenAI Direct',
      description: 'Fast, compact model for background workers.',
      contextWindow: 128000,
      category: 'fast',
      pricingType: 'paid',
      tags: ['direct', 'fast'],
    },
    {
      id: 'openai/o3-mini',
      rawId: 'o3-mini',
      name: 'OpenAI o3-mini Reasoning',
      providerId: 'openai',
      providerName: 'OpenAI Direct',
      description: 'Latest high-speed reasoning model from OpenAI.',
      contextWindow: 200000,
      category: 'reasoning',
      pricingType: 'paid',
      tags: ['reasoning', 'o3'],
    },
  ],

  anthropic: [
    {
      id: 'anthropic/claude-3-5-sonnet',
      rawId: 'claude-3-5-sonnet-20241022',
      name: 'Anthropic Claude 3.5 Sonnet',
      providerId: 'anthropic',
      providerName: 'Anthropic Direct',
      description: 'Direct Anthropic API Claude 3.5 Sonnet.',
      contextWindow: 200000,
      category: 'code',
      pricingType: 'paid',
      tags: ['direct', 'anthropic', 'code'],
    },
    {
      id: 'anthropic/claude-3-5-haiku',
      rawId: 'claude-3-5-haiku-20241022',
      name: 'Anthropic Claude 3.5 Haiku',
      providerId: 'anthropic',
      providerName: 'Anthropic Direct',
      description: 'Direct Anthropic API Claude 3.5 Haiku.',
      contextWindow: 200000,
      category: 'fast',
      pricingType: 'paid',
      tags: ['direct', 'fast'],
    },
  ],

  gemini: [
    {
      id: 'gemini/gemini-2.5-flash',
      rawId: 'gemini-2.5-flash',
      name: 'Gemini 2.5 Flash',
      providerId: 'gemini',
      providerName: 'Google Gemini',
      description: 'Ultra-fast multimodal reasoning with 1M token context window.',
      contextWindow: 1048576,
      category: 'fast',
      pricingType: 'paid',
      tags: ['google', 'multimodal', '1m-context'],
    },
    {
      id: 'gemini/gemini-2.0-flash-exp',
      rawId: 'gemini-2.0-flash-exp',
      name: 'Gemini 2.0 Flash Experimental',
      providerId: 'gemini',
      providerName: 'Google Gemini',
      description: 'Google next-gen multimodal speed and function calling capabilities.',
      contextWindow: 1048576,
      category: 'reasoning',
      pricingType: 'paid',
      tags: ['google', 'experimental'],
    },
  ],
};

/**
 * Automatically generates the full list of models for whichever providers are enabled/selected.
 * Merges any custom user models or live fetched models without duplicates.
 */
export function generateModelsForProviders(
  selectedProviderIds: ModelProviderId[],
  existingCustomModels: AiModelItem[] = []
): AiModelItem[] {
  const result: AiModelItem[] = [];
  const seenIds = new Set<string>();

  // 1. Add all catalog models for each selected provider
  for (const providerId of selectedProviderIds) {
    const catalog = PROVIDER_CATALOGUES[providerId] || [];
    for (const model of catalog) {
      if (!seenIds.has(model.id)) {
        seenIds.add(model.id);
        result.push(model);
      }
    }
  }

  // 2. Preserve any custom or live-fetched models that belong to selected providers
  for (const custom of existingCustomModels) {
    if (selectedProviderIds.includes(custom.providerId) && !seenIds.has(custom.id)) {
      seenIds.add(custom.id);
      result.push(custom);
    }
  }

  return result;
}

/**
 * Live model fetcher from provider endpoint (OpenRouter / Ollama / OpenAI Compatible / Hugging Face / Cohere)
 * Falls back gracefully to the rich curated catalogue if network / CORS blocks browser requests.
 */
export async function fetchLiveModelsFromProvider(
  provider: ModelProviderConfig
): Promise<{ success: boolean; models: AiModelItem[]; error?: string }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000); // 6s timeout

    let url = provider.baseUrl;
    if (provider.id === 'local') {
      // Ollama tags endpoint or v1/models
      url = provider.baseUrl.replace(/\/v1$/, '') + '/api/tags';
    } else if (!url.endsWith('/models')) {
      url = url.replace(/\/$/, '') + '/models';
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (provider.apiKey && provider.apiKey !== 'not-needed') {
      headers['Authorization'] = `Bearer ${provider.apiKey}`;
      if (provider.id === 'openrouter') {
        headers['HTTP-Referer'] = 'https://alsania-io.com/aegis-identity-hub';
        headers['X-Title'] = 'Aegis Identity Hub';
      }
    }

    const res = await fetch(url, {
      method: 'GET',
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    const fetchedModels: AiModelItem[] = [];

    // Parse according to provider format
    if (provider.id === 'local' && Array.isArray(data.models)) {
      // Ollama /api/tags format: { models: [ { name: "llama3.2:3b", ... } ] }
      for (const item of data.models) {
        const rawName = item.name || item.model || '';
        if (!rawName) continue;
        fetchedModels.push({
          id: `local/${rawName}`,
          rawId: rawName,
          name: `Local ${rawName}`,
          providerId: 'local',
          providerName: 'Localhost / Llama',
          description: `Discovered from active local server (${item.details?.parameter_size || 'local'}).`,
          contextWindow: item.details?.context_length || 32768,
          category: rawName.includes('coder') ? 'code' : rawName.includes('r1') ? 'reasoning' : 'general',
          pricingType: 'local',
          isCustom: true,
          tags: ['discovered', 'local', 'offline'],
        });
      }
    } else if (Array.isArray(data.data)) {
      // Standard OpenAI / OpenRouter format: { data: [ { id: "...", ... } ] }
      for (const item of data.data) {
        const rawId = item.id;
        if (!rawId) continue;
        fetchedModels.push({
          id: `${provider.id}/${rawId}`,
          rawId,
          name: item.name || rawId,
          providerId: provider.id,
          providerName: provider.name,
          description: item.description || `Live model from ${provider.name}`,
          contextWindow: item.context_length || 128000,
          category: rawId.includes('code') ? 'code' : rawId.includes('r1') || rawId.includes('o1') ? 'reasoning' : 'general',
          pricingType: provider.id === 'local' ? 'local' : 'paid',
          isCustom: true,
          tags: ['live-discovered', provider.id],
        });
      }
    }

    if (fetchedModels.length === 0) {
      // If endpoint returned empty or non-standard, return catalog
      return {
        success: true,
        models: PROVIDER_CATALOGUES[provider.id] || [],
        error: 'No model entries in endpoint response; auto-generated from verified catalogue.',
      };
    }

    return {
      success: true,
      models: fetchedModels,
    };
  } catch (err: any) {
    // Graceful fallback to verified curated catalogue
    const catalog = PROVIDER_CATALOGUES[provider.id] || [];
    return {
      success: false,
      models: catalog,
      error: `Could not reach live endpoint (${err.message || 'offline/CORS'}). Loaded verified catalog instead.`,
    };
  }
}

/**
 * Initializes default ModelsState
 */
export function getDefaultModelsState(): ModelsState {
  const selectedProviderIds: ModelProviderId[] = [
    'openrouter',
    'kilo-code',
    'bazaarlink',
    'huggingface',
    'cohere',
    'local',
  ];

  return {
    providers: DEFAULT_MODEL_PROVIDERS,
    selectedProviderIds,
    models: generateModelsForProviders(selectedProviderIds),
    assignments: DEFAULT_MODEL_ASSIGNMENTS,
    autoFetchOnSelect: true,
    lastGeneratedAt: new Date().toISOString(),
  };
}
