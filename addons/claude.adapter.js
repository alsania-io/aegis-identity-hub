/**
 * Nyx Control Hub - Claude Adapter
 * Provides MCP button and text insertion for Claude.ai
 * Version: 4.0.3
 */

(function() {
  'use strict';
  
  // Prevent double execution
  if (window.ClaudeAdapterInjected) {
    console.debug('[Claude Adapter] Already injected, skipping');
    return;
  }
  window.ClaudeAdapterInjected = true;
  
  console.debug('[Claude Adapter] Initialized v4.0.3');

  class ClaudeAdapter {
    constructor() {
      this.name = 'ClaudeAdapter';
      this.version = '4.0.3';
      this.hostname = 'claude.ai';
      this.lastUrl = '';
      this.urlCheckInterval = null;
      this.mutationObserver = null;
      
      // Selectors for Claude's UI
      this.selectors = {
        chatInput: '.ProseMirror, [contenteditable="true"].ProseMirror, .claude-input [contenteditable]',
        submitButton: 'button[aria-label*="Send"], button[type="submit"]',
        mcpButtonContainer: '.claude-input__actions, .input-actions, .claude-input'
      };
      
      console.debug('[Claude Adapter] Instance created');
    }

    initialize() {
      console.debug('[Claude Adapter] Initializing...');
      
      // Set up URL tracking
      this.lastUrl = window.location.href;
      this.setupUrlTracking();
      
      // Set up DOM observer for dynamic content
      this.setupDOMObserver();
      
      // Inject MCP button
      this.injectMCPButton();
      
      console.debug('[Claude Adapter] Initialized successfully');
    }

    setupUrlTracking() {
      if (this.urlCheckInterval) {
        clearInterval(this.urlCheckInterval);
      }
      
      this.urlCheckInterval = setInterval(() => {
        const currentUrl = window.location.href;
        if (currentUrl !== this.lastUrl) {
          console.debug(`[Claude Adapter] URL changed to: ${currentUrl}`);
          this.lastUrl = currentUrl;
          // Re-inject on navigation
          setTimeout(() => this.injectMCPButton(), 1500);
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
            if (!document.getElementById('mcp-claude-button')) {
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
      if (document.getElementById('mcp-claude-button')) {
        return;
      }
      
      // Find the input container
      const inputContainer = document.querySelector(this.selectors.mcpButtonContainer);
      if (!inputContainer) {
        console.debug('[Claude Adapter] Input container not found, retrying later');
        return;
      }
      
      // Create MCP button
      const button = document.createElement('button');
      button.id = 'mcp-claude-button';
      button.className = 'mcp-button';
      button.setAttribute('aria-label', 'MCP Control');
      button.style.cssText = `
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 4px 12px;
        margin: 0 4px;
        border: none;
        border-radius: 6px;
        background: transparent;
        color: inherit;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        transition: background 0.2s;
      `;
      
      button.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/>
          <path d="M2 17l10 5 10-5"/>
          <path d="M2 12l10 5 10-5"/>
        </svg>
        <span style="margin-left: 4px;">MCP</span>
      `;
      
      button.addEventListener('mouseenter', () => {
        button.style.background = 'rgba(128, 128, 128, 0.15)';
      });
      
      button.addEventListener('mouseleave', () => {
        button.style.background = 'transparent';
      });
      
      button.addEventListener('click', () => {
        this.toggleMCP();
      });
      
      // Insert at beginning of container
      inputContainer.insertBefore(button, inputContainer.firstChild);
      
      console.debug('[Claude Adapter] MCP button injected');
    }

    toggleMCP() {
      console.debug('[Claude Adapter] MCP toggled');
      // Dispatch event for MCP functionality
      const event = new CustomEvent('mcp:toggle', {
        detail: { source: 'claude-adapter' }
      });
      document.dispatchEvent(event);
      
      // Toggle button state
      const button = document.getElementById('mcp-claude-button');
      if (button) {
        button.classList.toggle('active');
      }
    }

    async insertText(text) {
      console.debug(`[Claude Adapter] Inserting text: ${text.substring(0, 50)}...`);
      
      const input = document.querySelector(this.selectors.chatInput);
      if (!input) {
        console.debug('[Claude Adapter] Chat input not found');
        return false;
      }
      
      input.focus();
      
      // Get existing content
      const existing = input.textContent || '';
      const newText = existing ? existing + '\n\n' + text : text;
      
      // Try ProseMirror method first
      if (input.classList.contains('ProseMirror') && input.proseMirror) {
        try {
          // Use ProseMirror's transaction system if available
          const { state, view } = input.proseMirror;
          if (state && view) {
            const { Selection } = require('prosemirror-state');
            const { TextSelection } = Selection;
            const tr = state.tr;
            tr.insert(tr.selection.to, state.schema.text(text));
            view.dispatch(tr);
            
            input.dispatchEvent(new Event('input', { bubbles: true }));
            return true;
          }
        } catch (e) {
          // Fall through to DOM method
        }
      }
      
      // Fallback: DOM method
      try {
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(input);
        range.collapse(false);
        selection?.removeAllRanges();
        selection?.addRange(range);
        document.execCommand('insertText', false, text);
        
        input.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      } catch (e) {
        // Last resort: direct textContent
        input.textContent = newText;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      }
    }

    async submit() {
      console.debug('[Claude Adapter] Submitting...');
      
      const submitBtn = document.querySelector(this.selectors.submitButton);
      if (submitBtn && !submitBtn.disabled) {
        submitBtn.click();
        return true;
      }
      
      // Fallback: Enter key on input
      const input = document.querySelector(this.selectors.chatInput);
      if (input) {
        input.dispatchEvent(new KeyboardEvent('keydown', { 
          key: 'Enter', 
          bubbles: true,
          metaKey: true 
        }));
        return true;
      }
      
      return false;
    }

    async attachFile(file) {
      console.debug(`[Claude Adapter] Attaching file: ${file.name}`);
      
      const dropZone = document.querySelector('.ProseMirror, [contenteditable="true"]');
      if (!dropZone) return false;
      
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      
      const dropEvent = new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        dataTransfer: dataTransfer
      });
      
      dropZone.dispatchEvent(dropEvent);
      return true;
    }

    cleanup() {
      console.debug('[Claude Adapter] Cleaning up...');
      
      if (this.urlCheckInterval) {
        clearInterval(this.urlCheckInterval);
        this.urlCheckInterval = null;
      }
      
      if (this.mutationObserver) {
        this.mutationObserver.disconnect();
        this.mutationObserver = null;
      }
      
      const button = document.getElementById('mcp-claude-button');
      if (button) {
        button.remove();
      }
    }
  }

  // Create and register adapter
  let adapterInstance = null;
  
  function initializeAdapter() {
    if (!adapterInstance) {
      adapterInstance = new ClaudeAdapter();
      adapterInstance.initialize();
    }
    return adapterInstance;
  }

  // Expose API globally
  window.ClaudeAdapter = ClaudeAdapter;
  window.getClaudeAdapter = () => {
    if (!adapterInstance) {
      return initializeAdapter();
    }
    return adapterInstance;
  };
  
  window.NyxClaudeAdapter = {
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

  // Auto-initialize on Claude sites
  if (window.location.hostname.includes('claude.ai')) {
    console.debug('[Claude Adapter] Auto-initializing for claude.ai');
    setTimeout(initializeAdapter, 1500);
  }

  console.debug('[Claude Adapter] Ready');
})();
