/**
 * Nyx Control - Background Context Invalidation Fix
 * Prevents errors when extension context is invalidated
 * Version: 4.0.3
 */

// This runs in the background service worker context

// Safe wrapper for chrome APIs
const safeChrome = {
  runtime: {
    get id() {
      try {
        return chrome.runtime?.id;
      } catch (e) {
        return null;
      }
    },
    sendMessage(message, callback) {
      try {
        if (!chrome.runtime?.id) {
          console.debug('[Nyx Background] Extension context invalid');
          if (callback) callback({ error: 'Extension context invalid' });
          return;
        }
        return chrome.runtime.sendMessage(message, callback);
      } catch (e) {
        console.debug('[Nyx Background] Error sending message:', e);
        if (callback) callback({ error: e.message });
      }
    },
    onMessage: {
      addListener(listener) {
        try {
          if (!chrome.runtime?.id) {
            console.debug('[Nyx Background] Extension context invalid, cannot add listener');
            return;
          }
          return chrome.runtime.onMessage.addListener(listener);
        } catch (e) {
          console.debug('[Nyx Background] Error adding listener:', e);
        }
      },
      removeListener(listener) {
        try {
          if (!chrome.runtime?.id) return;
          return chrome.runtime.onMessage.removeListener(listener);
        } catch (e) {
          console.debug('[Nyx Background] Error removing listener:', e);
        }
      }
    },
    getURL(path) {
      try {
        if (!chrome.runtime?.id) return path;
        return chrome.runtime.getURL(path);
      } catch (e) {
        console.debug('[Nyx Background] Error getting URL:', e);
        return path;
      }
    },
    reload() {
      try {
        if (!chrome.runtime?.id) return;
        return chrome.runtime.reload();
      } catch (e) {
        console.debug('[Nyx Background] Error reloading:', e);
      }
    }
  },
  storage: {
    local: {
      get(keys, callback) {
        try {
          if (!chrome.storage?.local) {
            if (callback) callback({});
            return;
          }
          return chrome.storage.local.get(keys, callback);
        } catch (e) {
          console.debug('[Nyx Background] Storage error:', e);
          if (callback) callback({});
        }
      },
      set(items, callback) {
        try {
          if (!chrome.storage?.local) {
            if (callback) callback();
            return;
          }
          return chrome.storage.local.set(items, callback);
        } catch (e) {
          console.debug('[Nyx Background] Storage error:', e);
          if (callback) callback();
        }
      }
    }
  }
};

// Check if context is valid
function isContextValid() {
  try {
    return !!chrome.runtime?.id;
  } catch (e) {
    return false;
  }
}

// Handle context invalidation
function handleContextInvalidation() {
  console.debug('[Nyx Background] Context invalidated, cleaning up...');
  
  // Clean up any open connections
  try {
    if (chrome.runtime?.onMessage) {
      // Remove all listeners (can't easily do this, but we can flag for cleanup)
      console.debug('[Nyx Background] Marking context as invalid');
    }
  } catch (e) {
    console.debug('[Nyx Background] Cleanup error:', e);
  }
}

// Monitor context validity
let contextCheckInterval = null;
let invalidCount = 0;

function startContextMonitoring() {
  if (contextCheckInterval) {
    clearInterval(contextCheckInterval);
  }
  
  contextCheckInterval = setInterval(() => {
    if (!isContextValid()) {
      invalidCount++;
      console.debug(`[Nyx Background] Context invalid (${invalidCount})`);
      
      if (invalidCount >= 3) {
        console.debug('[Nyx Background] Context permanently invalid, stopping monitoring');
        clearInterval(contextCheckInterval);
        contextCheckInterval = null;
        handleContextInvalidation();
      }
    } else {
      if (invalidCount > 0) {
        console.debug('[Nyx Background] Context restored');
        invalidCount = 0;
      }
    }
  }, 5000);
}

// Only start if we're in a service worker context
if (typeof chrome !== 'undefined' && chrome.runtime) {
  console.debug('[Nyx Background] Context invalidation fix loaded');
  startContextMonitoring();
  
  // Handle service worker termination
  self.addEventListener('beforeunload', () => {
    if (contextCheckInterval) {
      clearInterval(contextCheckInterval);
      contextCheckInterval = null;
    }
  });
}

// Export safe APIs for use in other background scripts
self.NyxSafeBackground = {
  chrome: safeChrome,
  isContextValid,
  handleContextInvalidation
};
