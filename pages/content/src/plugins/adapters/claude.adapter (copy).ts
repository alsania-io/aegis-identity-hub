import { BaseAdapterPlugin } from './base.adapter';
import type { AdapterCapability, PluginContext } from '../plugin-types';
import { createLogger } from '@extension/shared/lib/logger';

/**
 * Claude Adapter for Claude.ai (claude.ai)
 * This adapter provides specialized functionality for interacting with Claude's
 * chat interface, including text insertion, form submission, and file attachment capabilities.
 * Built following the Nyx plugin architecture.
 * Integrates with Zustand stores and event system.
 */
const logger = createLogger('ClaudeAdapter');

export class ClaudeAdapter extends BaseAdapterPlugin {
  readonly name = 'ClaudeAdapter';
  readonly version = '2.1.0';
  readonly hostnames = ['claude.ai'];
  readonly capabilities: AdapterCapability[] = [
    'text-insertion',
    'form-submission',
    'file-attachment',
    'dom-manipulation'
  ];

  private readonly selectors = {
    CHAT_INPUT: 'div[contenteditable="true"][data-testid="composer-input"], div[contenteditable="true"], textarea[placeholder*="Reply "], textarea[placeholder*="Talk "]',
    SUBMIT_BUTTON: 'button[aria-label*="Send"], button[type="submit"], button:has(svg[viewBox="0 0 16 16"])',
    FILE_UPLOAD_BUTTON: 'button[aria-label*="Attach"], button[aria-label*="Upload"], input[type="file"]',
    FILE_INPUT: 'input[type="file"]',
    MAIN_PANEL: 'main, .claude-chat-container, [data-testid="conversation"]',
    DROP_ZONE: '[data-testid="composer-input"], .composer-container, .input-container',
    FILE_PREVIEW: '.file-attachment, .attachment-preview, [data-testid="file-preview"]',
    BUTTON_INSERTION_CONTAINER: 'fieldset, .composer-controls, [data-testid="composer-footer"]',
    FALLBACK_INSERTION: '.composer-parent, .input-area, [data-testid="composer"]'
  };

  private lastUrl: string = '';
  private urlCheckInterval: NodeJS.Timeout | null = null;
  private mcpPopoverContainer: HTMLElement | null = null;
  private mcpPopoverRoot: any = null;
  private mutationObserver: MutationObserver | null = null;
  private popoverCheckInterval: NodeJS.Timeout | null = null;
  private storeEventListenersSetup: boolean = false;
  private domObserversSetup: boolean = false;
  private uiIntegrationSetup: boolean = false;
  private static instanceCount = 0;
  private instanceId: number;
  private claudeStylesInjected: boolean = false;

  constructor() {
    super();
    ClaudeAdapter.instanceCount++;
    this.instanceId = ClaudeAdapter.instanceCount;
    logger.debug(`Instance #${this.instanceId} created`);
  }

  async initialize(context: PluginContext): Promise<void> {
    if (this.currentStatus === 'initializing' || this.currentStatus === 'active') {
      this.context?.logger.warn(`Claude adapter #${this.instanceId} already initialized, skipping`);
      return;
    }
    await super.initialize(context);
    this.context.logger.debug(`Initializing Claude adapter #${this.instanceId}`);
    this.lastUrl = window.location.href;
    this.setupUrlTracking();
    this.setupStoreEventListeners();
  }

  async activate(): Promise<void> {
    if (this.currentStatus === 'active') {
      this.context?.logger.warn(`Claude adapter #${this.instanceId} already active, skipping`);
      return;
    }
    await super.activate();
    this.context.logger.debug(`Activating Claude adapter #${this.instanceId}`);
    this.injectClaudeButtonStyles();
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
    this.cleanupUIIntegration();
    this.cleanupDOMObservers();
    const styleElement = document.getElementById('mcp-claude-button-styles');
    if (styleElement) {
      styleElement.remove();
      this.claudeStylesInjected = false;
    }
    this.storeEventListenersSetup = false;
    this.domObserversSetup = false;
    this.uiIntegrationSetup = false;
    this.claudeStylesInjected = false;
  }

  async insertText(text: string, options?: { targetElement?: HTMLElement }): Promise<boolean> {
    this.context.logger.debug(`Inserting text into Claude: ${text.substring(0, 50)}...`);
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
      this.emitExecutionFailed('insertText', 'Chat input not found');
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
        targetElement.dispatchEvent(new Event('change', { bubbles: true }));
      }
      this.emitExecutionCompleted('insertText', { text }, { success: true, targetElementType: targetElement.tagName });
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.emitExecutionFailed('insertText', errorMessage);
      return false;
    }
  }

  async submitForm(options?: { formElement?: HTMLFormElement }): Promise<boolean> {
    this.context.logger.debug('Submitting Claude chat input');
    let submitButton: HTMLButtonElement | null = null;
    const selectors = this.selectors.SUBMIT_BUTTON.split(', ');

    for (const selector of selectors) {
      submitButton = document.querySelector(selector.trim()) as HTMLButtonElement;
      if (submitButton) break;
    }

    if (!submitButton) {
      this.emitExecutionFailed('submitForm', 'Submit button not found');
      return false;
    }

    try {
      if (submitButton.disabled) {
        this.emitExecutionFailed('submitForm', 'Submit button disabled');
        return false;
      }
      const rect = submitButton.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        this.emitExecutionFailed('submitForm', 'Submit button not visible');
        return false;
      }
      submitButton.click();
      this.emitExecutionCompleted('submitForm', {}, { success: true, method: 'submitButton.click' });
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.emitExecutionFailed('submitForm', errorMessage);
      return false;
    }
  }

  async attachFile(file: File, options?: { inputElement?: HTMLInputElement }): Promise<boolean> {
    this.context.logger.debug(`Attaching file: ${file.name}`);
    try {
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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.emitExecutionFailed('attachFile', errorMessage);
      return false;
    }
  }

  isSupported(): boolean {
    const currentHost = window.location.hostname;
    const currentUrl = window.location.href;
    const isClaudeHost = this.hostnames.some(hostname =>
      typeof hostname === 'string' ? currentHost.includes(hostname) : (hostname as RegExp).test(currentHost)
    );
    if (!isClaudeHost) return false;

    const supportedPatterns = [
      /^https:\/\/claude\.ai\/chat\/.*/,
      /^https:\/\/claude\.ai\/new.*/,
      /^https:\/\/claude\.ai\/project\/.*/,
      /^https:\/\/claude\.ai$/
    ];
    return supportedPatterns.some(pattern => pattern.test(currentUrl));
  }

  supportsFileUpload(): boolean {
    const dropZoneSelectors = this.selectors.DROP_ZONE.split(', ');
    for (const selector of dropZoneSelectors) {
      if (document.querySelector(selector.trim())) return true;
    }
    return !!document.querySelector(this.selectors.FILE_INPUT);
  }

  private getClaudeButtonStyles(): string {
    return `
.mcp-claude-button-base {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: relative;
  min-width: 40px;
  height: 40px;
  padding: 8px 12px;
  margin: 0 4px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  background: transparent;
  color: #6e6e80;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
  outline: none;
}
.mcp-claude-button-base:hover {
  background-color: rgba(0, 0, 0, 0.05);
  border-color: rgba(0, 0, 0, 0.15);
  color: #2f2f38;
}
.mcp-claude-button-base:active {
  background-color: rgba(0, 0, 0, 0.08);
  transform: scale(0.98);
}
.mcp-claude-button-base:focus-visible {
  outline: 2px solid #2f6feb;
  outline-offset: 2px;
}
.mcp-claude-button-base.mcp-button-active {
  background-color: rgba(47, 111, 235, 0.1);
  border-color: rgba(47, 111, 235, 0.3);
  color: #2f6feb;
}
.mcp-claude-button-content {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}
.mcp-claude-button-text {
  font-size: 14px;
  font-weight: 500;
}
@media (prefers-color-scheme: dark) {
  .mcp-claude-button-base {
    border-color: rgba(255, 255, 255, 0.1);
    color: #acacbe;
  }
  .mcp-claude-button-base:hover {
    background-color: rgba(255, 255, 255, 0.08);
    color: #ececf1;
  }
  .mcp-claude-button-base.mcp-button-active {
    background-color: rgba(99, 152, 255, 0.15);
    color: #6398ff;
  }
}
`;
  }

  private injectClaudeButtonStyles(): void {
    if (this.claudeStylesInjected) return;
    try {
      const styleId = 'mcp-claude-button-styles';
      const existingStyles = document.getElementById(styleId);
      if (existingStyles) existingStyles.remove();
      const styleElement = document.createElement('style');
      styleElement.id = styleId;
      styleElement.textContent = this.getClaudeButtonStyles();
      document.head.appendChild(styleElement);
      this.claudeStylesInjected = true;
      this.context.logger.debug('Claude button styles injected');
    } catch (error) {
      this.context.logger.error('Failed to inject Claude button styles:', error);
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
    this.context.logger.debug(`Setting up store event listeners for Claude #${this.instanceId}`);

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
    this.context.logger.debug(`Setting up DOM observers for Claude #${this.instanceId}`);

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
      this.context.logger.debug(`UI integration already set up for Claude #${this.instanceId}`);
    } else {
      this.context.logger.debug(`Setting up UI integration for Claude #${this.instanceId}`);
      this.uiIntegrationSetup = true;
    }

    this.waitForPageReady()
      .then(() => this.injectMCPPopoverWithRetry())
      .catch((error) => this.context.logger.warn('Failed to wait for page ready:', error));
  }

  private async waitForPageReady(): Promise<void> {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 10;
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
    this.context.logger.debug('Cleaning up DOM observers for Claude');
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }
  }

  /**
   * FIXED: MCP button cleanup now properly unmounts React root
   */
  private cleanupUIIntegration(): void {
    this.context.logger.debug('Cleaning up UI integration for Claude');
    try {
      if (this.mcpPopoverRoot) {
        try {
          this.mcpPopoverRoot.unmount();
          this.context.logger.debug('React root unmounted successfully');
        } catch (unmountError) {
          this.context.logger.warn('Error unmounting React root:', unmountError);
        }
        this.mcpPopoverRoot = null;
      }
      const popoverContainer = document.getElementById('mcp-popover-container');
      if (popoverContainer) {
        if (popoverContainer.isConnected && popoverContainer.parentNode) {
          try {
            popoverContainer.parentNode.removeChild(popoverContainer);
          } catch {
            popoverContainer.remove();
          }
        }
      }
    } catch (error) {
      this.context.logger.error('Error during UI cleanup:', error);
    }
    this.mcpPopoverContainer = null;
  }

  private handleToolExecutionCompleted(data: any): void {
    this.context.logger.debug('Handling tool execution completion in Claude:', data);
    if (!this.shouldHandleEvents()) {
      this.context.logger.debug('Claude adapter should not handle events, ignoring');
      return;
    }
    const uiState = this.context.stores.ui;
    if (uiState && data.execution) {
      this.context.logger.debug('Tool execution handled with new architecture');
    }
  }

  private findButtonInsertionPoint(): { container: Element; insertAfter: Element | null } | null {
    this.context.logger.debug('Finding button insertion point for Claude');
    
    const fieldset = document.querySelector('fieldset');
    if (fieldset) {
      const buttons = fieldset.querySelectorAll('button');
      if (buttons.length > 0) {
        return { container: fieldset, insertAfter: buttons[0] };
      }
      return { container: fieldset, insertAfter: null };
    }

    const composerControls = document.querySelector('.composer-controls, [data-testid="composer-footer"]');
    if (composerControls) {
      const buttons = composerControls.querySelectorAll('button');
      if (buttons.length > 0) {
        return { container: composerControls, insertAfter: buttons[0] };
      }
      return { container: composerControls, insertAfter: null };
    }

    const fallbackSelectors = ['[data-testid="composer"]', '.composer-parent', '.input-area'];
    for (const selector of fallbackSelectors) {
      const container = document.querySelector(selector);
      if (container) {
        const buttons = container.querySelectorAll('button');
        const lastButton = buttons.length > 0 ? buttons[buttons.length - 1] : null;
        return { container, insertAfter: lastButton };
      }
    }

    return null;
  }

  /**
   * FIXED: MCP popover injection now properly handles React root lifecycle
   */
  private injectMCPPopover(insertionPoint: { container: Element; insertAfter: Element | null }): void {
    this.context.logger.debug('Injecting MCP popover into Claude');
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

  /**
   * FIXED: React rendering now properly tracks and cleans up root
   */
  private renderMCPPopover(container: HTMLElement): void {
    this.context.logger.debug('Rendering MCP popover for Claude');
    try {
      if (!container || !container.isConnected) {
        this.context.logger.warn('Container not connected, skipping render');
        return;
      }

      import('react').then(React => {
        import('react-dom/client').then(ReactDOM => {
          import('../../components/mcpPopover/mcpPopover').then(({ MCPPopover }) => {
            if (!container || !container.isConnected) {
              this.context.logger.warn('Container became invalid during import');
              return;
            }

            // Unmount existing root if present
            if (this.mcpPopoverRoot) {
              try {
                this.mcpPopoverRoot.unmount();
              } catch (error) {
                this.context.logger.warn('Error unmounting existing root:', error);
              }
              this.mcpPopoverRoot = null;
            }

            const toggleStateManager = this.createToggleStateManager();
            const adapterButtonConfig = {
              className: 'mcp-claude-button-base',
              contentClassName: 'mcp-claude-button-content',
              textClassName: 'mcp-claude-button-text',
              activeClassName: 'mcp-button-active'
            };

            this.mcpPopoverRoot = ReactDOM.createRoot(container);
            this.mcpPopoverRoot.render(
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

  /**
   * FIXED: Toggle state manager now properly syncs with UI store
   */
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
    return `claude-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
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
    this.context.logger.debug(`Claude page changed: ${oldUrl} -> ${url}`);
    this.lastUrl = url;
    const stillSupported = this.isSupported();
    if (stillSupported) {
      this.injectClaudeButtonStyles();
      setTimeout(() => this.setupUIIntegration(), 1000);
      setTimeout(() => this.checkAndRestoreSidebar(), 1500);
    }
    this.context.eventBus.emit('app:site-changed', { site: url, hostname: window.location.hostname });
  }

  onHostChanged?(newHost: string, oldHost?: string): void {
    this.context.logger.debug(`Claude host changed: ${oldHost} -> ${newHost}`);
    const stillSupported = this.isSupported();
    if (!stillSupported) {
      this.context.logger.warn('Claude adapter no longer supported');
      this.context.eventBus.emit('adapter:deactivated', { pluginName: this.name, timestamp: Date.now() });
    } else {
      this.setupUIIntegration();
    }
  }

  onToolDetected?(tools: any[]): void {
    this.context.logger.debug(`Tools detected in Claude:`, tools);
    tools.forEach(tool => {
      this.context.stores.tool?.addDetectedTool?.(tool);
    });
  }
}