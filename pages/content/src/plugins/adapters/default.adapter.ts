import { BaseAdapterPlugin } from './base.adapter';
import type { AdapterCapability } from '../plugin-types';

export class DefaultAdapter extends BaseAdapterPlugin {
  readonly name = 'DefaultAdapter';
  readonly version = '1.1.0'; // Merged: generic textarea/button scanners from chat.adapter.js addon
  readonly hostnames = ['*'];
  readonly capabilities: AdapterCapability[] = ['text-insertion', 'form-submission'];

  async insertText(text: string): Promise<boolean> {
    const activeElement = document.activeElement;

    if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
      const inputElement = activeElement as HTMLInputElement | HTMLTextAreaElement;
      inputElement.value = text;
      
      // Trigger input event to ensure reactivity
      inputElement.dispatchEvent(new Event('input', { bubbles: true }));
      
      // Emit event for tracking
      this.context.eventBus.emit('tool:execution-completed', {
        execution: {
          id: this.generateCallId(),
          toolName: 'insertText',
          parameters: { text },
          result: { success: true, elementType: activeElement.tagName },
          timestamp: Date.now(),
          status: 'success'
        }
      });
      
      this.context.logger.debug('Text inserted successfully into', activeElement.tagName);
      return true;
    }

    // Try to find any contenteditable element
    const editableElement = document.querySelector('[contenteditable="true"]') as HTMLElement;
    if (editableElement) {
      editableElement.textContent = text;
      
      // Trigger input event
      editableElement.dispatchEvent(new Event('input', { bubbles: true }));
      
      this.context.eventBus.emit('tool:execution-completed', {
        execution: {
          id: this.generateCallId(),
          toolName: 'insertText',
          parameters: { text },
          result: { success: true, elementType: 'contenteditable' },
          timestamp: Date.now(),
          status: 'success'
        }
      });
      
      this.context.logger.debug('Text inserted successfully into contenteditable element');
      return true;
    }

    // Generic fallback scan (ported from the legacy chat.adapter.js addon).
    // Picks a reasonably-sized textarea, then a reasonably-sized contenteditable.
    // This is the universal path for un-adapted AI/chat sites incl. localhost.
    const textareas = Array.from(document.querySelectorAll('textarea')) as HTMLTextAreaElement[];
    for (const ta of textareas) {
      if (ta.offsetHeight > 40) {
        ta.focus();
        const existing = ta.value || '';
        ta.value = existing ? existing + '\n\n' + text : text;
        ta.dispatchEvent(new Event('input', { bubbles: true }));
        this.context.eventBus.emit('tool:execution-completed', {
          execution: {
            id: this.generateCallId(),
            toolName: 'insertText',
            parameters: { text },
            result: { success: true, elementType: 'textarea-scan' },
            timestamp: Date.now(),
            status: 'success'
          }
        });
        this.context.logger.debug('Text inserted via generic textarea scan');
        return true;
      }
    }

    const editables = Array.from(document.querySelectorAll('[contenteditable="true"]')) as HTMLElement[];
    for (const ed of editables) {
      if (ed.offsetHeight > 40) {
        ed.focus();
        const existing = ed.textContent || '';
        ed.textContent = existing ? existing + '\n\n' + text : text;
        ed.dispatchEvent(new Event('input', { bubbles: true }));
        this.context.eventBus.emit('tool:execution-completed', {
          execution: {
            id: this.generateCallId(),
            toolName: 'insertText',
            parameters: { text },
            result: { success: true, elementType: 'contenteditable-scan' },
            timestamp: Date.now(),
            status: 'success'
          }
        });
        this.context.logger.debug('Text inserted via generic contenteditable scan');
        return true;
      }
    }

    this.context.logger.warn('No suitable input element found for text insertion');
    this.context.eventBus.emit('tool:execution-failed', {
      toolName: 'insertText',
      error: 'No suitable input element found',
      callId: this.generateCallId()
    });
    
    return false;
  }

  async submitForm(): Promise<boolean> {
    const activeElement = document.activeElement;

    // Try to submit form containing the active element
    if (activeElement && (activeElement as HTMLInputElement).form) {
      try {
        const formElement = (activeElement as HTMLInputElement).form;
        if (formElement) {
          formElement.submit();
          
          this.context.eventBus.emit('tool:execution-completed', {
            execution: {
              id: this.generateCallId(),
              toolName: 'submitForm',
              parameters: {},
              result: { success: true, method: 'activeElement.form' },
              timestamp: Date.now(),
              status: 'success'
            }
          });
          
          this.context.logger.debug('Form submitted successfully via active element');
          return true;
        }
      } catch (error) {
        this.context.logger.error('Failed to submit form via active element:', error);
      }
    }

    // Try to find and click a submit button
    const submitButton = document.querySelector('button[type="submit"], input[type="submit"]') as HTMLButtonElement | HTMLInputElement;
    if (submitButton) {
      try {
        submitButton.click();
        
        this.context.eventBus.emit('tool:execution-completed', {
          execution: {
            id: this.generateCallId(),
            toolName: 'submitForm',
            parameters: {},
            result: { success: true, method: 'submitButton.click' },
            timestamp: Date.now(),
            status: 'success'
          }
        });
        
        this.context.logger.debug('Form submitted successfully via submit button');
        return true;
      } catch (error) {
        this.context.logger.error('Failed to submit form via submit button:', error);
      }
    }

    // Try to find any form and submit it
    const form = document.querySelector('form') as HTMLFormElement;
    if (form) {
      try {
        form.submit();
        
        this.context.eventBus.emit('tool:execution-completed', {
          execution: {
            id: this.generateCallId(),
            toolName: 'submitForm',
            parameters: {},
            result: { success: true, method: 'form.submit' },
            timestamp: Date.now(),
            status: 'success'
          }
        });
        
        this.context.logger.debug('Form submitted successfully via form element');
        return true;
      } catch (error) {
        this.context.logger.error('Failed to submit form via form element:', error);
      }
    }

    // Generic send-button scanner (ported from the legacy chat.adapter.js
    // addon). Broader than selector-only lookup: matches "send" in button
    // text or aria-label. This is the universal fallback for AI chat sites
    // that don't have a dedicated adapter (incl. localhost tools).
    const allButtons = Array.from(document.querySelectorAll('button, [role="button"]'));
    for (const btn of allButtons) {
      const el = btn as HTMLButtonElement;
      const text = (el.textContent || '').toLowerCase();
      const aria = (el.getAttribute('aria-label') || '').toLowerCase();
      const title = (el.getAttribute('title') || '').toLowerCase();
      const disabled = el.disabled || el.getAttribute('aria-disabled') === 'true';
      if (!disabled && (text.includes('send') || aria.includes('send') || title.includes('send'))) {
        // Single bubbling dispatch only (never .click() + MouseEvent).
        el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        this.context.eventBus.emit('tool:execution-completed', {
          execution: {
            id: this.generateCallId(),
            toolName: 'submitForm',
            parameters: {},
            result: { success: true, method: 'genericSendButtonScan' },
            timestamp: Date.now(),
            status: 'success'
          }
        });
        this.context.logger.debug('Form submitted via generic send-button scan');
        return true;
      }
    }

    this.context.logger.warn('No form found to submit');
    this.context.eventBus.emit('tool:execution-failed', {
      toolName: 'submitForm',
      error: 'No form found to submit',
      callId: this.generateCallId()
    });
    
    return false;
  }

  protected async initializePlugin(): Promise<void> {
    this.context.logger.debug('Initializing DefaultAdapter...');
    // Basic initialization for default adapter
  }

  protected async activatePlugin(): Promise<void> {
    this.context.logger.debug('Activating DefaultAdapter...');
    // Inject the MCP popover so un-adapted sites (incl. localhost) get a button.
    this.setupUIIntegration();
  }

  protected async deactivatePlugin(): Promise<void> {
    this.context.logger.debug('Deactivating DefaultAdapter...');
    this.cleanupUIIntegration();
  }

  protected async cleanupPlugin(): Promise<void> {
    this.context.logger.debug('Cleaning up DefaultAdapter...');
    // Final cleanup
  }

  // ---- Generic MCP popover injection (for un-adapted sites incl. localhost) ----

  private setupUIIntegration(): void {
    this.waitForPageReady()
      .then(() => this.injectMCPPopoverWithRetry())
      .catch((error) => this.context.logger.debug('DefaultAdapter: no insertion point yet:', error?.message));
  }

  private async waitForPageReady(): Promise<void> {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 10;
      const checkReady = () => {
        attempts++;
        if (this.findButtonInsertionPoint()) {
          resolve();
        } else if (attempts >= maxAttempts) {
          reject(new Error('No insertion point found'));
        } else {
          setTimeout(checkReady, 500);
        }
      };
      setTimeout(checkReady, 100);
    });
  }

  private injectMCPPopoverWithRetry(maxRetries: number = 5): void {
    const attempt = (n: number) => {
      if (document.getElementById('mcp-popover-container')) return;
      const point = this.findButtonInsertionPoint();
      if (point) {
        this.injectMCPPopover(point);
      } else if (n < maxRetries) {
        setTimeout(() => attempt(n + 1), 1000);
      } else {
        this.context.logger.debug('DefaultAdapter: failed to inject popover after retries');
      }
    };
    attempt(1);
  }

  /**
   * Generic insertion-point finder. Prefers a toolbar near a likely chat input;
   * falls back to appending near the input, then to a fixed bottom-right spot.
   */
  private findButtonInsertionPoint(): { container: Element; insertAfter: Element | null } | null {
    const inputSelectors = [
      'textarea',
      '[contenteditable="true"]',
      'input[type="text"]',
      'input[type="search"]',
    ];
    let input: Element | null = null;
    for (const sel of inputSelectors) {
      for (const el of Array.from(document.querySelectorAll(sel))) {
        const h = (el as HTMLElement).offsetHeight;
        if (h > 20) { input = el; break; }
      }
      if (input) break;
    }
    if (!input) return null;

    // Walk up to find a container with a few buttons (a toolbar).
    let current: Element | null = input;
    for (let i = 0; i < 8 && current && current !== document.body; i++) {
      current = current.parentElement;
      if (!current) break;
      const buttons = Array.from(current.querySelectorAll('button')).filter(
        b => (b as HTMLElement).offsetHeight > 0
      );
      if (buttons.length >= 1 && buttons.length <= 12) {
        return { container: current, insertAfter: buttons[buttons.length - 1] ?? null };
      }
    }

    // Fallback: insert right after the input element.
    if (input.parentElement) {
      return { container: input.parentElement, insertAfter: input };
    }
    return null;
  }

  private injectMCPPopover(point: { container: Element; insertAfter: Element | null }): void {
    try {
      if (document.getElementById('mcp-popover-container')) return;
      const container = document.createElement('div');
      container.id = 'mcp-popover-container';
      container.style.display = 'inline-block';
      container.style.margin = '0 4px';
      const { container: host, insertAfter } = point;
      if (insertAfter && insertAfter.parentNode === host) {
        host.insertBefore(container, insertAfter.nextSibling);
      } else {
        host.appendChild(container);
      }
      this.renderMCPPopover(container);
      this.context.logger.debug('DefaultAdapter: MCP popover injected');
    } catch (error) {
      this.context.logger.error('DefaultAdapter: popover inject failed:', error);
    }
  }

  private cleanupUIIntegration(): void {
    const el = document.getElementById('mcp-popover-container');
    if (el) el.remove();
  }

  private renderMCPPopover(container: HTMLElement): void {
    try {
      Promise.all([
        import('react'),
        import('react-dom/client'),
        import('../../components/mcpPopover/mcpPopover'),
      ]).then(([React, ReactDOM, mod]) => {
        if (!container.isConnected) return;
        const { MCPPopover } = mod as any;
        const toggleStateManager = this.createToggleStateManager();
        const adapterButtonConfig = {
          className: 'mcp-copilot-button-base',
          contentClassName: 'mcp-copilot-button-content',
          textClassName: 'mcp-copilot-button-text',
          activeClassName: 'mcp-button-active',
        };
        const root = ReactDOM.createRoot(container);
        root.render(
          React.createElement(MCPPopover, {
            toggleStateManager,
            adapterButtonConfig,
            adapterName: this.name,
          })
        );
      }).catch((error) => {
        this.context.logger.error('DefaultAdapter: failed to render popover:', error);
      });
    } catch (error) {
      this.context.logger.error('DefaultAdapter: renderMCPPopover error:', error);
    }
  }

  private createToggleStateManager() {
    const context = this.context;
    const stateManager = {
      getState: () => {
        try {
          const ui = context.stores.ui;
          const mcpEnabled = ui?.mcpEnabled ?? false;
          const autoSubmit = ui?.preferences?.autoSubmit ?? false;
          return { mcpEnabled, autoInsert: autoSubmit, autoSubmit, autoExecute: false };
        } catch {
          return { mcpEnabled: false, autoInsert: false, autoSubmit: false, autoExecute: false };
        }
      },
      setMCPEnabled: (enabled: boolean) => {
        try {
          if (context.stores.ui?.setMCPEnabled) {
            context.stores.ui.setMCPEnabled(enabled, 'mcp-popover-toggle');
          } else if (context.stores.ui?.setSidebarVisibility) {
            context.stores.ui.setSidebarVisibility(enabled, 'mcp-popover-toggle-fallback');
          }
          const sidebarManager = (window as any).activeSidebarManager;
          if (sidebarManager) { enabled ? sidebarManager.show() : sidebarManager.hide(); }
        } catch (error) {
          context.logger.error('DefaultAdapter: setMCPEnabled error:', error);
        }
        stateManager.updateUI();
      },
      setAutoInsert: (enabled: boolean) => {
        if (context.stores.ui?.updatePreferences) context.stores.ui.updatePreferences({ autoSubmit: enabled });
        stateManager.updateUI();
      },
      setAutoSubmit: (enabled: boolean) => {
        if (context.stores.ui?.updatePreferences) context.stores.ui.updatePreferences({ autoSubmit: enabled });
        stateManager.updateUI();
      },
      setAutoExecute: (_enabled: boolean) => { stateManager.updateUI(); },
      updateUI: () => {
        const el = document.getElementById('mcp-popover-container');
        if (el) {
          el.dispatchEvent(new CustomEvent('mcp:update-toggle-state', {
            detail: { toggleState: stateManager.getState() },
          }));
        }
      },
    };
    return stateManager;
  }

  private generateCallId(): string {
    return `default-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
