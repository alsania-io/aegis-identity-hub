// Secret redaction helpers. Ported into Aegis Identity Hub from the Hermes
// browser extension (`extension/lib/redaction.mjs` + `content-extraction-core
// .mjs`) — reused, not reinvented. Guards a memory near-miss class: a resolved
// secret must never cross a prompt / receipt / diagnostic / persistence /
// transport boundary in plaintext (cf. EME saveConfig leak, 2026-10-11).
//
// Two layers:
//  1. SECRET_PATTERNS — well-known credential SHAPES (AWS, GitHub, JWT, Stripe,
//     Google, Slack, sk-, Bearer, PEM private keys).
//  2. Sensitive ASSIGNMENT detection (key = value / key: value) with decoded
//     URL-layer parsing, so `api%2Dkey=...` or `API_KEY%3D...` is still caught.
//
// Pure: no browser APIs.

export const SENSITIVE_ASSIGNMENT_KEYS: ReadonlySet<string> = new Set([
  "apikey", "accesstoken", "authtoken", "refreshtoken", "sessiontoken",
  "clientsecret", "awssecretaccesskey", "secretaccesskey", "token", "secret",
  "password", "passwd", "privatekey",
]);

/** Credential-shaped URL/query parameter names (normalized, lowercased, alnum). */
export const CREDENTIAL_URL_PARAMETER_NAMES: ReadonlySet<string> = new Set([
  "apikey", "xapikey", "accesstoken", "authtoken", "refreshtoken",
  "sessiontoken", "idtoken", "csrftoken", "bearertoken", "token",
  "clientsecret", "password", "passwd", "secret", "privatekey",
  "awssecretaccesskey", "secretaccesskey", "awsaccesskeyid", "xamzcredential",
  "xamzsignature", "xamzsecuritytoken", "xgoogcredential", "xgoogsignature",
  "googleaccessid", "credential", "signature", "sig",
]);

interface SecretPattern { pattern: RegExp; replacement: string; }

const SECRET_PATTERNS: SecretPattern[] = [
  { pattern: /-----BEGIN (?:[A-Z0-9 ]+ )?PRIVATE KEY-----[\s\S]*?-----END (?:[A-Z0-9 ]+ )?PRIVATE KEY-----/g, replacement: "[REDACTED_PRIVATE_KEY]" },
  { pattern: /\bBearer\s+[^\s'"`;&]+/gi, replacement: "Bearer [REDACTED_BEARER]" },
  { pattern: /\bsk-[A-Za-z0-9_-]{12,}\b/g, replacement: "[REDACTED_SECRET]" },
  { pattern: /\b[sr]k_(?:live|test)_[0-9A-Za-z]{16,}\b/g, replacement: "[REDACTED_SECRET]" },
  { pattern: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g, replacement: "[REDACTED_SECRET]" },
  { pattern: /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{40,})\b/g, replacement: "[REDACTED_SECRET]" },
  { pattern: /\bAIza[0-9A-Za-z_-]{35}\b/g, replacement: "[REDACTED_SECRET]" },
  { pattern: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g, replacement: "[REDACTED_SECRET]" },
  { pattern: /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, replacement: "[REDACTED_JWT]" },
  { pattern: /\b(?:sk|pk)_(?:live|test)_[A-Za-z0-9_-]{8,}\b/gi, replacement: "[REDACTED_SECRET]" },
  { pattern: /\bgh[pousr]_[A-Za-z0-9_]{16,}\b/gi, replacement: "[REDACTED_SECRET]" },
];
const POTENTIAL_ASSIGNMENT_RE = /\b([A-Za-z][A-Za-z0-9_%+.-]{1,79})["'`]?\s*([:=])\s*["'`]?([^\s'"`;&,]+)/gi;

/** Decode up to maxLayers of URL-encoding, tolerating malformed escapes. */
export function decodedTextLayers(value = "", maxLayers = 3): string[] {
  const layers = [String(value || "")];
  for (let i = 0; i < maxLayers; i += 1) {
    const current = layers[layers.length - 1].replace(/\+/g, " ");
    let decoded: string;
    try {
      decoded = decodeURIComponent(current);
    } catch {
      decoded = current.replace(/%([0-9a-fA-F]{2})/g, (_m, hex) => String.fromCharCode(Number.parseInt(hex, 16)));
    }
    if (decoded === layers[layers.length - 1]) break;
    layers.push(decoded);
  }
  return layers;
}

function isSensitiveAssignmentKey(value = ""): boolean {
  return decodedTextLayers(value).some((layer) => {
    const normalized = layer.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    return SENSITIVE_ASSIGNMENT_KEYS.has(normalized);
  });
}

function redactSensitiveAssignments(value = ""): { text: string; count: number } {
  let count = 0;
  const text = String(value || "").replace(POTENTIAL_ASSIGNMENT_RE, (match, key: string, separator: string) => {
    if (!isSensitiveAssignmentKey(key)) return match;
    count += 1;
    const quotedObjectKey = /^["'`]\s*:/.test(match.slice(key.length));
    const delimiter = separator === ":" && !quotedObjectKey ? ": " : "=";
    return `${key}${delimiter}[REDACTED_SECRET]`;
  });
  return { text, count };
}

/**
 * Redact secrets from free text. Returns the redacted text and how many
 * substitutions were made (for telemetry/audit counts — never the values).
 */
export function redactSensitiveTextWithCount(value = ""): { text: string; count: number } {
  const assignments = redactSensitiveAssignments(value);
  let text = assignments.text;
  let count = assignments.count;
  for (const { pattern, replacement } of SECRET_PATTERNS) {
    text = text.replace(pattern, () => { count += 1; return replacement; });
  }
  return { text, count };
}

export function redactSensitiveText(value = ""): string {
  return redactSensitiveTextWithCount(value).text;
}
function normalizedCredentialParameterName(value = ""): string {
  const layers = decodedTextLayers(value);
  return layers[layers.length - 1].trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function credentialParameterNames(value = ""): Set<string> {
  const names = new Set<string>();
  for (const layer of decodedTextLayers(value)) {
    const assignment = /(?:^|[?&#;\s])([^=?#&;\s]+)\s*=/g;
    let match: RegExpExecArray | null;
    while ((match = assignment.exec(layer)) !== null) {
      names.add(normalizedCredentialParameterName(match[1]));
    }
  }
  return names;
}

/**
 * Detect credential-bearing URL metadata BEFORE a tab URL crosses a prompt,
 * receipt, diagnostic, persistence, or transport boundary. Fails CLOSED: an
 * unparseable URL returns true (treat as credential-bearing).
 */
export function hasCredentialBearingUrl(value: string | URL = ""): boolean {
  let parsed: URL;
  try {
    parsed = value instanceof URL ? value : new URL(String(value || ""));
  } catch {
    return true;
  }
  if (parsed.username || parsed.password) return true;
  const names = new Set<string>([
    ...credentialParameterNames(parsed.search),
    ...credentialParameterNames(parsed.hash),
  ]);
  return [...names].some((name) => CREDENTIAL_URL_PARAMETER_NAMES.has(name));
}