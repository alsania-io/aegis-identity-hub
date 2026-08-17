import { BaseAdapterPlugin } from './base.adapter';
import type { AdapterCapability, PluginContext } from '../plugin-types';
import { createLogger } from '@extension/shared/lib/logger';

/**
 * DeepSeek Adapter for DeepSeek Chat (chat.deepseek.com)
 * This adapter provides specialized functionality for interacting with DeepSeek's
 * chat interface, including text insertion, form submission, and file attachment capabilities.
 * Migrated from the legacy adapter system to the new plugin architecture.
 * Maintains compatibility with existing functionality while integrating with Zustand stores.
 */
const logger = createLogger('DeepSeekAdapter');

export class DeepSeekAdapter extends BaseAdapterPlugin {
  readonly name = 'DeepSeekAdapter';
  readonly version = '2.1.0';
  readonly hostnames = ['chat.deepseek.com'];
  readonly capabilities: AdapterCapability[] = [
    'text-insertion',
    'form-submission',
    'file-attachment',
    'dom-manipulation'
  ];

  // CSS selectors for DeepSeek's UI elements
  private readonly selectors = {
    CHAT_INPUT: 'textarea[spellcheck="false"], textarea[data-gramm="false"], textarea[placeholder*="Ask "], textarea[placeholder*="Message DeepSeek "], textarea.chat-input, div[contenteditable="true"]',
    SUBMIT_BUTTON: 'button[aria-label*="Send "], button[data-testid="send-button"], button.send-button, svg.send-icon',
    FILE_UPLOAD_BUTTON: 'button[aria-label*="attach "], button[aria-label*="file "], input[type="file"]',
    FILE_INPUT: 'input[type="file"]',
    MAIN_PANEL: '.chat-container, .main-content, .conversation-container, .chat-interface',
    DROP_ZONE: '.chat-input-container, .input-area, .message-input, .chat-input, .file-drop-area',
    FILE_PREVIEW: '.file-preview, .attachment-preview, .uploaded-file',
    BUTTON_INSERTION_CONTAINER: '.ec4f5d61, .chat-input-actions, .input-actions, .actions-wrapper',
    FALLBACK_INSERTION: '.input-area, .chat-input-container, ._24fad49, .bf38813a, .aaff8b8f'
  };

  private lastUrl: string = '';
  private urlCheckInterval: NodeJS.Timeout | null = null;
  private mcpPopoverContainer: HTMLElement | null = null;
  private mutationObserver: MutationObserver | null = null;
  private popoverCheckInterval: NodeJS.Timeout | null = null;
  private storeEventListenersSetup: boolean = false;
  private domObserversSetup: boolean = false;
  private uiIntegrationSetup: boolean = false;
  private static instanceCount = 0;
  private instanceId: number;
  private adapterStylesInjected: boolean = false;

  private readonly deepseekButtonStyles = `
.mcp-ds-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: relative;
  padding: 0 12px;
  height: 34px;
  border-radius: 17px;
  background-color: var(--dsw-alias-bg-secondary, #f5f5f5);
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  font-family: inherit;
  font-size: 14px;
  font-weight: 500;
  color: var(--dsw-alias-label-primary, #0f1115);
  white-space: nowrap;
  user-select: none;
  outline: none;
  margin-left: 8px;
}
.mcp-ds-button:hover {
  background-color: var(--dsw-alias-bg-tertiary, #e8e8e8);
}
.mcp-ds-button.mcp-button-active {
  background-color: var(--dsw-alias-bg-brand-secondary, #e8f0fe);
  color: var(--dsw-alias-label-brand, #1a73e8);
  border-color: var(--dsw-alias-border-brand, #1a73e8);
}
.mcp-ds-button-content {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.mcp-ds-button-text {
  font-size: 14px;
  font-weight: 500;
}
@media (prefers-color-scheme: dark) {
  .mcp-ds-button {
    background-color: var(--dsw-alias-bg-secondary-dark, #2a2a2a);
    color: var(--dsw-alias-label-primary-dark, #e8eaed);
  }
  .mcp-ds-button.mcp-button-active {
    background-color: var(--dsw-alias-bg-brand-secondary-dark, #1a3a5a);
    color: var(--dsw-alias-label-brand-dark, #8ab4f8);
  }
}
`;

  constructor() {
    super();
    DeepSeekAdapter.instanceCount++;
    this.instanceId = DeepSeekAdapter.instanceCount;
    logger.debug(`Instance #${this.instanceId} created`);
  }

  async initialize(context: PluginContext): Promise<void> {
    if (this.currentStatus === 'initializing' || this.currentStatus === 'active') {
      this.context?.logger.warn(`DeepSeek adapter #${this.instanceId} already initialized, skipping`);
      return;
    }
    await super.initialize(context);
    this.context.logger.debug(`Initializing DeepSeek adapter #${this.instanceId}`);
    this.lastUrl = window.location.href;
    this.setupUrlTracking();
    this.setupStoreEventListeners();
  }

  async activate(): Promise<void> {
    if (this.currentStatus === 'active') {
      this.context?.logger.warn(`DeepSeek adapter #${this.instanceId} already active, skipping`);
      return;
    }
    await super.activate();
    this.context.logger.debug(`Activating DeepSeek adapter #${this.instanceId}`);
    this.injectDeepSeekButtonStyles();
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
    const styleElement = document.getElementById('mcp-deepseek-button-styles');
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
    this.context.logger.debug(`Inserting text into DeepSeek: ${text.substring(0, 50)}...`);
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
      }
      this.emitExecutionCompleted('insertText', { text }, { success: true, insertedLength: text.length });
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.emitExecutionFailed('insertText', errorMessage);
      return false;
    }
  }

  async submitForm(options?: { formElement?: HTMLFormElement }): Promise<boolean> {
    this.context.logger.debug('Submitting DeepSeek chat input');
    let submitButton: HTMLButtonElement | null = null;
    const selectors = this.selectors.SUBMIT_BUTTON.split(', ');

    for (const selector of selectors) {
      submitButton = document.querySelector(selector.trim()) as HTMLButtonElement;
      if (submitButton) break;
    }

    if (!submitButton) {
      return this.submitWithEnterKey();
    }

    try {
      if (submitButton.disabled || submitButton.getAttribute('aria-disabled') === 'true') {
        this.context.logger.warn('Submit button disabled, using Enter key fallback');
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
      this.context.logger.warn('Submit button click failed, using Enter key fallback');
      return this.submitWithEnterKey();
    }
  }

  private async submitWithEnterKey(): Promise<boolean> {
    try {
      const chatInput = document.querySelector(this.selectors.CHAT_INPUT.split(', ')[0]) as HTMLTextAreaElement;
      if (!chatInput) {
        this.emitExecutionFailed('submitForm', 'Chat input not found for Enter key');
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
    if (fileInput) {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      fileInput.files = dataTransfer.files;
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      this.emitExecutionCompleted('attachFile', { fileName: file.name }, { success: true, method: 'fileInput' });
      return true;
    }

    const dropSuccess = await this.simulateFileDrop(file);
    if (dropSuccess) {
      this.emitExecutionCompleted('attachFile', { fileName: file.name }, { success: true, method: 'dragDrop' });
      return true;
    }

    this.emitExecutionFailed('attachFile', 'All attachment methods failed');
    return false;
  }

  private async simulateFileDrop(file: File): Promise<boolean> {
    try {
      const dropZoneSelectors = this.selectors.DROP_ZONE.split(', ');
      let dropZone: Element | null = null;
      for (const selector of dropZoneSelectors) {
        dropZone = document.querySelector(selector.trim());
        if (dropZone) break;
      }
      if (!dropZone) return false;

      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      dropZone.dispatchEvent(new DragEvent('dragenter', { bubbles: true, dataTransfer }));
      dropZone.dispatchEvent(new DragEvent('dragover', { bubbles: true, dataTransfer }));
      dropZone.dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer }));
      return true;
    } catch {
      return false;
    }
  }

  isSupported(): boolean {
    const currentHost = window.location.hostname;
    const currentUrl = window.location.href;
    const isDeepSeekHost = this.hostnames.some(hostname =>
      typeof hostname === 'string' ? currentHost.includes(hostname) : (hostname as RegExp).test(currentHost)
    );
    if (!isDeepSeekHost) return false;

    const supportedPatterns = [
      /^https?:\/\/(?:www\.)?chat\.deepseek\.com\/.*/,
      /^https?:\/\/(?:www\.)?chat\.deepseek\.com$/
    ];
    return supportedPatterns.some(pattern => pattern.test(currentUrl));
  }

  supportsFileUpload(): boolean {
    const dropZoneSelectors = this.selectors.DROP_ZONE.split(', ');
    for (const selector of dropZoneSelectors) {
      if (document.querySelector(selector.trim())) return true;
    }
    const uploadButtonSelectors = this.selectors.FILE_UPLOAD_BUTTON.split(', ');
    for (const selector of uploadButtonSelectors) {
      if (document.querySelector(selector.trim())) return true;
    }
    return !!document.querySelector(this.selectors.FILE_INPUT);
  }

  private injectDeepSeekButtonStyles(): void {
    if (this.adapterStylesInjected) return;
    try {
      const styleId = 'mcp-deepseek-button-styles';
      const existingStyles = document.getElementById(styleId);
      if (existingStyles) existingStyles.remove();
      const styleElement = document.createElement('style');
      styleElement.id = styleId;
      styleElement.textContent = this.deepseekButtonStyles;
      document.head.appendChild(styleElement);
      this.adapterStylesInjected = true;
      this.context.logger.debug('DeepSeek button styles injected');
    } catch (error) {
      this.context.logger.error('Failed to inject DeepSeek button styles:', error);
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
    this.context.logger.debug(`Setting up store event listeners for DeepSeek #${this.instanceId}`);

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
    this.context.logger.debug(`Setting up DOM observers for DeepSeek #${this.instanceId}`);

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
      this.context.logger.debug(`UI integration already set up for DeepSeek #${this.instanceId}`);
    } else {
      this.context.logger.debug(`Setting up UI integration for DeepSeek #${this.instanceId}`);
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
        this.context.logger.debug('MCP popover already exists');
        return;
      }
      const insertionPoint = this.findButtonInsertionPoint();
      if (insertionPoint) {
        this.injectMCPPopover(insertionPoint);
      } else if (attempt < maxRetries) {
        setTimeout(() => attemptInjection(attempt + 1), 1000);
      } else {
        this.context.logger.warn('Failed to inject MCP popover after maximum retries');
      }
    };
    attemptInjection(1);
  }

  private cleanupDOMObservers(): void {
    this.context.logger.debug('Cleaning up DOM observers for DeepSeek');
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }
  }

  private cleanupUIIntegration(): void {
    this.context.logger.debug('Cleaning up UI integration for DeepSeek');
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
    this.context.logger.debug('Handling tool execution completion in DeepSeek:', data);
    
    if (!this.shouldHandleEvents()) {
      this.context.logger.debug('DeepSeek adapter should not handle events, ignoring');
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
    this.context.logger.debug('Finding button insertion point for DeepSeek');
    
    const buttonContainer = document.querySelector('.ec4f5d61');
    if (buttonContainer) {
      const attachContainer = buttonContainer.querySelector('.bf38813a');
      if (attachContainer) {
        const toggleButtons = buttonContainer.querySelectorAll('.ds-toggle-button');
        if (toggleButtons.length > 0) {
          return { container: buttonContainer, insertAfter: toggleButtons[toggleButtons.length - 1] };
        }
        return { container: buttonContainer, insertAfter: null };
      }
      const buttons = buttonContainer.querySelectorAll('.ds-button');
      for (const button of Array.from(buttons)) {
        if (button.textContent?.trim() === 'Search') {
          return { container: buttonContainer, insertAfter: button };
        }
      }
      const lastButton = buttonContainer.querySelector('.ds-button:last-child');
      if (lastButton) {
        return { container: buttonContainer, insertAfter: lastButton };
      }
    }

    const fallbackSelectors = ['._24fad49', '.bf38813a', '.aaff8b8f', '.chat-input-actions', '.input-actions', '.actions-wrapper'];
    for (const selector of fallbackSelectors) {
      const container = document.querySelector(selector);
      if (container) {
        if (container.parentElement) {
          return { container: container.parentElement, insertAfter: container };
        }
        return { container, insertAfter: null };
      }
    }

    return null;
  }

  private injectMCPPopover(insertionPoint: { container: Element; insertAfter: Element | null }): void {
    this.context.logger.debug('Injecting MCP popover into DeepSeek');
    try {
      if (document.getElementById('mcp-popover-container')) {
        return;
      }

      if (!document.getElementById('mcp-deepseek-button-styles')) {
        const styleEl = document.createElement('style');
        styleEl.id = 'mcp-deepseek-button-styles';
        styleEl.textContent = this.deepseekButtonStyles;
        document.head.appendChild(styleEl);
      }

      const reactContainer = document.createElement('div');
      reactContainer.id = 'mcp-popover-container';
      reactContainer.style.display = 'inline-block';

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
    this.context.logger.debug('Rendering MCP popover for DeepSeek');
    try {
      import('react').then(React => {
        import('react-dom/client').then(ReactDOM => {
          import('../../components/mcpPopover/mcpPopover').then(({ MCPPopover }) => {
            const toggleStateManager = this.createToggleStateManager();
            const adapterButtonConfig = {
              className: 'mcp-ds-button',
              contentClassName: 'mcp-ds-button-content',
              textClassName: 'mcp-ds-button-text',
              iconClassName: 'mcp-ds-button-icon',
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
          return {
            mcpEnabled,
            autoInsert: autoSubmitEnabled,
            autoSubmit: autoSubmitEnabled,
            autoExecute: false
          };
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
    return `deepseek-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
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
    this.context.logger.debug(`DeepSeek page changed: ${oldUrl} -> ${url}`);
    this.lastUrl = url;
    const stillSupported = this.isSupported();
    if (stillSupported) {
      setTimeout(() => this.setupUIIntegration(), 1000);
      setTimeout(() => this.checkAndRestoreSidebar(), 1500);
    }
    this.context.eventBus.emit('app:site-changed', { site: url, hostname: window.location.hostname });
  }

  onHostChanged?(newHost: string, oldHost?: string): void {
    this.context.logger.debug(`DeepSeek host changed: ${oldHost} -> ${newHost}`);
    const stillSupported = this.isSupported();
    if (!stillSupported) {
      this.context.logger.warn('DeepSeek adapter no longer supported');
      this.context.eventBus.emit('adapter:deactivated', { pluginName: this.name, timestamp: Date.now() });
    } else {
      this.setupUIIntegration();
    }
  }

  onToolDetected?(tools: any[]): void {
    this.context.logger.debug(`Tools detected in DeepSeek:`, tools);
    tools.forEach(tool => {
      this.context.stores.tool?.addDetectedTool?.(tool);
    });
  }
}