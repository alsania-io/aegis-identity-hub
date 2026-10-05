/**
 * Identity Hub Entry Point
 * Renders the Aegis Identity Hub UI as a standalone app
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { IdentityApp } from './components/identity-tabs';
import './tailwind-input.css';
// Boot the McpClient singleton in this page context. Without this import the
// identity hub never initializes contextBridge, never sends mcp:* messages to
// the background script, and connection/tool state never populates — this was
// the root cause of MCP never connecting or loading tools here.
import { mcpClient } from './core/mcp-client';

// Check if we're on a page that should show the identity hub
const isIdentityPage = () => {
  // Check URL parameters
  const params = new URLSearchParams(window.location.search);
  if (params.get('mode') === 'identity' || params.get('app') === 'aegis') {
    return true;
  }
  // Check if we're on the options page or popup
  if (window.location.href.includes('options.html') || window.location.href.includes('popup.html')) {
    return true;
  }
  return false;
};

export function renderIdentityApp() {
  const container = document.getElementById('root');
  if (!container) {
    console.warn('[IdentityApp] No #root element found, creating one');
    const newContainer = document.createElement('div');
    newContainer.id = 'root';
    document.body.appendChild(newContainer);
    return renderIdentityApp();
  }
  // Touch the singleton to force construction (module import alone doesn't
  // guarantee eager init order under some bundler configs).
  void mcpClient.isReady();
  const root = createRoot(container);
  root.render(<IdentityApp />);
  console.log('[IdentityApp] Aegis Identity Hub rendered, mcpClient ready:', mcpClient.isReady());
}

// Auto-render if we're on an identity page
if (isIdentityPage()) {
  renderIdentityApp();
}

export default renderIdentityApp;