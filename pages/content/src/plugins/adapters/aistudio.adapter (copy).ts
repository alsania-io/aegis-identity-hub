import { BaseAdapterPlugin } from './base.adapter';
import type { AdapterCapability, PluginContext } from '../plugin-types';
import { createLogger } from '@extension/shared/lib/logger';

/**
 * AI Studio Adapter for Google AI Studio (aistudio.google.com)
 * This adapter provides specialized functionality for interacting with Google AI Studio's
 * chat interface, including text insertion, form submission, and file attachment capabilities.
 * Migrated from the legacy adapter system to the new plugin architecture.
 * Maintains compatibility with existing functionality while integrating with Zustand stores.
 */
const logger = createLogger('AIStudioAdapter');

export class AIStudioAdapter extends BaseAdapterPlugin {
  readonly name = 'AIStudioAdapter';
  readonly version = '2.1.0'; // Updated for improvements
  readonly hostnames = ['aistudio.google.com'];
  readonly capabilities: AdapterCapability[] = [
    'text-insertion',
    'form-submission',
    'file-attachment',
    'dom-manipulation'
  ];

  // CSS selectors for AI Studio's UI elements
  private readonly selectors = {
    // Button insertion points (for MCP popover)
    BUTTON_INSERTION_CONTAINER: '.prompt-input-wrapper, .actions-container, footer .actions-container',
    // Alternative insertion points
    FALLBACK_INSERTION: '.input-area, .chat-input-container, .conversation-input',
    // Run button selectors (multiple strategies)
    RUN_BUTTON: 'ms-run-button, button[aria-label="Run"], button[type="submit"]',
    // Add media button selectors
    ADD_MEDIA_BUTTON: 'ms-add-media-button, [data-test-id="add-media-button"], button[aria-label*="Insert images"]',
  };

  // URL patterns for navigation tracking
  private lastUrl: string = '';
  private urlCheckInterval: NodeJS.Timeout | null = null;

  // State management integration
  private mcpPopoverContainer: HTMLElement | null = null;
  private mutationObserver: MutationObserver | null = null;
  private popoverCheckInterval: NodeJS.Timeout | null = null;
  private uiChangeObserver: MutationObserver | null = null;

  // Setup state tracking
  private storeEventListenersSetup: boolean = false;
  private domObserversSetup: boolean = false;
  private uiIntegrationSetup: boolean = false;

  // Instance tracking for debugging
  private static instanceCount = 0;
  private instanceId: number;

  // Adapter styling integration
  private adapterStylesInjected: boolean = false;

  // Critical selectors for health monitoring
  private criticalSelectors = ['RUN_BUTTON', 'BUTTON_INSERTION_CONTAINER'];

  constructor() {
    super();
    AIStudioAdapter.instanceCount++;
    this.instanceId = AIStudioAdapter.instanceCount;
    logger.debug(`Instance #${this.instanceId} created. Total instances: ${AIStudioAdapter.instanceCount}`);
  }

  async initialize(context: PluginContext): Promise<void> {
    // Guard against multiple initialization
    if (this.currentStatus === 'initializing' || this.currentStatus === 'active') {
      this.context?.logger.warn(
        `AI Studio adapter instance #${this.instanceId} already initialized or active, skipping re-initialization`,
      );
      return;
    }

    await super.initialize(context);
    this.context.logger.debug(`Initializing AI Studio adapter instance #${this.instanceId}...`);

    // Initialize URL tracking
    this.lastUrl = window.location.href;
    this.setupUrlTracking();

    // Set up event listeners for the new architecture
    this.setupStoreEventListeners();

    // Validate selectors on initialization
    this.validateSelectors();
  }

  async activate(): Promise<void> {
    // Guard against multiple activation
    if (this.currentStatus === 'active') {
      this.context?.logger.warn(`AI Studio adapter instance #${this.instanceId} already active, skipping re-activation`);
      return;
    }

    await super.activate();
    this.context.logger.debug(`Activating AI Studio adapter instance #${this.instanceId}...`);

    // Inject adapter-specific button styles
    this.injectAIStudioButtonStyles();

    // Set up DOM observers and UI integration
    this.setupDOMObservers();
    this.setupUIIntegration();

    // Set up UI change detection
    this.setupUIChangeDetection();

    // Emit activation event for store synchronization
    this.context.eventBus.emit('adapter:activated', {
      pluginName: this.name,
      timestamp: Date.now()
    });
  }

  async deactivate(): Promise<void> {
    // Guard against double deactivation
    if (this.currentStatus === 'inactive' || this.currentStatus === 'disabled') {
      this.context?.logger.warn('AI Studio adapter already inactive, skipping deactivation');
      return;
    }

    await super.deactivate();
    this.context.logger.debug('Deactivating AI Studio adapter...');

    // Clean up UI integration
    this.cleanupUIIntegration();
    this.cleanupDOMObservers();

    // Reset setup flags
    this.storeEventListenersSetup = false;
    this.domObserversSetup = false;
    this.uiIntegrationSetup = false;

    // Emit deactivation event
    this.context.eventBus.emit('adapter:deactivated', {
      pluginName: this.name,
      timestamp: Date.now()
    });
  }

  async cleanup(): Promise<void> {
    await super.cleanup();
    this.context.logger.debug('Cleaning up AI Studio adapter...');

    // Clear URL tracking interval
    if (this.urlCheckInterval) {
      clearInterval(this.urlCheckInterval);
      this.urlCheckInterval = null;
    }

    // Clear popover check interval
    if (this.popoverCheckInterval) {
      clearInterval(this.popoverCheckInterval);
      this.popoverCheckInterval = null;
    }

    // Remove injected adapter styles
    const styleElement = document.getElementById('mcp-aistudio-button-styles');
    if (styleElement) {
      styleElement.remove();
      this.adapterStylesInjected = false;
    }

    // Clean up UI change observer
    if (this.uiChangeObserver) {
      this.uiChangeObserver.disconnect();
      this.uiChangeObserver = null;
    }

    // Final cleanup
    this.cleanupUIIntegration();
    this.cleanupDOMObservers();

    // Reset all setup flags
    this.storeEventListenersSetup = false;
    this.domObserversSetup = false;
    this.uiIntegrationSetup = false;

    // Clear selector health
    this.selectorHealth.clear();
  }

  // Override health report with AI Studio-specific data
  public getHealthReport() {
    return {
      name: this.name,
      status: this.currentStatus,
      selectorsWorking: this.testCriticalSelectors(),
      uiInjected: this.isMCPPopoverInjected(),
      lastUrl: this.lastUrl,
      instanceId: this.instanceId,
      timestamp: Date.now(),
    };
  }

  /**
   * Insert text into the AI Studio chat input field
   */
  async insertText(text: string, options?: { targetElement?: HTMLElement }): Promise<boolean> {
    this.context.logger.debug(
      `Attempting to insert text into AI Studio chat input: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`,
    );

    try {
      // Use the proven chatInputHandler method
      const success = insertTextToChatInput(text);

      if (success) {
        this.emitExecutionCompleted(
          'insertText',
          { text },
          {
            success: true,
            method: 'chatInputHandler',
            textLength: text.length,
          },
        );
        this.context.logger.debug(`Text inserted successfully using chatInputHandler. Length: ${text.length}`);
        return true;
      } else {
        this.context.logger.error('Failed to insert text using chatInputHandler');
        this.emitExecutionFailed('insertText', 'chatInputHandler failed to insert text');
        return false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.context.logger.error(`Error inserting text into AI Studio chat input: ${errorMessage}`);
      this.emitExecutionFailed('insertText', errorMessage);
      return false;
    }
  }

  /**
   * Submit the current text in the AI Studio chat input
   */
  async submitForm(options?: { formElement?: HTMLFormElement }): Promise<boolean> {
    this.context.logger.debug('Attempting to submit AI Studio chat input');

    try {
      // Use the proven chatInputHandler method
      const success = await submitChatInput();

      if (success) {
        this.emitExecutionCompleted(
          'submitForm',
          {
            formElement: options?.formElement?.tagName || 'unknown',
          },
          {
            success: true,
            method: 'chatInputHandler',
          },
        );
        this.context.logger.debug('AI Studio chat input submitted successfully via chatInputHandler');
        return true;
      } else {
        this.context.logger.error('Failed to submit using chatInputHandler');
        this.emitExecutionFailed('submitForm', 'chatInputHandler failed to submit');
        return false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.context.logger.error(`Error submitting AI Studio chat input: ${errorMessage}`);
      this.emitExecutionFailed('submitForm', errorMessage);
      return false;
    }
  }

  /**
   * Attach a file to the AI Studio chat input
   */
  async attachFile(file: File, options?: { inputElement?: HTMLInputElement }): Promise<boolean> {
    this.context.logger.debug(`Attempting to attach file: ${file.name} (${file.size} bytes, ${file.type})`);

    try {
      // Validate file before attempting attachment
      if (!file || file.size === 0) {
        this.emitExecutionFailed('attachFile', 'Invalid file: file is empty or null');
        return false;
      }

      // Check if file upload is supported on current page
      if (!this.supportsFileUpload()) {
        this.emitExecutionFailed('attachFile', 'File upload not supported on current page');
        return false;
      }

      // Use the proven chatInputHandler method
      const success = await attachFileToChatInput(file);

      if (success) {
        this.emitExecutionCompleted(
          'attachFile',
          {
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
          },
          {
            success: true,
            method: 'chatInputHandler',
          },
        );
        this.context.logger.debug(`File attached successfully via chatInputHandler: ${file.name}`);
        return true;
      } else {
        this.context.logger.warn(`File attachment failed via chatInputHandler for: ${file.name}`);
        this.emitExecutionFailed('attachFile', 'chatInputHandler failed to attach file');
        return false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.context.logger.error(`Error attaching file to AI Studio: ${errorMessage}`);
      this.emitExecutionFailed('attachFile', errorMessage);
      return false;
    }
  }

  /**
   * Check if the current page/URL is supported by this adapter
   */
  isSupported(): boolean | Promise<boolean> {
    const currentHost = window.location.hostname;
    const currentUrl = window.location.href;
    this.context.logger.debug(`Checking if AI Studio adapter supports: ${currentUrl}`);

    // Check hostname first
    const isAIStudioHost = this.hostnames.some(hostname => {
      if (typeof hostname === 'string') {
        return currentHost.includes(hostname);
      }
      return (hostname as RegExp).test(currentHost);
    });

    if (!isAIStudioHost) {
      this.context.logger.debug(`Host ${currentHost} not supported by AI Studio adapter`);
      return false;
    }

    // Check if we're on a supported AI Studio page
    const supportedPatterns = [
      /^https:\/\/aistudio\.google\.com\/app\/.*/,
      /^https:\/\/aistudio\.google\.com\/$/,
      /^https:\/\/aistudio\.google\.com\/prompts\/.*/,
    ];

    const isSupported = supportedPatterns.some(pattern => pattern.test(currentUrl));

    if (isSupported) {
      this.context.logger.debug(`AI Studio adapter supports current page: ${currentUrl}`);
    } else {
      this.context.logger.debug(`URL pattern not supported: ${currentUrl}`);
    }

    return isSupported;
  }

  /**
   * Check if file upload is supported on the current page
   */
  supportsFileUpload(): boolean {
    this.context.logger.debug('Checking file upload support for AI Studio');

    // Check if we can find the chat input element
    const chatInput = findChatInputElement();
    if (chatInput) {
      this.context.logger.debug('Found chat input element, file upload should be supported');
      return true;
    }

    this.context.logger.debug('Could not find chat input element');
    return false;
  }

  // ============================================================================
  // NEW: Selector Health Monitoring
  // ============================================================================

  /**
   * Validate critical selectors are working
   */
  private async validateSelectors(): Promise<void> {
    for (const selectorName of this.criticalSelectors) {
      const selectors = (this.selectors as any)[selectorName].split(', ');
      let found = false;
      for (const selector of selectors) {
        if (document.querySelector(selector.trim())) {
          found = true;
          break;
        }
      }
      if (!found) {
        this.context.logger.warn(`Critical selector ${selectorName} not found - UI may have changed`);
        this.notifyUser(`AI Studio adapter: ${selectorName} selector not found. UI may have changed.`, 'warning');
        this.context.eventBus.emit('adapter:selectors-outdated', {
          adapter: this.name,
          selectorName,
        });
      }
    }
  }

  /**
   * Test if critical selectors are working
   */
  private testCriticalSelectors(): boolean {
    for (const selectorName of this.criticalSelectors) {
      const selectors = (this.selectors as any)[selectorName].split(', ');
      let found = false;
      for (const selector of selectors) {
        if (document.querySelector(selector.trim())) {
          found = true;
          break;
        }
      }
      if (!found) {
        return false;
      }
    }
    return true;
  }

  // ============================================================================
  // NEW: UI Change Detection
  // ============================================================================

  /**
   * Set up UI change detection to detect major UI structure changes
   */
  private setupUIChangeDetection(): void {
    this.uiChangeObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.removedNodes.length > 5) {
          this.context.logger.debug('Major UI change detected, validating selectors...');
          this.validateSelectors();
        }
      }
    });
    this.uiChangeObserver.observe(document.body, { childList: true, subtree: true });
    this.context.logger.debug('UI change detection set up');
  }

  // ============================================================================
  // Element Finding Strategies (Enhanced)
  // ============================================================================

  /**
   * Find the Run button using multiple strategies for resilience
   */
  private findRunButton(): Element | null {
    const strategies = [
      { name: 'ms-run-button element', selector: 'ms-run-button' },
      { name: 'aria-label=Run', selector: 'button[aria-label="Run"]' },
      { name: 'type=submit with Run text', selector: 'button[type="submit"]' },
      { name: 'jslog attribute', selector: 'button[jslog*="225921"]' },
    ];

    for (const strategy of strategies) {
      const element = document.querySelector(strategy.selector);
      if (element) {
        // For submit button, verify it contains "Run" text
        if (strategy.selector.includes('type="submit"')) {
          const text = element.textContent?.trim().toLowerCase();
          if (text?.includes('run')) {
            this.context.logger.debug(`Found Run button via ${strategy.name}`);
            return element;
          }
        } else {
          this.context.logger.debug(`Found Run button via ${strategy.name}`);
          return element;
        }
      }
    }

    // Strategy 5: Text content search
    const allButtons = Array.from(document.querySelectorAll('button'));
    for (const button of allButtons) {
      const text = button.textContent?.trim();
      if (text && /^Run\b/i.test(text)) {
        this.context.logger.debug('Found Run button via text content match');
        return button;
      }
    }

    this.context.logger.debug('Could not find Run button with any strategy');
    return null;
  }

  /**
   * Find the Add Media button using multiple strategies
   */
  private findAddMediaButton(): Element | null {
    const strategies = [
      { name: 'ms-add-media-button element', selector: 'ms-add-media-button' },
      { name: 'data-test-id', selector: '[data-test-id="add-media-button"]' },
      { name: 'aria-label', selector: 'button[aria-label*="Insert images"], button[aria-label*="add media"]' },
    ];

    for (const strategy of strategies) {
      const element = document.querySelector(strategy.selector);
      if (element) {
        this.context.logger.debug(`Found Add Media button via ${strategy.name}`);
        return element;
      }
    }

    // Strategy 4: Icon search
    const noteAddIcon = document.querySelector('[iconname="note_add"]');
    if (noteAddIcon) {
      const button = noteAddIcon.closest('button');
      if (button) {
        this.context.logger.debug('Found Add Media button via note_add icon');
        return button.closest('ms-add-media-button') || button;
      }
    }

    this.context.logger.debug('Could not find Add Media button with any strategy');
    return null;
  }

  /**
   * Find a suitable container for the MCP button near the input area
   */
  private findButtonContainer(runButton: Element): Element | null {
    let parent = runButton.parentElement;
    while (parent && parent !== document.body) {
      const className = parent.className.toLowerCase();
      if (
        className.includes('button-wrapper') ||
        className.includes('buttons-row') ||
        className.includes('button-row') ||
        className.includes('actions')
      ) {
        this.context.logger.debug(`Found container via parent traversal: ${parent.className}`);
        return parent;
      }
      parent = parent.parentElement;
    }

    const runButtonParent = runButton.parentElement;
    if (runButtonParent) {
      this.context.logger.debug(`Using Run button's parent as container: ${runButtonParent.className}`);
      return runButtonParent;
    }

    return null;
  }

  private findButtonInsertionPoint(): { container: Element; insertAfter: Element | null } | null {
    this.context.logger.debug('Finding button insertion point for MCP popover');

    // PRIMARY STRATEGY: Locate the Run button first
    const runButton = this.findRunButton();
    if (runButton) {
      this.context.logger.debug('Using Run button as anchor for insertion point');

      const container = this.findButtonContainer(runButton);
      if (container) {
        // Try to find Add Media button to insert after it
        const addMediaButton = this.findAddMediaButton();
        if (addMediaButton && container.contains(addMediaButton)) {
          this.context.logger.debug('Inserting MCP button after Add Media button');
          return { container, insertAfter: addMediaButton };
        }

        // If Run button is a custom element, insert before it
        if (runButton.tagName.toLowerCase() === 'ms-run-button') {
          const prevSibling = runButton.previousElementSibling;
          if (prevSibling) {
            this.context.logger.debug('Inserting MCP button before Run button (after previous sibling)');
            return { container, insertAfter: prevSibling };
          }
        }

        // Default: Insert at beginning of container
        this.context.logger.debug('Inserting MCP button at beginning of container');
        return { container, insertAfter: null };
      }
    }

    // FALLBACK strategies
    const fallbacks = [
      { name: 'buttons-row', selector: '.buttons-row' },
      { name: 'prompt-input-wrapper-container', selector: '.prompt-input-wrapper-container' },
      { name: 'prompt-input-wrapper', selector: '.prompt-input-wrapper' },
      { name: 'actions-container', selector: 'footer .actions-container, .actions-container' },
    ];

    for (const fallback of fallbacks) {
      const element = document.querySelector(fallback.selector);
      if (element) {
        this.context.logger.debug(`Found ${fallback.name} (fallback)`);
        const buttonWrappers = element.querySelectorAll('.button-wrapper');
        if (buttonWrappers.length > 0) {
          const lastButtonWrapper = buttonWrappers[buttonWrappers.length - 1];
          return { container: element, insertAfter: lastButtonWrapper };
        }
        return { container: element, insertAfter: null };
      }
    }

    this.context.logger.debug('Could not find suitable insertion point for MCP popover');
    return null;
  }

  // ============================================================================
  // Private helper methods
  // ============================================================================

  private setupUrlTracking(): void {
    if (!this.urlCheckInterval) {
      this.urlCheckInterval = setInterval(() => {
        const currentUrl = window.location.href;
        if (currentUrl !== this.lastUrl) {
          this.context.logger.debug(`URL changed from ${this.lastUrl} to ${currentUrl}`);
          if (this.onPageChanged) {
            this.onPageChanged(currentUrl, this.lastUrl);
          }
          this.lastUrl = currentUrl;
        }
      }, 1000);
    }
  }

  private setupStoreEventListeners(): void {
    if (this.storeEventListenersSetup) {
      this.context.logger.warn(`Store event listeners already set up for instance #${this.instanceId}, skipping`);
      return;
    }

    this.context.logger.debug(`Setting up store event listeners for AI Studio adapter instance #${this.instanceId}`);

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
    if (this.domObserversSetup) {
      this.context.logger.warn(`DOM observers already set up for instance #${this.instanceId}, skipping`);
      return;
    }

    this.context.logger.debug(`Setting up DOM observers for AI Studio adapter instance #${this.instanceId}`);

    this.mutationObserver = new MutationObserver((mutations) => {
      let shouldReinject = false;

      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          if (!document.getElementById('mcp-popover-container')) {
            shouldReinject = true;
          }
        }
      });

      if (shouldReinject) {
        const insertionPoint = this.findButtonInsertionPoint();
        if (insertionPoint) {
          this.context.logger.debug('MCP popover removed, attempting to re-inject');
          this.setupUIIntegration();
        }
      }
    });

    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    this.domObserversSetup = true;
  }

  private setupUIIntegration(): void {
    if (this.uiIntegrationSetup) {
      this.context.logger.debug(
        `UI integration already set up for instance #${this.instanceId}, re-injecting for page changes`,
      );
    } else {
      this.context.logger.debug(`Setting up UI integration for AI Studio adapter instance #${this.instanceId}`);
      this.uiIntegrationSetup = true;
    }

    this.waitForPageReady()
      .then(() => {
        this.injectMCPPopoverWithRetry();
      })
      .catch((error) => {
        this.context.logger.warn('Failed to wait for page ready:', error);
      });
  }

  private async waitForPageReady(): Promise<void> {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 5;

      const checkReady = () => {
        attempts++;
        const insertionPoint = this.findButtonInsertionPoint();
        if (insertionPoint) {
          this.context.logger.debug('Page ready for MCP popover injection');
          resolve();
        } else if (attempts >= maxAttempts) {
          this.context.logger.warn('Page ready check timed out - no insertion point found');
          reject(new Error('No insertion point found after maximum attempts'));
        } else {
          setTimeout(checkReady, 500);
        }
      };

      setTimeout(checkReady, 100);
    });
  }

  private injectMCPPopoverWithRetry(maxRetries: number = 5): void {
    const attemptInjection = (attempt: number) => {
      this.context.logger.debug(`Attempting MCP popover injection (attempt ${attempt}/${maxRetries})`);

      if (document.getElementById('mcp-button-wrapper') || document.getElementById('mcp-popover-container')) {
        this.context.logger.debug('MCP popover already exists');
        return;
      }

      const insertionPoint = this.findButtonInsertionPoint();
      if (insertionPoint) {
        this.injectMCPPopover(insertionPoint);
      } else if (attempt < maxRetries) {
        this.context.logger.debug(
          `Insertion point not found, retrying in 1 second (attempt ${attempt}/${maxRetries})`,
        );
        setTimeout(() => attemptInjection(attempt + 1), 1000);
      } else {
        this.context.logger.warn('Failed to inject MCP popover after maximum retries');
      }
    };

    attemptInjection(1);
  }

  private setupPeriodicPopoverCheck(): void {
    if (!this.popoverCheckInterval) {
      this.popoverCheckInterval = setInterval(() => {
        if (!document.getElementById('mcp-popover-container')) {
          const insertionPoint = this.findButtonInsertionPoint();
          if (insertionPoint) {
            this.context.logger.debug('MCP popover missing, attempting to re-inject');
            this.injectMCPPopoverWithRetry(3);
          }
        }
      }, 5000);
    }
  }

  private cleanupDOMObservers(): void {
    this.context.logger.debug('Cleaning up DOM observers for AI Studio adapter');
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }
  }

  private cleanupUIIntegration(): void {
    this.context.logger.debug('Cleaning up UI integration for AI Studio adapter');

    const buttonWrapper = document.getElementById('mcp-button-wrapper');
    if (buttonWrapper) {
      buttonWrapper.remove();
    }

    const popoverContainer = document.getElementById('mcp-popover-container');
    if (popoverContainer) {
      popoverContainer.remove();
    }

    this.mcpPopoverContainer = null;
  }

  private handleToolExecutionCompleted( any): void {
    this.context.logger.debug('Handling tool execution completion in AI Studio adapter:', data);

    if (!this.shouldHandleEvents()) {
      this.context.logger.debug('AI Studio adapter should not handle events, ignoring tool execution event');
      return;
    }

    const uiState = this.context.stores.ui;
    if (uiState && data.execution) {
      this.context.logger.debug('Tool execution handled with new architecture integration');
    }
  }

  private injectMCPPopover(insertionPoint: { container: Element; insertAfter: Element | null }): void {
    this.context.logger.debug('Injecting MCP popover into AI Studio interface');

    try {
      if (document.getElementById('mcp-button-wrapper') || document.getElementById('mcp-popover-container')) {
        this.context.logger.debug('MCP popover already exists, skipping injection');
        return;
      }

      const buttonWrapper = document.createElement('div');
      buttonWrapper.className = 'button-wrapper';
      buttonWrapper.id = 'mcp-button-wrapper';

      const reactContainer = document.createElement('div');
      reactContainer.id = 'mcp-popover-container';
      reactContainer.style.display = 'contents';

      buttonWrapper.appendChild(reactContainer);

      const { container, insertAfter } = insertionPoint;
      if (insertAfter && insertAfter.parentNode === container) {
        container.insertBefore(buttonWrapper, insertAfter.nextSibling);
        this.context.logger.debug('Inserted MCP button wrapper after specified element');
      } else {
        container.appendChild(buttonWrapper);
        this.context.logger.debug('Appended MCP button wrapper to container element');
      }

      this.mcpPopoverContainer = reactContainer;
      this.renderMCPPopover(reactContainer);

      this.context.logger.debug('MCP popover injected and rendered successfully');
    } catch (error) {
      this.context.logger.error('Failed to inject MCP popover:', error);
    }
  }

  private renderMCPPopover(container: HTMLElement): void {
    this.context.logger.debug('Rendering MCP popover with new architecture integration');

    try {
      import('react')
        .then((React) => {
          import('react-dom/client')
            .then((ReactDOM) => {
              import('../../components/mcpPopover/mcpPopover')
                .then(({ MCPPopover }) => {
                  const stateManager = this.createToggleStateManager();

                  const adapterButtonConfig = {
                    className: 'mcp-aistudio-button-base',
                    contentClassName: 'mcp-aistudio-button-content',
                    textClassName: 'mcp-aistudio-button-text',
                    activeClassName: 'active',
                  };

                  const root = ReactDOM.createRoot(container);
                  root.render(
                    React.createElement(MCPPopover, {
                      toggleStateManager: stateManager,
                      adapterButtonConfig: adapterButtonConfig,
                      adapterName: this.name,
                    }),
                  );

                  this.context.logger.debug('MCP popover rendered successfully with AI Studio styling');
                })
                .catch((error) => {
                  this.context.logger.error('Failed to load MCPPopover component:', error);
                });
            })
            .catch((error) => {
              this.context.logger.error('Failed to load ReactDOM:', error);
            });
        })
        .catch((error) => {
          this.context.logger.error('Failed to load React:', error);
        });
    } catch (error) {
      this.context.logger.error('Failed to render MCP popover:', error);
    }
  }

  private createToggleStateManager() {
    const context = this.context;
    const adapterName = this.name;

    const stateManager = {
      getState: () => {
        try {
          const uiState = context.stores.ui;
          const mcpEnabled = uiState?.mcpEnabled ?? false;
          const autoSubmitEnabled = uiState?.preferences?.autoSubmit ?? false;

          context.logger.debug(`Getting MCP toggle state: mcpEnabled=${mcpEnabled}, autoSubmit=${autoSubmitEnabled}`);

          return {
            mcpEnabled: mcpEnabled,
            autoInsert: autoSubmitEnabled,
            autoSubmit: autoSubmitEnabled,
            autoExecute: false,
          };
        } catch (error) {
          context.logger.error('Error getting toggle state:', error);
          return {
            mcpEnabled: false,
            autoInsert: false,
            autoSubmit: false,
            autoExecute: false,
          };
        }
      },

      setMCPEnabled: (enabled: boolean) => {
        context.logger.debug(`Setting MCP ${enabled ? 'enabled' : 'disabled'} - controlling sidebar visibility via MCP state`);

        try {
          if (context.stores.ui?.setMCPEnabled) {
            context.stores.ui.setMCPEnabled(enabled, 'mcp-popover-toggle');
            context.logger.debug(`MCP state set to: ${enabled} via UI store`);
          } else {
            context.logger.warn('UI store setMCPEnabled method not available');

            if (context.stores.ui?.setSidebarVisibility) {
              context.stores.ui.setSidebarVisibility(enabled, 'mcp-popover-toggle-fallback');
              context.logger.debug(`Sidebar visibility set to: ${enabled} via UI store fallback`);
            }
          }

          const sidebarManager = (window as any).activeSidebarManager;
          if (sidebarManager) {
            if (enabled) {
              context.logger.debug('Showing sidebar via activeSidebarManager');
              sidebarManager.show().catch((error: any) => {
                context.logger.error('Error showing sidebar:', error);
              });
            } else {
              context.logger.debug('Hiding sidebar via activeSidebarManager');
              sidebarManager.hide().catch((error: any) => {
                context.logger.error('Error hiding sidebar:', error);
              });
            }
          } else {
            context.logger.warn('activeSidebarManager not available on window - will rely on UI store only');
          }

          context.logger.debug(
            `MCP toggle completed: MCP ${enabled ? 'enabled' : 'disabled'}, sidebar ${enabled ? 'shown' : 'hidden'}`,
          );
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
          const event = new CustomEvent('mcp:update-toggle-state', {
            detail: { toggleState: currentState },
          });
          popoverContainer.dispatchEvent(event);
        }
      },
    };

    return stateManager;
  }

  public injectMCPPopoverManually(): void {
    this.context.logger.debug('Manual MCP popover injection requested');
    this.injectMCPPopoverWithRetry();
  }

  public isMCPPopoverInjected(): boolean {
    return !!document.getElementById('mcp-button-wrapper') || !!document.getElementById('mcp-popover-container');
  }

  private emitExecutionCompleted(toolName: string, parameters: any, result: any): void {
    this.context.eventBus.emit('tool:execution-completed', {
      execution: {
        id: this.generateCallId(),
        toolName,
        parameters,
        result,
        timestamp: Date.now(),
        status: 'success',
      },
    });
  }

  private emitExecutionFailed(toolName: string, error: string): void {
    this.context.eventBus.emit('tool:execution-failed', {
      toolName,
      error,
      callId: this.generateCallId(),
    });
  }

  private generateCallId(): string {
    return `aistudio-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  private checkAndRestoreSidebar(): void {
    this.context.logger.debug('Checking sidebar state after page navigation');

    try {
      const activeSidebarManager = (window as any).activeSidebarManager;

      if (!activeSidebarManager) {
        this.context.logger.warn('No active sidebar manager found after navigation');
        return;
      }

      this.ensureMCPPopoverConnection();
    } catch (error) {
      this.context.logger.error('Error checking sidebar state after navigation:', error);
    }
  }

  private ensureMCPPopoverConnection(): void {
    this.context.logger.debug('Ensuring MCP popover connection after navigation');

    try {
      if (!this.isMCPPopoverInjected()) {
        this.context.logger.debug('MCP popover missing after navigation, re-injecting');
        this.injectMCPPopoverWithRetry(3);
      } else {
        this.context.logger.debug('MCP popover is still present after navigation');
      }
    } catch (error) {
      this.context.logger.error('Error ensuring MCP popover connection:', error);
    }
  }

  onPageChanged?(url: string, oldUrl?: string): void {
    this.context.logger.debug(`AI Studio page changed: from ${oldUrl || 'N/A'} to ${url}`);

    this.lastUrl = url;
    this.injectAIStudioButtonStyles();

    const stillSupported = this.isSupported();
    if (stillSupported) {
      setTimeout(() => {
        this.setupUIIntegration();
      }, 1000);

      setTimeout(() => {
        this.checkAndRestoreSidebar();
      }, 1500);
    } else {
      this.context.logger.warn('Page no longer supported after navigation');
    }

    this.context.eventBus.emit('app:site-changed', {
      site: url,
      hostname: window.location.hostname,
    });
  }

  onHostChanged?(newHost: string, oldHost?: string): void {
    this.context.logger.debug(`AI Studio host changed: from ${oldHost || 'N/A'} to ${newHost}`);

    const stillSupported = this.isSupported();
    if (!stillSupported) {
      this.context.logger.warn('AI Studio adapter no longer supported on this host/page');
      this.context.eventBus.emit('adapter:deactivated', {
        pluginName: this.name,
        timestamp: Date.now(),
      });
    } else {
      this.setupUIIntegration();
    }
  }

  onToolDetected?(tools: any[]): void {
    this.context.logger.debug(`Tools detected in AI Studio adapter:`, tools);
    tools.forEach((tool) => {
      this.context.stores.tool?.addDetectedTool?.(tool);
    });
  }

  // ============================================================================
  // AI Studio Button Styling
  // ============================================================================

  private getAIStudioButtonStyles(): string {
    return `
.mcp-aistudio-button-base {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  border: none;
  outline: none;
  line-height: inherit;
  user-select: none;
  appearance: none;
  overflow: visible;
  vertical-align: middle;
  background: transparent;
  color: var(--color-on-surface);
  background-color: transparent;
  font-family: 'Google Sans', Roboto, 'Helvetica Neue', Arial, sans-serif;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.0892857143em;
  text-decoration: none;
  text-transform: none;
  padding: 8px 16px;
  min-width: 64px;
  height: 36px;
  border-radius: 18px;
  transition: background-color 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms,
    box-shadow 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms,
    border-color 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms,
    color 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms;
  position: relative;
  cursor: pointer;
  margin: 0 4px;
}
.mcp-aistudio-button-base:hover {
  background-color: var(--color-surface-container);
  color: var(--color-primary);
}
.mcp-aistudio-button-base:focus {
  outline: none;
  box-shadow: 0 0 0 2px var(--color-primary-container);
}
.mcp-aistudio-button-base:active {
  background-color: var(--color-surface-container-high);
  transform: translateY(1px);
}
.mcp-aistudio-button-base.inactive {
  color: var(--color-on-surface-variant);
  background-color: var(--color-run-button-disabled-background-transparent, rgba(226, 226, 229, 0.9));
  border: 1px solid var(--color-outline-variant);
}
.mcp-aistudio-button-base.inactive:hover {
  background-color: var(--color-surface-container);
  color: var(--color-on-surface);
}
.mcp-aistudio-button-base.active {
  background-color: var(--color-primary);
  color: var(--color-on-primary);
}
.mcp-aistudio-button-base.active:hover {
  background-color: var(--color-primary-container);
  color: var(--color-on-primary-container);
}
.mcp-aistudio-button-content {
  display: flex;
  align-items: center;
  gap: 6px;
}
.mcp-aistudio-button-text {
  font-weight: 500;
  font-size: 14px;
}
.button-wrapper .mcp-aistudio-button-base {
  margin: 0;
  height: 40px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}
#mcp-button-wrapper {
  display: flex;
  align-items: center;
}
.mcp-aistudio-button-base::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background-color: var(--color-primary);
  opacity: 0;
  transform: translate(-50%, -50%);
  transition: width 0.6s, height 0.6s, opacity 0.6s;
  pointer-events: none;
}
.mcp-aistudio-button-base:active::after {
  width: 100px;
  height: 100px;
  opacity: 0.1;
  transition: 0s;
}
`;
  }

  private injectAIStudioButtonStyles(): void {
    if (this.adapterStylesInjected) return;

    try {
      const styleId = 'mcp-aistudio-button-styles';
      const existingStyles = document.getElementById(styleId);
      if (existingStyles) existingStyles.remove();

      const styleElement = document.createElement('style');
      styleElement.id = styleId;
      styleElement.textContent = this.getAIStudioButtonStyles();
      document.head.appendChild(styleElement);

      this.adapterStylesInjected = true;
      this.context.logger.debug('AI Studio button styles injected successfully');
    } catch (error) {
      this.context.logger.error('Failed to inject AI Studio button styles:', error);
    }
  }
}

// ============================================================================
// Exported Helper Functions (chatInputHandler)
// ============================================================================

export const findChatInputElement = (): HTMLTextAreaElement | null => {
  const selectors = [
    'textarea.textarea[placeholder="Type something"]',
    'textarea.textarea[aria-label="Type something or pick one from prompt gallery"]',
    'textarea[placeholder="Ask follow-up"]',
    "textarea.textarea[aria-label='Type something or tab to choose an example prompt']",
    "textarea.textarea[aria-label='Start typing a prompt']",
    'textarea[placeholder*="Ask"]',
  ];

  for (const selector of selectors) {
    const chatInput = document.querySelector(selector) as HTMLTextAreaElement;
    if (chatInput) {
      logger.debug(`Found AiStudio input with selector: ${selector}`);
      return chatInput;
    }
  }

  logger.debug('Could not find any AiStudio chat input textarea');
  return null;
};

export const wrapInToolOutput = (content: string): string => {
  return `<tool_output>\n${content}\n</tool_output>`;
};

export const formatAsJson = (data: any): string => {
  return JSON.stringify(data, null, 2);
};

export const insertTextToChatInput = (text: string): boolean => {
  try {
    const chatInput = findChatInputElement();
    if (chatInput) {
      const currentText = chatInput.value;
      const formattedText = currentText ? `${currentText}\n\n${text}` : text;
      chatInput.value = formattedText;

      const inputEvent = new Event('input', { bubbles: true });
      chatInput.dispatchEvent(inputEvent);
      chatInput.focus();

      logger.debug('Appended text to AiStudio chat input');
      return true;
    } else {
      logger.debug('Could not find AiStudio chat input');
      logger.error('Could not find AiStudio chat input textarea');
      return false;
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.debug(`Error inserting text into chat input: ${errorMessage}`);
    logger.error('Error inserting text into chat input:', error);
    return false;
  }
};

export const insertToolResultToChatInput = (result: any): boolean => {
  try {
    if (typeof result !== 'string') {
      result = JSON.stringify(result, null, 2);
      logger.debug('Converted tool result to string format');
    }
    return insertTextToChatInput(result);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.debug(`Error formatting tool result: ${errorMessage}`);
    logger.error('Error formatting tool result:', error);
    return false;
  }
};

export const attachFileToChatInput = async (file: File): Promise<boolean> => {
  try {
    const isFirefox = navigator.userAgent.toLowerCase().includes('firefox');

    if (isFirefox) {
      logger.debug('Firefox detected: Using file input method');
      let fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      if (!fileInput) {
        logger.debug('No file input found, attempting to click Add button to create it');
        const addButton = document.querySelector(
          'button[aria-label*="Insert assets"], button[iconname="add_circle"]',
        ) as HTMLButtonElement;

        if (addButton) {
          addButton.click();
          logger.debug('Clicked Add button, waiting for file input to appear');
          await new Promise((resolve) => setTimeout(resolve, 300));
          fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        }
      }

      if (fileInput) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        fileInput.files = dataTransfer.files;
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
        logger.debug(`File attached via input element (Firefox): ${file.name}`);
        return true;
      }

      logger.debug('Firefox file input method failed: No file input element found');
      return false;
    } else {
      logger.debug('Chrome/Other browser detected: Using drag-and-drop method');
      const chatInput = findChatInputElement();

      if (!chatInput) {
        logger.debug('Could not find AiStudio input element for file attachment');
        return false;
      }

      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);

      const dragOverEvent = new DragEvent('dragover', {
        bubbles: true,
        cancelable: true,
        dataTransfer: dataTransfer,
      });

      const dropEvent = new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        dataTransfer: dataTransfer,
      });

      chatInput.addEventListener('dragover', (e) => e.preventDefault(), { once: true });
      chatInput.dispatchEvent(dragOverEvent);
      chatInput.dispatchEvent(dropEvent);

      try {
        await navigator.clipboard.write([
          new ClipboardItem({
            [file.type]: file,
          }),
        ]);
        chatInput.focus();
        logger.debug('File copied to clipboard, user can now paste manually if needed');
      } catch (clipboardError) {
        logger.debug(`Could not copy to clipboard: ${clipboardError}`);
      }

      logger.debug(`Attached file ${file.name} to AiStudio input (Chrome)`);
      return true;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.debug(`Error attaching file to AiStudio input: ${errorMessage}`);
    logger.error('Error attaching file to AiStudio input:', error);
    return false;
  }
};

export const submitChatInput = (maxWaitTime = 5000): Promise<boolean> => {
  return new Promise((resolve) => {
    try {
      const chatInput = findChatInputElement();

      if (!chatInput) {
        logger.debug('Could not find chat input to submit');
        resolve(false);
        return;
      }

      const findSubmitButton = (): HTMLButtonElement | null => {
        const submitButton =
          document.querySelector('button[aria-label="Submit"]') ||
          document.querySelector('button[aria-label="Send"]') ||
          document.querySelector('button[type="submit"]') ||
          chatInput.parentElement?.querySelector('button') ||
          document.querySelector('button svg[stroke="currentColor"]')?.closest('button');

        return submitButton as HTMLButtonElement | null;
      };

      const submitButton = findSubmitButton();

      if (submitButton) {
        logger.debug(`Found submit button (${submitButton.getAttribute('aria-label') || 'unknown'})`);

        const tryClickingButton = () => {
          const button = findSubmitButton();
          if (!button) {
            logger.debug('Submit button no longer found');
            resolve(false);
            return;
          }

          const isDisabled =
            button.disabled ||
            button.getAttribute('disabled') !== null ||
            button.getAttribute('aria-disabled') === 'true' ||
            button.classList.contains('disabled');

          if (!isDisabled) {
            logger.debug('Submit button is enabled, clicking it');
            button.click();
            resolve(true);
          } else {
            logger.debug('Submit button is disabled, waiting...');
          }
        };

        let elapsedTime = 0;
        const checkInterval = 200;

        const intervalId = setInterval(() => {
          elapsedTime += checkInterval;
          tryClickingButton();

          if (elapsedTime >= maxWaitTime) {
            clearInterval(intervalId);
            logger.debug(`Button remained disabled for ${maxWaitTime}ms, trying alternative methods`);

            chatInput.focus();

            const keydownEvent = new KeyboardEvent('keydown', {
              key: 'Enter',
              code: 'Enter',
              keyCode: 13,
              which: 13,
              bubbles: true,
              cancelable: true,
            });

            const keypressEvent = new KeyboardEvent('keypress', {
              key: 'Enter',
              code: 'Enter',
              keyCode: 13,
              which: 13,
              bubbles: true,
              cancelable: true,
            });

            const keyupEvent = new KeyboardEvent('keyup', {
              key: 'Enter',
              code: 'Enter',
              keyCode: 13,
              which: 13,
              bubbles: true,
              cancelable: true,
            });

            chatInput.dispatchEvent(keydownEvent);
            chatInput.dispatchEvent(keypressEvent);
            chatInput.dispatchEvent(keyupEvent);

            const form = chatInput.closest('form');
            if (form) {
              logger.debug('Found form element, submitting it');
              form.dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }));
            }

            logger.debug('Attempted all fallback methods to submit chat input');
            resolve(true);
          }
        }, checkInterval);

        tryClickingButton();

        if (submitButton && !submitButton.disabled) {
          clearInterval(intervalId);
        }
      } else {
        logger.debug('No submit button found, trying alternative methods');

        chatInput.focus();

        const keydownEvent = new KeyboardEvent('keydown', {
          key: 'Enter',
          code: 'Enter',
          keyCode: 13,
          which: 13,
          bubbles: true,
          cancelable: true,
        });

        const keypressEvent = new KeyboardEvent('keypress', {
          key: 'Enter',
          code: 'Enter',
          keyCode: 13,
          which: 13,
          bubbles: true,
          cancelable: true,
        });

        const keyupEvent = new KeyboardEvent('keyup', {
          key: 'Enter',
          code: 'Enter',
          keyCode: 13,
          which: 13,
          bubbles: true,
          cancelable: true,
        });

        chatInput.dispatchEvent(keydownEvent);
        chatInput.dispatchEvent(keypressEvent);
        chatInput.dispatchEvent(keyupEvent);

        const form = chatInput.closest('form');
        if (form) {
          logger.debug('Found form element, submitting it');
          form.dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }));
        }

        logger.debug('Attempted all methods to submit chat input');
        resolve(true);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.debug(`Error submitting chat input: ${errorMessage}`);
      logger.error('Error submitting chat input:', error);
      resolve(false);
    }
  });
};