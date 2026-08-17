/**
 * Nyx Control Hub - Chat Adapter
 * Handles text insertion and form submission for various AI chat sites
 * Version: 4.0.3
 */

(function() {
  'use strict';

  // Prevent multiple injections
  if (window.NyxChatAdapterInjected) {
    console.debug('[Nyx ChatAdapter] Already injected, skipping');
    return;
  }
  window.NyxChatAdapterInjected = true;

  console.debug('[Nyx ChatAdapter] Initialized v4.0.3');

  // Site-specific selectors and handlers with improved reliability
  const siteAdapters = {
    'chat.deepseek.com': {
      inputSelector: 'textarea[spellcheck="false"], textarea[placeholder*="Message DeepSeek"], textarea[data-gramm="false"]',
      submitSelector: 'button[aria-label*="Send"], button[data-testid="send-button"], button[type="submit"]',
      
      async insertText(text) {
        const input = document.querySelector(this.inputSelector);
        if (!input) return false;
        
        input.focus();
        const existing = input.value || '';
        input.value = existing ? existing + '\n\n' + text : text;
        
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        
        return true;
      },
      
      async submit() {
        const submitBtn = document.querySelector(this.submitSelector);
        if (submitBtn && !submitBtn.disabled) {
          submitBtn.click();
          return true;
        }
        // Fallback to Enter key
        const input = document.querySelector(this.inputSelector);
        if (input) {
          input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
          return true;
        }
        return false;
      },
      
      async attachFile(file) {
        const fileInput = document.querySelector('input[type="file"]');
        if (!fileInput) return false;
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        fileInput.files = dataTransfer.files;
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
    },
    
    'chat.openai.com': {
      inputSelector: '#prompt-textarea, textarea[data-testid="chat-input"]',
      submitSelector: 'button[data-testid="send-button"], button[aria-label*="Send"]',
      
      async insertText(text) {
        const input = document.querySelector(this.inputSelector);
        if (!input) return false;
        
        input.focus();
        const existing = input.value || '';
        input.value = existing ? existing + '\n\n' + text : text;
        
        // Trigger React input event
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
        if (nativeInputValueSetter) {
          nativeInputValueSetter.call(input, input.value);
        }
        
        input.dispatchEvent(new Event('input', { bubbles: true }));
        
        return true;
      },
      
      async submit() {
        const submitBtn = document.querySelector(this.submitSelector);
        if (submitBtn && !submitBtn.disabled) {
          submitBtn.click();
          return true;
        }
        return false;
      },
      
      async attachFile(file) {
        const fileInput = document.querySelector('input[type="file"]');
        if (!fileInput) return false;
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        fileInput.files = dataTransfer.files;
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
    },
    
    'chatgpt.com': {
      inputSelector: '#prompt-textarea, textarea[data-testid="chat-input"]',
      submitSelector: 'button[data-testid="send-button"], button[aria-label*="Send"]',
      
      async insertText(text) {
        const input = document.querySelector(this.inputSelector);
        if (!input) return false;
        
        input.focus();
        const existing = input.value || '';
        input.value = existing ? existing + '\n\n' + text : text;
        
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
        if (nativeInputValueSetter) {
          nativeInputValueSetter.call(input, input.value);
        }
        
        input.dispatchEvent(new Event('input', { bubbles: true }));
        
        return true;
      },
      
      async submit() {
        const submitBtn = document.querySelector(this.submitSelector);
        if (submitBtn && !submitBtn.disabled) {
          submitBtn.click();
          return true;
        }
        return false;
      },
      
      async attachFile(file) {
        const fileInput = document.querySelector('input[type="file"]');
        if (!fileInput) return false;
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        fileInput.files = dataTransfer.files;
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
    },
    
    'claude.ai': {
      inputSelector: '[contenteditable="true"], .claude-input [contenteditable], .ProseMirror',
      submitSelector: 'button[aria-label*="Send"], button[type="submit"]',
      
      async insertText(text) {
        const selectors = [
          '.ProseMirror',
          '[contenteditable="true"].ProseMirror',
          '.claude-input [contenteditable]',
          '[contenteditable="true"]'
        ];
        
        let input = null;
        for (const selector of selectors) {
          input = document.querySelector(selector);
          if (input) break;
        }
        
        if (!input) {
          console.debug('[Nyx ChatAdapter] No Claude input found');
          return false;
        }
        
        input.focus();
        
        const existing = input.textContent || '';
        const newText = existing ? existing + '\n\n' + text : text;
        
        // For ProseMirror (Claude's editor)
        if (input.classList.contains('ProseMirror')) {
          try {
            // Use selection API for contenteditable
            const selection = window.getSelection();
            const range = document.createRange();
            range.selectNodeContents(input);
            range.collapse(false);
            selection?.removeAllRanges();
            selection?.addRange(range);
            
            // Insert text using execCommand (still works for basic text)
            document.execCommand('insertText', false, text);
          } catch (e) {
            // Fallback to direct textContent
            input.textContent = newText;
          }
          
          input.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
          input.textContent = newText;
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
        
        return true;
      },
      
      async submit() {
        const submitBtn = document.querySelector(this.submitSelector);
        if (submitBtn && !submitBtn.disabled) {
          submitBtn.click();
          return true;
        }
        return false;
      },
      
      async attachFile(file) {
        // Claude uses drag-drop primarily
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
    },
    
    'gemini.google.com': {
      inputSelector: 'rich-textarea, textarea[placeholder*="Ask Gemini"], [contenteditable]',
      submitSelector: 'button[aria-label*="Send"], button.send-button',
      
      async insertText(text) {
        const input = document.querySelector(this.inputSelector);
        if (!input) return false;
        
        const editable = input.querySelector('[contenteditable]') || input;
        editable.focus();
        
        const existing = editable.textContent || '';
        editable.textContent = existing ? existing + '\n\n' + text : text;
        
        editable.dispatchEvent(new Event('input', { bubbles: true }));
        
        return true;
      },
      
      async submit() {
        const submitBtn = document.querySelector(this.submitSelector);
        if (submitBtn && !submitBtn.disabled) {
          submitBtn.click();
          return true;
        }
        return false;
      },
      
      async attachFile(file) {
        const fileInput = document.querySelector('input[type="file"]');
        if (!fileInput) return false;
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        fileInput.files = dataTransfer.files;
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
    },
    
    'aistudio.google.com': {
      inputSelector: 'textarea.textarea[placeholder*="Start typing"], .prompt-box-container textarea.textarea',
      submitSelector: 'button[aria-label="Run"], button[type="submit"]',
      
      async insertText(text) {
        const input = document.querySelector(this.inputSelector);
        if (!input) return false;
        
        input.focus();
        const existing = input.value || '';
        input.value = existing ? existing + '\n\n' + text : text;
        
        input.dispatchEvent(new Event('input', { bubbles: true }));
        
        return true;
      },
      
      async submit() {
        const submitBtn = document.querySelector(this.submitSelector);
        if (submitBtn && !submitBtn.disabled) {
          submitBtn.click();
          return true;
        }
        return false;
      },
      
      async attachFile(file) {
        const fileInput = document.querySelector('input[type="file"]');
        if (!fileInput) return false;
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        fileInput.files = dataTransfer.files;
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
    },
    
    'default': {
      inputSelector: 'textarea[rows], textarea[placeholder*="message" i], [contenteditable="true"]',
      submitSelector: 'button[aria-label*="Send"], button[type="submit"], button svg',
      
      async insertText(text) {
        // Try textarea first
        const textarea = document.querySelector('textarea');
        if (textarea && textarea.offsetHeight > 40) {
          textarea.focus();
          const existing = textarea.value || '';
          textarea.value = existing ? existing + '\n\n' + text : text;
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
          return true;
        }
        
        // Try contenteditable
        const editable = document.querySelector('[contenteditable="true"]');
        if (editable && editable.offsetHeight > 40) {
          editable.focus();
          const existing = editable.textContent || '';
          editable.textContent = existing ? existing + '\n\n' + text : text;
          editable.dispatchEvent(new Event('input', { bubbles: true }));
          return true;
        }
        
        return false;
      },
      
      async submit() {
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
          const text = btn.textContent || '';
          const ariaLabel = btn.getAttribute('aria-label') || '';
          if (text.toLowerCase().includes('send') || 
              ariaLabel.toLowerCase().includes('send')) {
            if (!btn.disabled) {
              btn.click();
              return true;
            }
          }
        }
        return false;
      },
      
      async attachFile(file) {
        const fileInput = document.querySelector('input[type="file"]');
        if (!fileInput) return false;
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        fileInput.files = dataTransfer.files;
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
    }
  };

  function getAdapter() {
    const hostname = window.location.hostname;
    for (const [site, adapter] of Object.entries(siteAdapters)) {
      if (hostname.includes(site)) {
        return adapter;
      }
    }
    return siteAdapters.default;
  }

  // Expose API globally
  window.NyxChatAdapter = {
    getAdapter,
    insertText: async (text) => {
      const adapter = getAdapter();
      return adapter.insertText(text);
    },
    submit: async () => {
      const adapter = getAdapter();
      return adapter.submit();
    },
    attachFile: async (file) => {
      const adapter = getAdapter();
      if (adapter.attachFile) {
        return adapter.attachFile(file);
      }
      return false;
    },
    getInputContent: () => {
      const adapter = getAdapter();
      const input = document.querySelector(adapter.inputSelector);
      return input ? (input.value || input.textContent || '') : '';
    }
  };

  // Listen for window messages
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    
    const data = event.data;
    if (!data || data.type !== 'NYX_INSERT_TEXT') return;
    
    const adapter = getAdapter();
    adapter.insertText(data.text).then(success => {
      console.debug(`[Nyx ChatAdapter] Insert ${success ? '✓' : '✗'}`);
    }).catch(err => {
      console.debug('[Nyx ChatAdapter] Insert error:', err);
    });
  });

  // Listen for runtime messages
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'NYX_INSERT_TEXT') {
      const adapter = getAdapter();
      adapter.insertText(request.text).then(success => {
        sendResponse({ success });
      });
      return true;
    }
    
    if (request.type === 'NYX_SUBMIT') {
      const adapter = getAdapter();
      adapter.submit().then(success => {
        sendResponse({ success });
      });
      return true;
    }
    
    if (request.type === 'NYX_GET_INPUT_CONTENT') {
      const adapter = getAdapter();
      const input = document.querySelector(adapter.inputSelector);
      const content = input ? (input.value || input.textContent || '') : '';
      sendResponse({ content });
      return true;
    }
  });

  console.debug('[Nyx ChatAdapter] Ready');
})();
