import { readFileSync } from 'node:fs';

const packageJson = JSON.parse(readFileSync('./package.json', 'utf8'));

const manifest = {
  manifest_version: 3,
  default_locale: 'en',
  name: 'Aegis Identity Hub',
  version: packageJson.version,
  browser_specific_settings: {
    gecko: {
      id: 'aidh@alsania-io.com',
      data_collection_permissions: {
        required: ['none'],
        optional: ['technicalAndInteraction']
      }
    }
  },
  description: 'Cross-Device Automation & Memory Extension',
  host_permissions: [
    '*://*.perplexity.ai/*',
    '*://*.chat.openai.com/*',
    '*://*.chatgpt.com/*',
    '*://*.grok.com/*',
    '*://*.x.com/*',
    '*://*.twitter.com/*',
    '*://*.gemini.google.com/*',
    '*://*.aistudio.google.com/*',
    '*://*.openrouter.ai/*',
    '*://*.google-analytics.com/*',
    '*://*.chat.deepseek.com/*',
    '*://*.t3.chat/*',
    '*://*.chat.mistral.ai/*',
    '*://*.github.com/*',
    '*://*.copilot.com/*',
    '*://*.copilot.github.com/*',
    '*://*.copilot.microsoft.com/*',
    '*://*.claude.ai/*',
    '*://*.kimi.com/*',
    '*://*.chat.z.ai/*',
    '*://*.chat.qwen.ai/*',
    '*://*.qwen.ai/*',
    '*://*.trustclaw.app/*',
    '*://*.use.ai/*',
    '*://*.telegram.org/*',
    '*://*.127.0.0.1/*',
    '*://*.localhost/*'
  ],
  permissions: ['storage', 'clipboardWrite', 'activeTab', 'scripting', 'tabs', 'notifications'],
  background: {
    service_worker: 'background.js',
    type: 'module'
  },
  icons: {
    16: 'icon-16.png',
    34: 'icon-34.png',
    48: 'icon-48.png',
    64: 'icon-64.png',
    128: 'icon-128.png'
  },
  content_scripts: [
    {
      matches: [
        '*://*.perplexity.ai/*',
        '*://*.chat.openai.com/*',
        '*://*.chatgpt.com/*',
        '*://*.grok.com/*',
        '*://*.x.com/*',
        '*://*.twitter.com/*',
        '*://*.x.com/i/grok*',
        '*://*.gemini.google.com/*',
        '*://*.aistudio.google.com/*',
        '*://*.openrouter.ai/*',
        '*://*.google-analytics.com/*',
        '*://*.chat.deepseek.com/*',
        '*://*.t3.chat/*',
        '*://*.chat.mistral.ai/*',
        '*://*.github.com/*',
        '*://*.copilot.github.com/*',
        '*://*.copilot.microsoft.com/*',
        '*://*.copilot.com/*',
        '*://*.claude.ai/*',
        '*://*.kimi.com/*',
        '*://*.chat.z.ai/*',
        '*://*.chat.qwen.ai/*',
        '*://*.qwen.ai/*',
        '*://*.trustclaw.app/*',
        '*://*.use.ai/*',
        '*://*.telegram.org/*',
        '*://*.127.0.0.1/*',
        '*://*.localhost/*'
      ],
      js: ['content/index.iife.js', 'json_function_call_extractor.js'],
      css: ['content/index.css'],
      run_at: 'document_idle'
    },
    // Copilot: handled entirely by CopilotAdapter (plugin) in content/index.iife.js.
    // Claude: handled entirely by ClaudeAdapter (plugin) in content/index.iife.js.
    // DeepSeek: handled entirely by DeepSeekAdapter (plugin) in content/index.iife.js.
    // The legacy addons/content_targeted.js workaround was removed after the
    // adapter absorbed its robust send-button finder and auto-submit logic.
  ],
  web_accessible_resources: [
    {
      resources: [
        '*.js',
        '*.css',
        'content/*.css',
        'content/*.svg',
        'icon-16.png',
        'icon-34.png',
        'icon-48.png',
        'icon-64.png',
        'icon-128.png',
        'favicon.ico',
        '*.png'
      ],
      matches: ['*://*/*', '<all_urls>']
    }
  ],
  // The SDK does not require any CSP relaxation — matches Nyx's proven config
  content_security_policy: {
    extension_pages: "script-src 'self'; object-src 'self'"
  }
} satisfies chrome.runtime.ManifestV3;

export default manifest;