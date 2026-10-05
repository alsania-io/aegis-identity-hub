/**
 * dotenv-stub.ts — browser no-op replacement for the `dotenv` package.
 *
 * `@alsania-io/ai-router` imports dotenv and calls dotenv.config() at module
 * load. In a content script there is no filesystem, so dotenv crashes on
 * `path.resolve` (undefined) and kills the whole bundle. This stub keeps the
 * API surface but does nothing — env vars are supplied by node-shims instead.
 */

export function config(): { parsed: Record<string, string> } {
  return { parsed: {} };
}

export function parse(_src: string): Record<string, string> {
  return {};
}

const dotenv = { config, parse };
export default dotenv;
