/**
 * Nyx Control - Minimal Context Handler
 * No patching of chrome.runtime - just monitors and cleans up
 * Version: 4.0.3
 */

(function() {
  'use strict';

  if (window.__nyx_context_handled) {
    return;
  }
  window.__nyx_context_handled = true;

  // Check if extension context is valid - simple and safe
  function isContextValid() {
    try {
      if (typeof chrome === 'undefined' || !chrome.runtime) return false;
      return !!chrome.runtime.id;
    } catch (e) {
      return false;
    }
  }

  // Clean up MCP components
  function cleanupMCP() {
    const popover = document.getElementById('mcp-popover-container');
    if (popover) {
      popover.style.display = 'none';
      popover.style.opacity = '0';
      popover.style.pointerEvents = 'none';
      setTimeout(() => {
        if (popover.parentNode) popover.parentNode.removeChild(popover);
      }, 300);
    }
    document.querySelectorAll('[id*="mcp-"]').forEach(el => {
      if (el.id && el.id.includes('mcp-')) {
        el.style.display = 'none';
      }
    });
  }

  // Monitor context - don't patch anything
  let invalidCount = 0;
  const checkInterval = setInterval(() => {
    if (!isContextValid()) {
      invalidCount++;
      if (invalidCount >= 3) {
        clearInterval(checkInterval);
        cleanupMCP();
        document.dispatchEvent(new CustomEvent('nyx:context-invalidated'));
      }
    } else {
      invalidCount = 0;
    }
  }, 5000);

  window.addEventListener('beforeunload', () => {
    clearInterval(checkInterval);
  });

  // Expose safe check - but don't patch anything
  window.NyxContextSafe = {
    isContextValid: isContextValid,
    cleanup: cleanupMCP
  };

  console.debug('[Nyx] Context handler ready (no patching)');
})();
