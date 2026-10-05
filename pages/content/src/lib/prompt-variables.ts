/**
 * Prompt Template Variables Resolver
 * Resolves dynamic placeholders like {{selection}}, {{page_url}}, {{page_title}},
 * {{clipboard}}, {{agent_name}}, {{date}}, {{time}} at injection/copy time.
 */

export interface PromptVariableContext {
  agentName?: string;
  selection?: string;
  pageUrl?: string;
  pageTitle?: string;
  clipboard?: string;
}

export const SUPPORTED_VARIABLES = [
  { key: 'selection', label: 'Selected Text', desc: 'Currently highlighted text in active webpage' },
  { key: 'page_url', label: 'Page URL', desc: 'Full URL of current browser tab' },
  { key: 'page_title', label: 'Page Title', desc: 'Title tag of current browser tab' },
  { key: 'clipboard', label: 'Clipboard', desc: 'Current text from clipboard' },
  { key: 'agent_name', label: 'Active Agent', desc: 'Currently active sovereign agent' },
  { key: 'date', label: 'Current Date', desc: 'Today in YYYY-MM-DD format' },
  { key: 'time', label: 'Current Time', desc: 'Local time in HH:mm:ss format' },
  { key: 'datetime', label: 'ISO Timestamp', desc: 'Full ISO 8601 timestamp' },
];

/**
 * Extracts variable names inside {{...}} from template text
 */
export function extractVariables(template: string): string[] {
  const matches = template.match(/\{\{([a-zA-Z0-9_-]+)\}\}/g) || [];
  const keys = matches.map(m => m.replace(/[\{\}]/g, '').trim());
  return Array.from(new Set(keys));
}

/**
 * Resolves context values from current browser window / selection / clipboard
 */
export async function getBrowserContext(agentName?: string): Promise<PromptVariableContext> {
  const ctx: PromptVariableContext = {
    agentName: agentName || 'Echo',
    pageUrl: typeof window !== 'undefined' ? window.location.href : '',
    pageTitle: typeof document !== 'undefined' ? document.title : '',
    selection: '',
    clipboard: ''
  };

  // 1. Get window selection if available
  if (typeof window !== 'undefined') {
    const sel = window.getSelection()?.toString().trim();
    if (sel) {
      ctx.selection = sel;
    }
  }

  // 2. Read clipboard if permission granted
  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.readText) {
    try {
      const clip = await navigator.clipboard.readText();
      if (clip) {
        ctx.clipboard = clip;
      }
    } catch {
      // Clipboard read may be blocked in some contexts
    }
  }

  return ctx;
}

/**
 * Resolves template string by substituting all variable tokens
 */
export async function resolvePromptVariables(
  template: string,
  providedContext?: PromptVariableContext
): Promise<{ resolved: string; resolvedVars: string[]; unfilledVars: string[] }> {
  const variables = extractVariables(template);
  if (variables.length === 0) {
    return { resolved: template, resolvedVars: [], unfilledVars: [] };
  }

  const ctx = providedContext || await getBrowserContext();
  const now = new Date();
  const resolvedVars: string[] = [];
  const unfilledVars: string[] = [];

  let result = template;

  for (const varKey of variables) {
    const pattern = new RegExp(`\\{\\{${varKey}\\}\\}`, 'g');
    let value: string | undefined;

    switch (varKey.toLowerCase()) {
      case 'selection':
        value = ctx.selection || '';
        break;
      case 'page_url':
      case 'url':
        value = ctx.pageUrl || (typeof window !== 'undefined' ? window.location.href : '');
        break;
      case 'page_title':
      case 'title':
        value = ctx.pageTitle || (typeof document !== 'undefined' ? document.title : '');
        break;
      case 'clipboard':
        value = ctx.clipboard || '';
        break;
      case 'agent_name':
      case 'agent':
        value = ctx.agentName || 'Echo';
        break;
      case 'date':
        value = now.toISOString().split('T')[0];
        break;
      case 'time':
        value = now.toTimeString().split(' ')[0];
        break;
      case 'datetime':
      case 'timestamp':
        value = now.toISOString();
        break;
      default:
        // Unknown variable key
        break;
    }

    if (value !== undefined && value.length > 0) {
      result = result.replace(pattern, value);
      resolvedVars.push(varKey);
    } else {
      unfilledVars.push(varKey);
    }
  }

  return { resolved: result, resolvedVars, unfilledVars };
}
