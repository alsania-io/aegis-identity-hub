/**
 * Copilot Adapter
 * This file implements the site adapter for copilot.microsoft.com
 * FIXED: Now uses the new plugin architecture with MCP popover support
 */
import { BaseAdapterPlugin } from './base.adapter';
import type { AdapterCapability, PluginContext } from '../plugin-types';
import { createLogger } from '@extension/shared/lib/logger';

const logger = createLogger('CopilotAdapter');

export class CopilotAdapter extends BaseAdapterPlugin {
  readonly name = 'CopilotAdapter';
  readonly version = '3.1.0'; // Merged: robust send-button finder + working auto-submit (replaces copilot.adapter addon)
  readonly hostnames = ['copilot.microsoft.com', 'bing.com'];
  readonly capabilities: AdapterCapability[] = [
    'text-insertion',
    'form-submission',
    'file-attachment',
    'dom-manipulation'
  ];

  private lastUrl: string = '';
  private urlCheckInterval: NodeJS.Timeout | null = null;
  private mcpPopoverContainer: HTMLElement | null = null;
  private mutationObserver: MutationObserver | null = null;
  private storeEventListenersSetup: boolean = false;
  private domObserversSetup: boolean = false;
  private uiIntegrationSetup: boolean = false;
  private adapterStylesInjected: boolean = false;
  private static instanceCount = 0;
  private instanceId: number;

  private readonly copilotButtonStyles = `
.mcp-copilot-button-base {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 16px;
  height: 40px;
  border-radius: 20px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  background: transparent;
  color: #1b1b1b;
  font-family: 'Segoe UI', sans-serif;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
  outline: none;
}
.mcp-copilot-button-base:hover {
  background-color: rgba(0, 0, 0, 0.05);
  border-color: rgba(0, 0, 0, 0.2);
}
.mcp-copilot-button-base.mcp-button-active {
  background-color: rgba(0, 120, 212, 0.1);
  border-color: #0078d4;
  color: #0078d4;
}
.mcp-copilot-button-content {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.mcp-copilot-button-text {
  font-size: 14px;
  font-weight: 600;
}
@media (prefers-color-scheme: dark) {
  .mcp-copilot-button-base {
    border-color: rgba(255, 255, 255, 0.2);
    color: #ffffff;
  }
  .mcp-copilot-button-base:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
  .mcp-copilot-button-base.mcp-button-active {
    background-color: rgba(0, 120, 212, 0.2);
    border-color: #4cc2ff;
    color: #4cc2ff;
  }
}
`;

  constructor() {
    super();
    CopilotAdapter.instanceCount++;
    this.instanceId = CopilotAdapter.instanceCount;
    logger.debug(`Instance #${this.instanceId} created`);
  }

  async initialize(context: PluginContext): Promise<void> {
    if (this.currentStatus === 'initializing' || this.currentStatus === 'active') {
      this.context?.logger.warn(`Copilot adapter #${this.instanceId} already initialized, skipping`);
      return;
    }
    await super.initialize(context);
    this.context.logger.debug(`Initializing Copilot adapter #${this.instanceId}`);
    this.lastUrl = window.location.href;
    this.setupUrlTracking();
    this.setupStoreEventListeners();
  }

  async activate(): Promise<void> {
    if (this.currentStatus === 'active') {
      this.context?.logger.warn(`Copilot adapter #${this.instanceId} already active, skipping`);
      return;
    }
    await super.activate();
    this.context.logger.debug(`Activating Copilot adapter #${this.instanceId}`);
    this.injectCopilotButtonStyles();
    this.setupDOMObservers();
    this.setupUIIntegration();
    this.context.eventBus.emit('adapter:activated', { pluginName: this.name, timestamp: Date.now() });
  }

  async deactivate(): Promise<void> {
    if (this.currentStatus === 'inactive' || this.currentStatus === 'disabled') {
      return;
    }
    await super.deactivate();
    this.cleanupUIIntegration();
    this.cleanupDOMObservers();
    this.storeEventListenersSetup = false;
    this.domObserversSetup = false;
    this.uiIntegrationSetup = false;
    this.context.eventBus.emit('adapter:deactivated', { pluginName: this.name, timestamp: Date.now() });
  }

  async cleanup(): Promise<void> {
    await super.cleanup();
    if (this.urlCheckInterval) {
      clearInterval(this.urlCheckInterval);
      this.urlCheckInterval = null;
    }
    const styleElement = document.getElementById('mcp-copilot-button-styles');
    if (styleElement) {
      styleElement.remove();
      this.adapterStylesInjected = false;
    }
    this.cleanupUIIntegration();
    this.cleanupDOMObservers();
    this.storeEventListenersSetup = false;
    this.domObserversSetup = false;
    this.uiIntegrationSetup = false;
  }

  async insertText(text: string, options?: { targetElement?: HTMLElement }): Promise<boolean> {
    this.context.logger.debug(`Inserting text into Copilot: ${text.substring(0, 50)}...`);
    
    try {
      // Find chat input using options or common Copilot selectors (including contenteditable and modern UI)
      const chatInput =
        options?.targetElement ||
        (document.querySelector(
          'textarea#userInput, textarea[placeholder*="Ask"], textarea[placeholder*="Message"], textarea[cib-control], div[contenteditable="true"][role="textbox"], [contenteditable="true"], textarea'
        ) as HTMLElement | null);
      
      if (!chatInput) {
        this.emitExecutionFailed('insertText', 'Chat input not found');
        return false;
      }

      chatInput.focus();

      if (chatInput.tagName === 'TEXTAREA' || 'value' in chatInput) {
        const textarea = chatInput as HTMLTextAreaElement;
        const currentText = textarea.value;
        const newContent = currentText ? currentText + '\n\n' + text : text;
        textarea.value = newContent;
        textarea.selectionStart = textarea.selectionEnd = textarea.value.length;
        textarea.dispatchEvent(new InputEvent('input', { bubbles: true }));
        textarea.dispatchEvent(new Event('change', { bubbles: true }));
      } else if (chatInput.getAttribute('contenteditable') === 'true') {
        const currentText = chatInput.textContent || '';
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(chatInput);
        range.collapse(false);
        selection?.removeAllRanges();
        selection?.addRange(range);
        if (currentText && currentText.trim() !== '') {
          document.execCommand('insertText', false, '\n\n');
        }
        document.execCommand('insertText', false, text);
        chatInput.dispatchEvent(new InputEvent('input', { bubbles: true }));
        chatInput.dispatchEvent(new Event('change', { bubbles: true }));
      }

      this.emitExecutionCompleted('insertText', { text }, { success: true });
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.emitExecutionFailed('insertText', errorMessage);
      return false;
    }
  }

  async submitForm(options?: { formElement?: HTMLFormElement }): Promise<boolean> {
    this.context.logger.debug('Submitting Copilot chat input');
    
    try {
      // Robust finder first (selector-only hits are unreliable on Copilot's
      // web-component UI), then a direct selector as fallback.
      const submitButton =
        this.findSendButtonNearInput() ??
        (document.querySelector('button[aria-label="Submit"], button[aria-label="Send"], cib-submit') as HTMLButtonElement | null);

      if (submitButton && !(submitButton as HTMLButtonElement).disabled && submitButton.getAttribute('aria-disabled') !== 'true') {
        // SINGLE dispatch only. Firing both .click() and a manual MouseEvent
        // causes double submit -> duplicated tool results.
        submitButton.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        this.emitExecutionCompleted('submitForm', {}, { success: true, method: 'dispatchEvent.click' });
        return true;
      }

      // Fallback to Enter key
      const chatInput = document.querySelector('textarea[placeholder*="Ask"], textarea[cib-control]') as HTMLTextAreaElement;
      if (chatInput) {
        chatInput.focus();
        chatInput.dispatchEvent(new KeyboardEvent('keydown', {
          key: 'Enter',
          code: 'Enter',
          keyCode: 13,
          which: 13,
          bubbles: true,
          cancelable: true
        }));
        this.emitExecutionCompleted('submitForm', {}, { success: true, method: 'enterKey' });
        return true;
      }

      this.emitExecutionFailed('submitForm', 'No submit method found');
      return false;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.emitExecutionFailed('submitForm', errorMessage);
      return false;
    }
  }

  /**
   * Robustly locate Copilot's send/submit button by walking up the DOM from the
   * chat input. Selector-only lookup is unreliable because Copilot uses
   * web components (cib-*) whose shadow/aria attributes mutate at runtime.
   * Mirrors the proven DeepSeek finder.
   */
  private findSendButtonNearInput(): HTMLElement | null {
    const inputSelectors = [
      'textarea[cib-control]',
      'textarea[placeholder*="Ask"]',
      'textarea[placeholder*="Message"]',
      '[contenteditable="true"]'
    ];
    let input: HTMLElement | null = null;
    for (const sel of inputSelectors) {
      input = document.querySelector(sel) as HTMLElement | null;
      if (input && this.isElementVisible(input)) break;
      input = null;
    }
    if (!input) return null;

    let current: HTMLElement | null = input;
    for (let i = 0; i < 12 && current && current !== document.body; i++) {
      current = current.parentElement;
      if (!current) break;

      const candidates = Array.from(
        current.querySelectorAll('button, cib-button, div[role="button"]')
      ).filter(el => this.isElementVisible(el)) as HTMLElement[];

      if (candidates.length >= 1 && candidates.length <= 12) {
        // Priority 1: aria-label / title contains send or submit, exclude MCP
        for (const btn of candidates) {
          const aria = (btn.getAttribute('aria-label') || '').toLowerCase();
          const title = (btn.getAttribute('title') || '').toLowerCase();
          if ((aria.includes('send') || aria.includes('submit') || title.includes('send') || title.includes('submit')) &&
              !aria.includes('mcp') && !title.includes('mcp')) {
            return btn;
          }
        }
        // Priority 2: rightmost enabled non-MCP button
        const withPos = candidates
          .map(btn => ({ btn, right: btn.getBoundingClientRect().right }))
          .sort((a, b) => b.right - a.right);
        for (const { btn } of withPos) {
          const aria = (btn.getAttribute('aria-label') || '').toLowerCase();
          const title = (btn.getAttribute('title') || '').toLowerCase();
          const cls = (btn.className || '').toString().toLowerCase();
          if (aria.includes('mcp') || title.includes('mcp') || cls.includes('mcp')) continue;
          const disabled = (btn as HTMLButtonElement).disabled || btn.getAttribute('aria-disabled') === 'true';
          if (!disabled) return btn;
        }
      }
    }
    return null;
  }

  /**
   * Visibility check for candidate elements.
   */
  private isElementVisible(element: Element | null): boolean {
    if (!element) return false;
    const rect = element.getBoundingClientRect();
    return (element as HTMLElement).offsetParent !== null && rect.width > 0 && rect.height > 0;
  }

  async attachFile(file: File, options?: { inputElement?: HTMLInputElement }): Promise<boolean> {
    this.context.logger.debug(`Attaching file: ${file.name}`);
    
    if (!file || file.size === 0) {
      this.emitExecutionFailed('attachFile', 'Invalid file');
      return false;
    }

    try {
      // Try to find file input
      let fileInput = options?.inputElement || document.querySelector('input[type="file"]') as HTMLInputElement;
      
      if (!fileInput) {
        // Try to trigger file upload by clicking the attach button
        const attachButton = document.querySelector('button[aria-label*="Attach"], button[aria-label*="Upload"], cib-attachment') as HTMLButtonElement;
        if (attachButton) {
          attachButton.click();
          await new Promise(resolve => setTimeout(resolve, 500));
          fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        }
      }

      if (fileInput) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        fileInput.files = dataTransfer.files;
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
        this.emitExecutionCompleted('attachFile', { fileName: file.name }, { success: true });
        return true;
      }

      this.emitExecutionFailed('attachFile', 'No file input found');
      return false;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.emitExecutionFailed('attachFile', errorMessage);
      return false;
    }
  }

  isSupported(): boolean {
    const currentHost = window.location.hostname;
    return currentHost.includes('copilot.microsoft.com');
  }

  supportsFileUpload(): boolean {
    return !!document.querySelector('input[type="file"], button[aria-label*="Attach"], cib-attachment');
  }

  private injectCopilotButtonStyles(): void {
    if (this.adapterStylesInjected) return;
    try {
      const styleId = 'mcp-copilot-button-styles';
      const existingStyles = document.getElementById(styleId);
      if (existingStyles) existingStyles.remove();
      const styleElement = document.createElement('style');
      styleElement.id = styleId;
      styleElement.textContent = this.copilotButtonStyles;
      document.head.appendChild(styleElement);
      this.adapterStylesInjected = true;
      this.context.logger.debug('Copilot button styles injected');
    } catch (error) {
      this.context.logger.error('Failed to inject Copilot button styles:', error);
    }
  }

  private setupUrlTracking(): void {
    if (!this.urlCheckInterval) {
      this.urlCheckInterval = setInterval(() => {
        const currentUrl = window.location.href;
        if (currentUrl !== this.lastUrl) {
          this.context.logger.debug(`URL changed to ${currentUrl}`);
          if (this.onPageChanged) this.onPageChanged(currentUrl, this.lastUrl);
          this.lastUrl = currentUrl;
        }
      }, 1000);
    }
  }

  private setupStoreEventListeners(): void {
    if (this.storeEventListenersSetup) return;
    this.context.logger.debug(`Setting up store event listeners for Copilot #${this.instanceId}`);

    this.context.eventBus.on('tool:execution-completed', (data) => {
      this.context.logger.debug('Tool execution completed:', data);
      void this.handleToolExecutionCompleted(data).catch((error) => {
        this.context.logger.error('Error handling tool execution completion:', error);
      });
    });

    this.context.eventBus.on('ui:sidebar-toggle', (data) => {
      this.context.logger.debug('Sidebar toggled:', data);
    });

    this.storeEventListenersSetup = true;
  }

  private setupDOMObservers(): void {
    if (this.domObserversSetup) return;
    this.context.logger.debug(`Setting up DOM observers for Copilot #${this.instanceId}`);

    this.mutationObserver = new MutationObserver((mutations) => {
      let shouldReinject = false;
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && !document.getElementById('mcp-popover-container')) {
          shouldReinject = true;
        }
      });
      if (shouldReinject) {
        const insertionPoint = this.findButtonInsertionPoint();
        if (insertionPoint) {
          this.context.logger.debug('MCP popover removed, re-injecting');
          this.setupUIIntegration();
        }
      }
    });

    this.mutationObserver.observe(document.body, { childList: true, subtree: true });
    this.domObserversSetup = true;
  }

  private setupUIIntegration(): void {
    if (this.uiIntegrationSetup) {
      this.context.logger.debug(`UI integration already set up for Copilot #${this.instanceId}`);
    } else {
      this.context.logger.debug(`Setting up UI integration for Copilot #${this.instanceId}`);
      this.uiIntegrationSetup = true;
    }

    this.waitForPageReady()
      .then(() => this.injectMCPPopoverWithRetry())
      .catch((error) => this.context.logger.warn('Failed to wait for page ready:', error));
  }

  private async waitForPageReady(): Promise<void> {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 5;
      const checkReady = () => {
        attempts++;
        const insertionPoint = this.findButtonInsertionPoint();
        if (insertionPoint) {
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
    const attemptInjection = (attempt: number) => {
      if (document.getElementById('mcp-popover-container')) {
        return;
      }
      const insertionPoint = this.findButtonInsertionPoint();
      if (insertionPoint) {
        this.injectMCPPopover(insertionPoint);
      } else if (attempt < maxRetries) {
        setTimeout(() => attemptInjection(attempt + 1), 1000);
      } else {
        this.context.logger.warn('Failed to inject MCP popover');
      }
    };
    attemptInjection(1);
  }

  private cleanupDOMObservers(): void {
    this.context.logger.debug('Cleaning up DOM observers for Copilot');
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }
  }

  private cleanupUIIntegration(): void {
    this.context.logger.debug('Cleaning up UI integration for Copilot');
    const popoverContainer = document.getElementById('mcp-popover-container');
    if (popoverContainer) {
      popoverContainer.remove();
    }
    this.mcpPopoverContainer = null;
  }

  private async handleToolExecutionCompleted(data: any): Promise<void> {
    this.context.logger.debug('Handling tool execution completion in Copilot:', data);
    if (!this.shouldHandleEvents()) {
      this.context.logger.debug('Copilot adapter should not handle events, ignoring');
      return;
    }
    // Guard against a submit -> event -> submit loop.
    if (data?.execution?.toolName === 'submitForm') {
      this.context.logger.debug('Ignoring our own submitForm completion event');
      return;
    }
    const uiState = this.context.stores.ui;
    if (!uiState || !data.execution) return;

    const autoSubmitEnabled = uiState.preferences?.autoSubmit ?? false;
    if (autoSubmitEnabled) {
      this.context.logger.debug('Auto-submit enabled, triggering form submission');
      await new Promise(resolve => setTimeout(resolve, 300));
      await this.submitForm();
    } else {
      this.context.logger.debug('Auto-submit disabled, tool execution completed without submit');
    }
  }

  private findButtonInsertionPoint(): { container: Element; insertAfter: Element | null } | null {
    this.context.logger.debug('Finding button insertion point for Copilot');
    
    // Try to find the compose box container
    const composeBox = document.querySelector('cib-compose, .compose-box, [role="composeregion"]');
    if (composeBox) {
      const actionsContainer = composeBox.querySelector('.compose-actions, cib-action-bar, [class*="action-bar"]');
      if (actionsContainer) {
        const buttons = actionsContainer.querySelectorAll('button, cib-button');
        if (buttons.length > 0) {
          return { container: actionsContainer, insertAfter: buttons[buttons.length - 1] };
        }
        return { container: actionsContainer, insertAfter: null };
      }
      return { container: composeBox, insertAfter: null };
    }

    // Fallback: Look for any button container near textarea
    const textarea = document.querySelector('textarea[cib-control], textarea[placeholder*="Ask"]');
    if (textarea && textarea.parentElement) {
      return { container: textarea.parentElement, insertAfter: null };
    }

    return null;
  }

  private injectMCPPopover(insertionPoint: { container: Element; insertAfter: Element | null }): void {
    this.context.logger.debug('Injecting MCP popover into Copilot');
    try {
      if (document.getElementById('mcp-popover-container')) {
        return;
      }

      const reactContainer = document.createElement('div');
      reactContainer.id = 'mcp-popover-container';
      reactContainer.style.display = 'inline-block';
      reactContainer.style.margin = '0 4px';

      const { container, insertAfter } = insertionPoint;
      if (insertAfter && insertAfter.parentNode === container) {
        container.insertBefore(reactContainer, insertAfter.nextSibling);
      } else {
        container.appendChild(reactContainer);
      }

      this.mcpPopoverContainer = reactContainer;
      this.renderMCPPopover(reactContainer);
      this.context.logger.debug('MCP popover injected successfully');
    } catch (error) {
      this.context.logger.error('Failed to inject MCP popover:', error);
    }
  }

  private renderMCPPopover(container: HTMLElement): void {
    this.context.logger.debug('Rendering MCP popover for Copilot');
    try {
      import('react').then(React => {
        import('react-dom/client').then(ReactDOM => {
          import('../../components/mcpPopover/mcpPopover').then(({ MCPPopover }) => {
            const toggleStateManager = this.createToggleStateManager();
            const adapterButtonConfig = {
              className: 'mcp-copilot-button-base',
              contentClassName: 'mcp-copilot-button-content',
              textClassName: 'mcp-copilot-button-text',
              activeClassName: 'mcp-button-active'
            };

            const root = ReactDOM.createRoot(container);
            root.render(
              React.createElement(MCPPopover, {
                toggleStateManager,
                adapterButtonConfig,
                adapterName: this.name
              })
            );
            this.context.logger.debug('MCP popover rendered successfully');
          }).catch(error => {
            this.context.logger.error('Failed to import MCPPopover:', error);
          });
        }).catch(error => {
          this.context.logger.error('Failed to import ReactDOM:', error);
        });
      }).catch(error => {
        this.context.logger.error('Failed to import React:', error);
      });
    } catch (error) {
      this.context.logger.error('Failed to render MCP popover:', error);
    }
  }

  private createToggleStateManager() {
    const context = this.context;
    const stateManager = {
      getState: () => {
        try {
          const uiState = context.stores.ui;
          const mcpEnabled = uiState?.mcpEnabled ?? false;
          const autoSubmitEnabled = uiState?.preferences?.autoSubmit ?? false;
          return { mcpEnabled, autoInsert: autoSubmitEnabled, autoSubmit: autoSubmitEnabled, autoExecute: false };
        } catch (error) {
          context.logger.error('Error getting toggle state:', error);
          return { mcpEnabled: false, autoInsert: false, autoSubmit: false, autoExecute: false };
        }
      },

      setMCPEnabled: (enabled: boolean) => {
        context.logger.debug(`Setting MCP ${enabled ? 'enabled' : 'disabled'}`);
        try {
          if (context.stores.ui?.setMCPEnabled) {
            context.stores.ui.setMCPEnabled(enabled, 'mcp-popover-toggle');
          } else if (context.stores.ui?.setSidebarVisibility) {
            context.stores.ui.setSidebarVisibility(enabled, 'mcp-popover-toggle-fallback');
          }
          const sidebarManager = (window as any).activeSidebarManager;
          if (sidebarManager) {
            enabled ? sidebarManager.show() : sidebarManager.hide();
          }
        } catch (error) {
          context.logger.error('Error in setMCPEnabled:', error);
        }
        stateManager.updateUI();
      },

      setAutoInsert: (enabled: boolean) => {
        context.logger.debug(`Setting Auto Insert ${enabled ? 'enabled' : 'disabled'}`);
        if (context.stores.ui?.updatePreferences) {
          context.stores.ui.updatePreferences({ autoSubmit: enabled });
        }
        stateManager.updateUI();
      },

      setAutoSubmit: (enabled: boolean) => {
        context.logger.debug(`Setting Auto Submit ${enabled ? 'enabled' : 'disabled'}`);
        if (context.stores.ui?.updatePreferences) {
          context.stores.ui.updatePreferences({ autoSubmit: enabled });
        }
        stateManager.updateUI();
      },

      setAutoExecute: (enabled: boolean) => {
        context.logger.debug(`Setting Auto Execute ${enabled ? 'enabled' : 'disabled'}`);
        stateManager.updateUI();
      },

      updateUI: () => {
        context.logger.debug('Updating MCP popover UI');
        const popoverContainer = document.getElementById('mcp-popover-container');
        if (popoverContainer) {
          const currentState = stateManager.getState();
          popoverContainer.dispatchEvent(new CustomEvent('mcp:update-toggle-state', {
            detail: { toggleState: currentState }
          }));
        }
      }
    };
    return stateManager;
  }

  public injectMCPPopoverManually(): void {
    this.context.logger.debug('Manual MCP popover injection requested');
    this.injectMCPPopoverWithRetry();
  }

  public isMCPPopoverInjected(): boolean {
    return !!document.getElementById('mcp-popover-container');
  }

  private emitExecutionCompleted(toolName: string, parameters: any, result: any): void {
    this.context.eventBus.emit('tool:execution-completed', {
      execution: {
        id: this.generateCallId(),
        toolName,
        parameters,
        result,
        timestamp: Date.now(),
        status: 'success'
      }
    });
  }

  private emitExecutionFailed(toolName: string, error: string): void {
    this.context.eventBus.emit('tool:execution-failed', {
      toolName,
      error,
      callId: this.generateCallId()
    });
  }

  private generateCallId(): string {
    return `copilot-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  onPageChanged?(url: string, oldUrl?: string): void {
    this.context.logger.debug(`Copilot page changed: ${oldUrl} -> ${url}`);
    this.lastUrl = url;
    const stillSupported = this.isSupported();
    if (stillSupported) {
      this.injectCopilotButtonStyles();
      setTimeout(() => this.setupUIIntegration(), 1000);
    }
    this.context.eventBus.emit('app:site-changed', { site: url, hostname: window.location.hostname });
  }

  onHostChanged?(newHost: string, oldHost?: string): void {
    this.context.logger.debug(`Copilot host changed: ${oldHost} -> ${newHost}`);
    const stillSupported = this.isSupported();
    if (!stillSupported) {
      this.context.logger.warn('Copilot adapter no longer supported');
      this.context.eventBus.emit('adapter:deactivated', { pluginName: this.name, timestamp: Date.now() });
    } else {
      this.setupUIIntegration();
    }
  }

  onToolDetected?(tools: any[]): void {
    this.context.logger.debug(`Tools detected in Copilot:`, tools);
    tools.forEach(tool => {
      this.context.stores.tool?.addDetectedTool?.(tool);
    });
  }
}