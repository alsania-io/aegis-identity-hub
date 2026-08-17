import { BaseAdapterPlugin } from './base.adapter';
import type { AdapterCapability, PluginContext } from '../plugin-types';
import { createLogger } from '@extension/shared/lib/logger';

/**
 * Grok Adapter for X.com/Grok (x.com, grok.com)
 * This adapter provides specialized functionality for interacting with Grok's
 * chat interface, including text insertion, form submission, and file attachment capabilities.
 * Migrated from the legacy adapter system to the new plugin architecture.
 * Maintains compatibility with existing functionality while integrating with Zustand stores.
 */
const logger = createLogger('GrokAdapter');

export class GrokAdapter extends BaseAdapterPlugin {
  readonly name = 'GrokAdapter';
  readonly version = '2.1.0';
  readonly hostnames = ['x.com', 'grok.com'];
  readonly capabilities: AdapterCapability[] = [
    'text-insertion',
    'form-submission',
    'file-attachment',
    'dom-manipulation'
  ];

  private readonly selectors = {
    CHAT_INPUT: 'textarea[aria-label="Ask Grok anything"], textarea[placeholder="Ask anything"], textarea[placeholder], textarea[spellcheck="false"], textarea[data-gramm="false"], div.css-146c3p1 textarea, textarea.r-30o5oe, div[contenteditable="true"]',
    SUBMIT_BUTTON: 'button[aria-label="Submit"], button.send-button, button[aria-label="Send message"], button.chat-submit, button[data-testid="send-button"], svg.send-icon, button.submit-button',
    FILE_UPLOAD_BUTTON: 'button[aria-label*="attach"], button[aria-label*="file"], button[data-testid="file-upload"]',
    FILE_INPUT: 'input[type="file"]',
    MAIN_PANEL: '.chat-container, .grok-chat, .main-content',
    DROP_ZONE: '.chat-input-container, .input-area, textarea, div[contenteditable="true"]',
    FILE_PREVIEW: '.file-preview, .attachment-preview, .file-attachment',
    BUTTON_INSERTION_CONTAINER: '.chat-input-actions, .input-actions, .chat-controls',
    FALLBACK_INSERTION: '.chat-input-container, .input-area, .chat-interface'
  };

  private lastUrl: string = '';
  private urlCheckInterval: NodeJS.Timeout | null = null;
  private mcpPopoverContainer: HTMLElement | null = null;
  private mutationObserver: MutationObserver | null = null;
  private popoverCheckInterval: NodeJS.Timeout | null = null;
  private storeEventListenersSetup: boolean = false;
  private domObserversSetup: boolean = false;
  private uiIntegrationSetup: boolean = false;
  private adapterStylesInjected: boolean = false;
  private static instanceCount = 0;
  private instanceId: number;

  private readonly grokButtonStyles = `
.mcp-grok-button-base {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  white-space: nowrap;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid var(--border-l2, #e5e7eb);
  border-radius: 9999px;
  height: 40px;
  min-height: 40px;
  padding: 8px 14px;
  font-size: 14px;
  background-color: transparent;
  color: var(--fg-primary, #111827);
  transition: all 100ms ease-in-out;
  position: relative;
  overflow: hidden;
  user-select: none;
  font-family: inherit;
}
.mcp-grok-button-content {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}
.mcp-grok-button-base:focus-visible {
  outline: none;
  box-shadow: 0 0 0 1px var(--ring, #3b82f6);
}
.mcp-grok-button-base:hover {
  background-color: var(--button-ghost-hover, rgba(0, 0, 0, 0.05));
}
.mcp-grok-button-icon {
  width: 18px;
  height: 18px;
  min-width: 18px;
  stroke-width: 2;
  color: var(--fg-secondary, #6b7280);
}
.mcp-grok-button-text {
  font-size: 14px;
  font-weight: 500;
}
.mcp-button-active {
  background-color: var(--button-ghost-hover, rgba(0, 0, 0, 0.1));
  border-color: var(--border-l1, #d1d5db);
}
@media (prefers-color-scheme: dark) {
  .mcp-grok-button-base {
    border-color: var(--border-l2-dark, #374151);
    color: var(--fg-primary-dark, #f9fafb);
  }
  .mcp-grok-button-base:hover {
    background-color: var(--button-ghost-hover-dark, rgba(255, 255, 255, 0.05));
  }
  .mcp-grok-button-icon {
    color: var(--fg-secondary-dark, #9ca3af);
  }
  .mcp-button-active {
    background-color: var(--button-ghost-hover-dark, rgba(255, 255, 255, 0.1));
    border-color: var(--border-l1-dark, #4b5563);
  }
}
.mcp-grok-button-base {
  z-index: 25;
}
`;

  constructor() {
    super();
    GrokAdapter.instanceCount++;
    this.instanceId = GrokAdapter.instanceCount;
    logger.debug(`Instance #${this.instanceId} created`);
  }

  async initialize(context: PluginContext): Promise<void> {
    if (this.currentStatus === 'initializing' || this.currentStatus === 'active') {
      this.context?.logger.warn(`Grok adapter #${this.instanceId} already initialized, skipping`);
      return;
    }
    await super.initialize(context);
    this.context.logger.debug(`Initializing Grok adapter #${this.instanceId}`);
    this.lastUrl = window.location.href;
    this.setupUrlTracking();
    this.setupStoreEventListeners();
  }

  async activate(): Promise<void> {
    if (this.currentStatus === 'active') {
      this.context?.logger.warn(`Grok adapter #${this.instanceId} already active, skipping`);
      return;
    }
    await super.activate();
    this.context.logger.debug(`Activating Grok adapter #${this.instanceId}`);
    this.injectGrokButtonStyles();
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
    if (this.popoverCheckInterval) {
      clearInterval(this.popoverCheckInterval);
      this.popoverCheckInterval = null;
    }
    const styleElement = document.getElementById('mcp-grok-button-styles');
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
    this.context.logger.debug(`Inserting text into Grok: ${text.substring(0, 50)}...`);
    let targetElement: HTMLElement | null = null;

    if (options?.targetElement) {
      targetElement = options.targetElement;
    } else {
      const selectors = this.selectors.CHAT_INPUT.split(', ');
      for (const selector of selectors) {
        targetElement = document.querySelector(selector.trim()) as HTMLElement;
        if (targetElement) break;
      }
    }

    if (!targetElement) {
      this.emitExecutionFailed('insertText', 'Chat input element not found');
      return false;
    }

    try {
      targetElement.focus();
      if (targetElement.tagName === 'TEXTAREA') {
        const textarea = targetElement as HTMLTextAreaElement;
        const currentText = textarea.value;
        const newContent = currentText ? currentText + '\n\n' + text : text;
        textarea.value = newContent;
        textarea.selectionStart = textarea.selectionEnd = textarea.value.length;
        textarea.dispatchEvent(new InputEvent('input', { bubbles: true }));
        textarea.dispatchEvent(new Event('change', { bubbles: true }));
      } else if (targetElement.getAttribute('contenteditable') === 'true') {
        const currentText = targetElement.textContent || '';
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(targetElement);
        range.collapse(false);
        selection?.removeAllRanges();
        selection?.addRange(range);
        if (currentText && currentText.trim() !== '') {
          document.execCommand('insertText', false, '\n\n');
        }
        document.execCommand('insertText', false, text);
        targetElement.dispatchEvent(new InputEvent('input', { bubbles: true }));
      } else {
        const currentText = targetElement.textContent || '';
        const newContent = currentText ? currentText + '\n\n' + text : text;
        targetElement.textContent = newContent;
        targetElement.dispatchEvent(new InputEvent('input', { bubbles: true }));
        targetElement.dispatchEvent(new Event('change', { bubbles: true }));
      }
      this.emitExecutionCompleted('insertText', { text }, { success: true, textLength: text.length });
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.emitExecutionFailed('insertText', errorMessage);
      return false;
    }
  }

  async submitForm(options?: { formElement?: HTMLFormElement }): Promise<boolean> {
    this.context.logger.debug('Submitting Grok chat input');
    let submitButton: HTMLButtonElement | null = null;
    const selectors = this.selectors.SUBMIT_BUTTON.split(', ');

    for (const selector of selectors) {
      submitButton = document.querySelector(selector.trim()) as HTMLButtonElement;
      if (submitButton) break;
    }

    if (submitButton) {
      try {
        if (submitButton.disabled || submitButton.getAttribute('aria-disabled') === 'true') {
          this.context.logger.warn('Submit button disabled, using Enter key');
          return this.submitWithEnterKey();
        }
        const rect = submitButton.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
          return this.submitWithEnterKey();
        }
        submitButton.click();
        this.emitExecutionCompleted('submitForm', {}, { success: true, method: 'submitButton.click' });
        return true;
      } catch (error) {
        this.context.logger.warn('Submit button click failed, using Enter key');
        return this.submitWithEnterKey();
      }
    }

    return this.submitWithEnterKey();
  }

  private async submitWithEnterKey(): Promise<boolean> {
    try {
      const chatInput = document.querySelector(this.selectors.CHAT_INPUT.split(', ')[0]) as HTMLElement;
      if (!chatInput) {
        this.emitExecutionFailed('submitForm', 'Chat input not found');
        return false;
      }
      chatInput.focus();
      const enterEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true,
        cancelable: true
      });
      chatInput.dispatchEvent(enterEvent);
      this.emitExecutionCompleted('submitForm', {}, { success: true, method: 'enterKey' });
      return true;
    } catch (error) {
      this.emitExecutionFailed('submitForm', error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  async attachFile(file: File, options?: { inputElement?: HTMLInputElement }): Promise<boolean> {
    this.context.logger.debug(`Attaching file: ${file.name}`);
    if (!file || file.size === 0) {
      this.emitExecutionFailed('attachFile', 'Invalid file');
      return false;
    }
    if (!this.supportsFileUpload()) {
      this.emitExecutionFailed('attachFile', 'File upload not supported');
      return false;
    }

    let fileInput = options?.inputElement || document.querySelector(this.selectors.FILE_INPUT) as HTMLInputElement;
    if (!fileInput) {
      this.emitExecutionFailed('attachFile', 'File input not found');
      return false;
    }

    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    fileInput.files = dataTransfer.files;
    fileInput.dispatchEvent(new Event('change', { bubbles: true }));

    const previewFound = await this.checkFilePreview();
    this.emitExecutionCompleted('attachFile', { fileName: file.name }, { success: true, previewFound });
    return true;
  }

  isSupported(): boolean {
    const currentHost = window.location.hostname;
    const currentUrl = window.location.href;
    const isGrokHost = this.hostnames.some(hostname =>
      typeof hostname === 'string' ? currentHost.includes(hostname) : (hostname as RegExp).test(currentHost)
    );
    if (!isGrokHost) return false;

    const supportedPatterns = [
      /^https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/i\/grok/,
      /^https?:\/\/(?:www\.)?grok\.com/
    ];
    return supportedPatterns.some(pattern => pattern.test(currentUrl));
  }

  supportsFileUpload(): boolean {
    if (document.querySelector(this.selectors.FILE_INPUT)) return true;
    const uploadButtonSelectors = this.selectors.FILE_UPLOAD_BUTTON.split(', ');
    for (const selector of uploadButtonSelectors) {
      if (document.querySelector(selector.trim())) return true;
    }
    const dropZoneSelectors = this.selectors.DROP_ZONE.split(', ');
    for (const selector of dropZoneSelectors) {
      if (document.querySelector(selector.trim())) return true;
    }
    return false;
  }

  private injectGrokButtonStyles(): void {
    if (this.adapterStylesInjected) return;
    try {
      const styleId = 'mcp-grok-button-styles';
      const existingStyles = document.getElementById(styleId);
      if (existingStyles) existingStyles.remove();
      const styleElement = document.createElement('style');
      styleElement.id = styleId;
      styleElement.textContent = this.grokButtonStyles;
      document.head.appendChild(styleElement);
      this.adapterStylesInjected = true;
      this.context.logger.debug('Grok button styles injected');
    } catch (error) {
      this.context.logger.error('Failed to inject Grok button styles:', error);
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
    this.context.logger.debug(`Setting up store event listeners for Grok #${this.instanceId}`);

    this.context.eventBus.on('tool:execution-completed', (data) => {
      this.context.logger.debug('Tool execution completed:', data);
      this.handleToolExecutionCompleted(data);
    });

    this.context.eventBus.on('ui:sidebar-toggle', (data) => {
      this.context.logger.debug('Sidebar toggled:', data);
    });

    this.storeEventListenersSetup = true;
  }

  private setupDOMObservers(): void {
    if (this.domObserversSetup) return;
    this.context.logger.debug(`Setting up DOM observers for Grok #${this.instanceId}`);

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
      this.context.logger.debug(`UI integration already set up for Grok #${this.instanceId}`);
    } else {
      this.context.logger.debug(`Setting up UI integration for Grok #${this.instanceId}`);
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
    this.context.logger.debug('Cleaning up DOM observers for Grok');
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }
  }

  private cleanupUIIntegration(): void {
    this.context.logger.debug('Cleaning up UI integration for Grok');
    const popoverContainer = document.getElementById('mcp-popover-container');
    if (popoverContainer) {
      popoverContainer.remove();
    }
    this.mcpPopoverContainer = null;
  }

  /**
   * FIXED: Auto-submit now properly triggers after tool execution
   */
  private async handleToolExecutionCompleted(data: any): Promise<void> {
    this.context.logger.debug('Handling tool execution completion in Grok:', data);
    
    if (!this.shouldHandleEvents()) {
      this.context.logger.debug('Grok adapter should not handle events, ignoring');
      return;
    }

    const uiState = this.context.stores.ui;
    if (uiState && data.execution) {
      // Check if auto-submit is enabled
      const autoSubmitEnabled = uiState.preferences?.autoSubmit ?? false;
      
      if (autoSubmitEnabled) {
        this.context.logger.debug('Auto-submit enabled, triggering form submission');
        // Small delay to ensure text is fully inserted
        await new Promise(resolve => setTimeout(resolve, 300));
        await this.submitForm();
      } else {
        this.context.logger.debug('Auto-submit disabled, tool execution completed without submit');
      }
    }
  }

  private findButtonInsertionPoint(): { container: Element; insertAfter: Element | null } | null {
    this.context.logger.debug('Finding button insertion point for Grok');
    
    const submitButton = document.querySelector('button[aria-label="Submit"], button[type="submit"], button[aria-label="Enter voice mode"]');
    if (submitButton) {
      const submitContainer = submitButton.closest('.ml-auto.flex.flex-row.items-end.gap-1') ||
                              submitButton.closest('.flex.flex-row.items-end') ||
                              submitButton.closest('.flex.items-end') ||
                              submitButton.parentElement;
      if (submitContainer) {
        return { container: submitContainer, insertAfter: null };
      }
    }

    const thinkButton = document.querySelector('button[aria-label="Think"]');
    if (thinkButton && thinkButton.parentElement) {
      return { container: thinkButton.parentElement, insertAfter: thinkButton };
    }

    const primarySelectors = this.selectors.BUTTON_INSERTION_CONTAINER.split(', ');
    for (const selector of primarySelectors) {
      const container = document.querySelector(selector.trim());
      if (container) {
        const buttons = container.querySelectorAll('button');
        const insertAfter = buttons.length > 0 ? buttons[buttons.length - 1] : null;
        return { container, insertAfter };
      }
    }

    const fallbackSelectors = this.selectors.FALLBACK_INSERTION.split(', ');
    for (const selector of fallbackSelectors) {
      const container = document.querySelector(selector.trim());
      if (container) {
        return { container, insertAfter: null };
      }
    }

    return null;
  }

  private injectMCPPopover(insertionPoint: { container: Element; insertAfter: Element | null }): void {
    this.context.logger.debug('Injecting MCP popover into Grok');
    try {
      if (document.getElementById('mcp-popover-container')) {
        return;
      }

      const reactContainer = document.createElement('div');
      reactContainer.id = 'mcp-popover-container';
      reactContainer.style.display = 'inline-block';
      reactContainer.style.margin = '0 4px';

      const { container, insertAfter } = insertionPoint;
      if (insertAfter === null) {
        const firstChild = container.firstChild;
        if (firstChild) {
          container.insertBefore(reactContainer, firstChild);
        } else {
          container.appendChild(reactContainer);
        }
      } else if (insertAfter && insertAfter.parentNode === container) {
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
    this.context.logger.debug('Rendering MCP popover for Grok');
    try {
      import('react').then(React => {
        import('react-dom/client').then(ReactDOM => {
          import('../../components/mcpPopover/mcpPopover').then(({ MCPPopover }) => {
            const toggleStateManager = this.createToggleStateManager();
            const adapterButtonConfig = {
              className: 'mcp-grok-button-base',
              contentClassName: 'mcp-grok-button-content',
              textClassName: 'mcp-grok-button-text',
              iconClassName: 'mcp-grok-button-icon',
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

  private async checkFilePreview(): Promise<boolean> {
    return new Promise(resolve => {
      setTimeout(() => {
        const filePreview = document.querySelector(this.selectors.FILE_PREVIEW);
        resolve(!!filePreview);
      }, 500);
    });
  }

  private emitExecutionCompleted(operation: string, params: any, result: any): void {
    if (this.context.eventBus) {
      try {
        this.context.eventBus.emit('tool:execution-completed', {
          execution: {
            id: this.generateCallId(),
            toolName: operation,
            parameters: params,
            result,
            timestamp: Date.now(),
            status: 'success'
          }
        });
      } catch (error) {
        this.context.logger.warn('Failed to emit execution completed:', error);
      }
    }
  }

  private emitExecutionFailed(operation: string, error: string): void {
    if (this.context.eventBus) {
      try {
        this.context.eventBus.emit('tool:execution-failed', {
          toolName: operation,
          error,
          callId: this.generateCallId()
        });
      } catch (error) {
        this.context.logger.warn('Failed to emit execution failed:', error);
      }
    }
  }

  private generateCallId(): string {
    return `grok-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  private checkAndRestoreSidebar(): void {
    this.context.logger.debug('Checking sidebar state after navigation');
    try {
      const activeSidebarManager = (window as any).activeSidebarManager;
      if (!activeSidebarManager) {
        this.context.logger.warn('No active sidebar manager found');
        return;
      }
      this.ensureMCPPopoverConnection();
    } catch (error) {
      this.context.logger.error('Error checking sidebar state:', error);
    }
  }

  private ensureMCPPopoverConnection(): void {
    this.context.logger.debug('Ensuring MCP popover connection');
    try {
      if (!this.isMCPPopoverInjected()) {
        this.context.logger.debug('MCP popover missing, re-injecting');
        this.injectMCPPopoverWithRetry(3);
      }
    } catch (error) {
      this.context.logger.error('Error ensuring MCP popover connection:', error);
    }
  }

  onPageChanged?(url: string, oldUrl?: string): void {
    this.context.logger.debug(`Grok page changed: ${oldUrl} -> ${url}`);
    this.lastUrl = url;
    setTimeout(() => this.injectGrokButtonStyles(), 500);
    const stillSupported = this.isSupported();
    if (stillSupported) {
      setTimeout(() => this.setupUIIntegration(), 1000);
      setTimeout(() => this.checkAndRestoreSidebar(), 1500);
    }
    this.context.eventBus.emit('app:site-changed', { site: url, hostname: window.location.hostname });
  }

  onHostChanged?(newHost: string, oldHost?: string): void {
    this.context.logger.debug(`Grok host changed: ${oldHost} -> ${newHost}`);
    const stillSupported = this.isSupported();
    if (!stillSupported) {
      this.context.logger.warn('Grok adapter no longer supported');
      this.context.eventBus.emit('adapter:deactivated', { pluginName: this.name, timestamp: Date.now() });
    } else {
      this.setupUIIntegration();
    }
  }

  onToolDetected?(tools: any[]): void {
    this.context.logger.debug(`Tools detected in Grok:`, tools);
    tools.forEach(tool => {
      this.context.stores.tool?.addDetectedTool?.(tool);
    });
  }
}