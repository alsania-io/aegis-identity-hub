// Sanitizer tests — ported/adapted from Hermes tests/sanitizer.test.mjs.
// Run: npx tsx --test packages/shared/lib/sanitizer.test.ts
//
// Two paths: (1) escapeTextToHtmlWithBreaks — pure, no DOM, the InstructionsTab
// fix; (2) sanitizeHtml — DOMPurify, needs a DOM (jsdom). jsdom is resolved
// from a sibling install; if absent, the DOM cases skip rather than fail.

import { test } from "node:test";
import assert from "node:assert/strict";
import { escapeTextToHtmlWithBreaks, sanitizeHtml, __resetPurifierForTests } from "./sanitizer.ts";

// ---- (1) pure escape path (the InstructionsTab fix) ------------------------

test("escapeTextToHtmlWithBreaks escapes HTML metacharacters", () => {
  const out = escapeTextToHtmlWithBreaks('<script>alert(1)</script>');
  assert.doesNotMatch(out, /<script/i);
  assert.match(out, /&lt;script&gt;/i);
});

test("escapeTextToHtmlWithBreaks neutralizes img onerror and keeps text", () => {
  const out = escapeTextToHtmlWithBreaks('<img src=x onerror=alert(1)> hello');
  // The tag is ESCAPED (no live <img>); the literal 'onerror=' may remain as
  // inert text, which is safe.
  assert.doesNotMatch(out, /<img/i);
  assert.match(out, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.match(out, /hello/);
});

test("escapeTextToHtmlWithBreaks converts newlines to <br /> and escapes quotes", () => {
  const out = escapeTextToHtmlWithBreaks('a"b\'c\nd');
  assert.match(out, /a&quot;b&#39;c<br \/>d/);
});

// ---- (2) DOMPurify path (needs a DOM) --------------------------------------

let domReady = false;
try {
  const { JSDOM } = await import("jsdom");
  const { window } = new JSDOM("<!doctype html><html><body></body></html>");
  (globalThis as any).window = window;
  __resetPurifierForTests();
  domReady = true;
} catch {
  console.warn("[sanitizer.test] jsdom unavailable — skipping DOMPurify cases");
}

test("sanitizeHtml strips scripts, handlers, and dangerous URL schemes", { skip: !domReady }, () => {
  const input = '<p onclick="steal()">hi</p><script>alert(1)</script><a href="javascript:alert(2)">x</a><a href="vbscript:alert(3)">y</a><img src="https://ok.example/i.png" onerror="alert(4)">';
  const html = sanitizeHtml(input);
  assert.doesNotMatch(html, /<script/i);
  assert.doesNotMatch(html, /onclick/i);
  assert.doesNotMatch(html, /onerror/i);
  assert.doesNotMatch(html, /javascript:/i);
  assert.doesNotMatch(html, /vbscript:/i);
  assert.match(html, /https:\/\/ok\.example\/i\.png/);
});

test("sanitizeHtml keeps target=_blank only on noopener anchors", { skip: !domReady }, () => {
  const html = sanitizeHtml('<a href="https://x.dev/" target="_blank" rel="noopener noreferrer">ok</a><a href="https://y.dev/" target="_self">bad</a><span target="_blank">nope</span>');
  assert.match(html, /target="_blank"/i);
  assert.doesNotMatch(html, /_self/i);
  assert.equal((html.match(/target=/g) || []).length, 1);
});

test("sanitizeHtml preserves custom-property styles", { skip: !domReady }, () => {
  const html = sanitizeHtml('<span style="--preview-bg:#123456;--preview-accent:#0505e8">swatch</span>');
  assert.match(html, /--preview-bg:\s*#123456/i);
  assert.match(html, /swatch/);
});