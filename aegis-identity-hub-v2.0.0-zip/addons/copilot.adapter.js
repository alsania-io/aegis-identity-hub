/**
 * Nyx Control Hub - Copilot Adapter
 * Provides MCP button and text insertion for Copilot
 * Version: 4.0.3
 */

(function() {
  'use strict';
  
  // Prevent double execution
  if (window.CopilotAdapterInjected) {
    console.debug('[Copilot Adapter] Already injected, skipping');
    return;
  }
  window.CopilotAdapterInjected = true;
  
  console.debug('[Copilot Adapter] Initialized v4.0.3');

  class CopilotAdapter {
    constructor() {
      this.name = 'CopilotAdapter';
      this.version = '4.0.3';
      this.hostname = 'copilot.microsoft.com';
      this.lastUrl = '';
      this.urlCheckInterval = null;
      this.mutationObserver = null;
      
      // Selectors for Copilot's UI
      this.selectors = {
        chatInput: 'textarea[placeholder*="Message"], textarea[placeholder*="Ask"], [contenteditable="true"]',
        submitButton: 'button[aria-label*="Send"], button[type="submit"]',
        mcpButtonContainer: '.input-actions, .chat-input-actions, .input-area'
      };
      
      console.debug('[Copilot Adapter] Instance created');
    }

    initialize() {
      console.debug('[Copilot Adapter] Initializing...');
      
      // Set up URL tracking
      this.lastUrl = window.location.href;
      this.setupUrlTracking();
      
      // Set up DOM observer for dynamic content
      this.setupDOMObserver();
      
      // Inject MCP button
      this.injectMCPButton();
      
      // Initialize sidebar manager if available
      this.initializeSidebarManager();
      
      console.debug('[Copilot Adapter] Initialized successfully');
    }

    setupUrlTracking() {
      if (this.urlCheckInterval) {
        clearInterval(this.urlCheckInterval);
      }
      
      this.urlCheckInterval = setInterval(() => {
        const currentUrl = window.location.href;
        if (currentUrl !== this.lastUrl) {
          console.debug(`[Copilot Adapter] URL changed to: ${currentUrl}`);
          this.lastUrl = currentUrl;
          // Re-inject on navigation
          setTimeout(() => {
            this.injectMCPButton();
            this.initializeSidebarManager();
          }, 1500);
        }
      }, 2000);
    }

    setupDOMObserver() {
      if (this.mutationObserver) {
        this.mutationObserver.disconnect();
      }
      
      this.mutationObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.type === 'childList') {
            // Check if MCP button still exists
            if (!document.getElementById('mcp-copilot-button')) {
              this.injectMCPButton();
            }
          }
        }
      });
      
      this.mutationObserver.observe(document.body, {
        childList: true,
        subtree: true
      });
    }

    injectMCPButton() {
      // Check if already exists
      if (document.getElementById('mcp-copilot-button')) {
        return;
      }
      
      // Try to find input container
      let inputContainer = document.querySelector(this.selectors.mcpButtonContainer);
      if (!inputContainer) {
        // Look for parent of textarea
        const textarea = document.querySelector('textarea[placeholder*="Message"]');
        if (textarea && textarea.parentElement) {
          inputContainer = textarea.parentElement;
        }
      }
      
      if (!inputContainer) {
        console.debug('[Copilot Adapter] Input container not found, retrying later');
        return;
      }
      
      // Create MCP button
      const button = document.createElement('button');
      button.id = 'mcp-copilot-button';
      button.className = 'mcp-button';
      button.setAttribute('aria-label', 'MCP Control');
      button.style.cssText = `
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 6px 12px;
        margin: 0 4px;
        border: 1px solid #e0e0e0;
        border-radius: 6px;
        background: transparent;
        color: inherit;
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
        transition: all 0.2s;
        gap: 4px;
      `;
      
      button.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/>
          <path d="M2 17l10 5 10-5"/>
          <path d="M2 12l10 5 10-5"/>
        </svg>
        <span>MCP</span>
      `;
      
      button.addEventListener('mouseenter', () => {
        button.style.background = '#f0f0f0';
        button.style.borderColor = '#b0b0b0';
      });
      
      button.addEventListener('mouseleave', () => {
        button.style.background = 'transparent';
        button.style.borderColor = '#e0e0e0';
      });
      
      button.addEventListener('click', () => {
        this.toggleMCP();
      });
      
      // Insert at beginning of container
      inputContainer.insertBefore(button, inputContainer.firstChild);
      
      console.debug('[Copilot Adapter] MCP button injected');
    }

    toggleMCP() {
      console.debug('[Copilot Adapter] MCP toggled');
      // Dispatch event for MCP functionality
      const event = new CustomEvent('mcp:toggle', {
        detail: { source: 'copilot-adapter' }
      });
      document.dispatchEvent(event);
      
      // Toggle button state
      const button = document.getElementById('mcp-copilot-button');
      if (button) {
        button.classList.toggle('active');
        button.style.background = button.classList.contains('active') ? '#e3f2fd' : 'transparent';
        button.style.borderColor = button.classList.contains('active') ? '#1976d2' : '#e0e0e0';
      }
    }

    initializeSidebarManager() {
      // Check if global sidebar manager exists
      if (window.SidebarManager) {
        try {
          const manager = window.SidebarManager.getInstance('copilot');
          if (manager && manager.initialize) {
            manager.initialize();
            console.debug('[Copilot Adapter] Sidebar manager initialized');
          }
        } catch (e) {
          console.debug('[Copilot Adapter] Error initializing sidebar manager:', e);
        }
      }
      
      // Initialize components if available
      if (window.initCopilotComponents) {
        try {
          window.initCopilotComponents();
          console.debug('[Copilot Adapter] Copilot components initialized');
        } catch (e) {
          console.debug('[Copilot Adapter] Error initializing components:', e);
        }
      }
    }

    async insertText(text) {
      console.debug(`[Copilot Adapter] Inserting text: ${text.substring(0, 50)}...`);
      
      // Try using global function first
      if (window.insertToolResultToChatInput) {
        try {
          window.insertToolResultToChatInput(text);
          console.debug('[Copilot Adapter] Text inserted via global function');
          return true;
        } catch (e) {
          console.debug('[Copilot Adapter] Global function failed:', e);
        }
      }
      
      // Fallback: find input element
      const input = document.querySelector(this.selectors.chatInput);
      if (!input) {
        console.debug('[Copilot Adapter] Chat input not found');
        return false;
      }
      
      input.focus();
      
      if (input.tagName === 'TEXTAREA') {
        const existing = input.value || '';
        input.value = existing ? existing + '\n\n' + text : text;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        
        // Trigger React event if needed
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
        if (nativeSetter) {
          nativeSetter.call(input, input.value);
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
      } else {
        const existing = input.textContent || '';
        input.textContent = existing ? existing + '\n\n' + text : text;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
      
      console.debug('[Copilot Adapter] Text inserted via fallback');
      return true;
    }

    async submit() {
      console.debug('[Copilot Adapter] Submitting...');
      
      // Try using global function first
      if (window.submitChatInput) {
        try {
          const result = await window.submitChatInput();
          console.debug(`[Copilot Adapter] Submit result: ${result}`);
          return result;
        } catch (e) {
          console.debug('[Copilot Adapter] Global submit failed:', e);
        }
      }
      
      // Fallback: find submit button
      const submitBtn = document.querySelector(this.selectors.submitButton);
      if (submitBtn && !submitBtn.disabled) {
        submitBtn.click();
        return true;
      }
      
      // Last resort: Enter key
      const input = document.querySelector(this.selectors.chatInput);
      if (input) {
        input.dispatchEvent(new KeyboardEvent('keydown', { 
          key: 'Enter', 
          bubbles: true 
        }));
        return true;
      }
      
      return false;
    }

    async attachFile(file) {
      console.debug(`[Copilot Adapter] Attaching file: ${file.name}`);
      
      // Try global function first
      if (window.attachFileToChatInput) {
        try {
          const result = await window.attachFileToChatInput(file);
          console.debug(`[Copilot Adapter] File attach result: ${result}`);
          return result;
        } catch (e) {
          console.debug('[Copilot Adapter] Global attach failed:', e);
        }
      }
      
      // Fallback: file input
      const fileInput = document.querySelector('input[type="file"]');
      if (!fileInput) return false;
      
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      fileInput.files = dataTransfer.files;
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      
      return true;
    }

    cleanup() {
      console.debug('[Copilot Adapter] Cleaning up...');
      
      if (this.urlCheckInterval) {
        clearInterval(this.urlCheckInterval);
        this.urlCheckInterval = null;
      }
      
      if (this.mutationObserver) {
        this.mutationObserver.disconnect();
        this.mutationObserver = null;
      }
      
      const button = document.getElementById('mcp-copilot-button');
      if (button) {
        button.remove();
      }
    }
  }

  // Create and register adapter
  let adapterInstance = null;
  
  function initializeAdapter() {
    if (!adapterInstance) {
      adapterInstance = new CopilotAdapter();
      adapterInstance.initialize();
    }
    return adapterInstance;
  }

  // Expose API globally
  window.CopilotAdapter = CopilotAdapter;
  window.getCopilotAdapter = () => {
    if (!adapterInstance) {
      return initializeAdapter();
    }
    return adapterInstance;
  };
  
  window.NyxCopilotAdapter = {
    insertText: async (text) => {
      const adapter = adapterInstance || initializeAdapter();
      return adapter.insertText(text);
    },
    submit: async () => {
      const adapter = adapterInstance || initializeAdapter();
      return adapter.submit();
    },
    attachFile: async (file) => {
      const adapter = adapterInstance || initializeAdapter();
      return adapter.attachFile(file);
    },
    cleanup: () => {
      if (adapterInstance) {
        adapterInstance.cleanup();
        adapterInstance = null;
      }
    }
  };

  // Auto-initialize on Copilot sites
  if (window.location.hostname.includes('copilot.microsoft.com')) {
    console.debug('[Copilot Adapter] Auto-initializing for copilot.microsoft.com');
    setTimeout(initializeAdapter, 1500);
  }

  console.debug('[Copilot Adapter] Ready');
})();
