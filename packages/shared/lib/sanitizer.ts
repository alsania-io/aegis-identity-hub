// SECURITY BOUNDARY: Trusted Output — every dynamic HTML string rendered into an
// extension surface MUST pass through DOMPurify before reaching the DOM.
// Ported into Aegis Identity Hub from the Hermes browser extension
// (`extension/lib/sanitizer.mjs`) — reused, not reinvented. DOMPurify is
// vendored at ./vendor/purify.es.mjs (3.4.13, self-contained).
//
// Why this exists in AIDH: `InstructionsTab.tsx` renders the generated system
// prompt via dangerouslySetInnerHTML with ONLY a newline-><br> replace. That
// prompt embeds tool descriptions + custom instructions (user/tool-derived
// text), so it is an XSS surface. sanitizeHtml() closes it.
//
// MV3 note: a service worker has no DOM, so DOMPurify cannot run there. This
// module FAILS CLOSED by returning the input unchanged in a non-DOM context —
// callers that need server-side sanitizing must run it in a document context.

import createDOMPurify from "./vendor/purify.es.mjs";

let purifyInstance: any = null;

// DOMPurify 3.2+ removed `target` from its default allowlist. The markdown
// renderer emits target="_blank" + rel="noopener noreferrer" on links; ADD_ATTR
// lets that survive, then the afterSanitizeAttributes hook prunes every
// non-conforming case so no other element or frame-busting value (_self/_top/
// _parent) can survive.
const SANITIZE_OPTIONS = Object.freeze({ ADD_ATTR: ["target"] });

function getPurifier(): any {
  if (purifyInstance) return purifyInstance;
  const w = (globalThis as any)?.window;
  if (w && w.document && typeof w.document.createElement === "function") {
    purifyInstance = createDOMPurify(w);
    purifyInstance.addHook("afterSanitizeAttributes", (node: any) => {
      if (!node?.hasAttribute?.("target")) return;
      const isBlankAnchor =
        node.nodeName === "A" &&
        node.getAttribute("target") === "_blank" &&
        /\bnoopener\b/i.test(node.getAttribute("rel") || "");
      if (!isBlankAnchor) node.removeAttribute("target");
    });
  }
  return purifyInstance;
}
/**
 * Sanitize an HTML string with DOMPurify defaults.
 * In a non-DOM context (service worker), returns the input unchanged (fail-closed:
 * the caller must not render it as HTML without a document context).
 */
export function sanitizeHtml(html: string = ""): string {
  const instance = getPurifier();
  const value = String(html ?? "");
  return instance ? instance.sanitize(value, SANITIZE_OPTIONS) : value;
}

/**
 * Escape-then-break: the exact pattern InstructionsTab needs. Escapes all HTML
 * metacharacters, then turns newlines into <br />. Unlike the old
 * `.replace(/\n/g, '<br />')` (which left raw HTML live), this is injection-safe
 * for arbitrary prompt text, and needs no DOM.
 */
export function escapeTextToHtmlWithBreaks(text: string = ""): string {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/\n/g, "<br />");
}

/**
 * Render markdown to sanitized HTML given the caller's OWN renderer. AIDH's
 * renderer differs from Hermes', so we accept it as a parameter rather than
 * coupling to a specific one.
 */
export function renderMarkdownSafe(
  value: string,
  renderMarkdown: (md: string) => string,
): string {
  const html = renderMarkdown(value);
  return sanitizeHtml(html);
}

/** Test seam: reset the cached purifier (used by the test suite). */
export function __resetPurifierForTests(): void {
  purifyInstance = null;
}