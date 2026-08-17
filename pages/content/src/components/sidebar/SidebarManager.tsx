import type React from 'react';
import type { SiteType } from './base/BaseSidebarManager';
import { BaseSidebarManager } from './base/BaseSidebarManager';
import { logMessage } from '@src/utils/helpers';
import IdentitySidebar from './IdentitySidebar';
import MobileSidebar from './MobileSidebar';
import type { UserPreferences } from '@src/types/stores';
import { useUIStore } from '@src/stores/ui.store';

// Helper to detect mobile device
function isMobileDevice(): boolean {
  const userAgent = navigator.userAgent;
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
  const isSmallScreen = window.innerWidth < 768;
  const hasTouchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  return mobileRegex.test(userAgent) || (isSmallScreen && hasTouchSupport);
}

// Helper function to get preferences from Zustand store
const getZustandPreferences = (): UserPreferences => {
  try {
    const zustandState = JSON.parse(localStorage.getItem('mcp-super-assistant-ui-store') || '{}');
    if (zustandState.state && zustandState.state.preferences) {
      return zustandState.state.preferences;
    }
  } catch (error) {
    logMessage(`[SidebarManager] Error reading Zustand store: ${error}`);
  }
  
  return {
    autoSubmit: false,
    autoInsert: false,
    autoExecute: false,
    autoInsertDelay: 500,
    autoSubmitDelay: 1000,
    autoExecuteDelay: 500,
    notifications: true,
    theme: 'system',
    language: navigator.language || 'en-US',
    isPushMode: false,
    sidebarWidth: 400,
    isMinimized: false,
    customInstructions: '',
    customInstructionsEnabled: false,
  };
};

// Declare a global Window interface extension
declare global {
  interface Window {
    activeSidebarManager?: SidebarManager;
  }
}

/**
 * SidebarManager - Aegis Identity Hub version
 * Uses IdentitySidebar as the main UI component
 */
export class SidebarManager extends BaseSidebarManager {
  private static perplexityInstance: SidebarManager | null = null;
  private static chatgptInstance: SidebarManager | null = null;
  private static grokInstance: SidebarManager | null = null;
  private static geminiInstance: SidebarManager | null = null;
  private static aistudioInstance: SidebarManager | null = null;
  private static openrouterInstance: SidebarManager | null = null;
  private static deepseekInstance: SidebarManager | null = null;
  private static kagiInstance: SidebarManager | null = null;
  private static t3chatInstance: SidebarManager | null = null;
  private lastToolOutputsHash: string = '';
  private lastMcpToolsHash: string = '';
  private isFirstLoad: boolean = true;
  private isRendering: boolean = false;
  private lastRenderTime: number = 0;
  private isInitializing: boolean = false;
  private initializationTimeout: NodeJS.Timeout | null = null;

  private constructor(siteType: SiteType) {
    super(siteType);
    window.activeSidebarManager = this;
  }

  public static getInstance(siteType: SiteType): SidebarManager {
    switch (siteType) {
      case 'perplexity':
        if (!SidebarManager.perplexityInstance) {
          SidebarManager.perplexityInstance = new SidebarManager(siteType);
        }
        return SidebarManager.perplexityInstance;
      case 'aistudio':
        if (!SidebarManager.aistudioInstance) {
          SidebarManager.aistudioInstance = new SidebarManager(siteType);
        }
        return SidebarManager.aistudioInstance;
      case 'chatgpt':
        if (!SidebarManager.chatgptInstance) {
          SidebarManager.chatgptInstance = new SidebarManager(siteType);
        }
        return SidebarManager.chatgptInstance;
      case 'grok':
        if (!SidebarManager.grokInstance) {
          SidebarManager.grokInstance = new SidebarManager(siteType);
        }
        return SidebarManager.grokInstance;
      case 'gemini':
        if (!SidebarManager.geminiInstance) {
          SidebarManager.geminiInstance = new SidebarManager(siteType);
        }
        return SidebarManager.geminiInstance;
      case 'openrouter':
        if (!SidebarManager.openrouterInstance) {
          SidebarManager.openrouterInstance = new SidebarManager(siteType);
        }
        return SidebarManager.openrouterInstance;
      case 'deepseek':
        if (!SidebarManager.deepseekInstance) {
          SidebarManager.deepseekInstance = new SidebarManager(siteType);
        }
        return SidebarManager.deepseekInstance;
      case 'kagi':
        if (!SidebarManager.kagiInstance) {
          SidebarManager.kagiInstance = new SidebarManager(siteType);
        }
        return SidebarManager.kagiInstance;
      case 't3chat':
        if (!SidebarManager.t3chatInstance) {
          SidebarManager.t3chatInstance = new SidebarManager(siteType);
        }
        return SidebarManager.t3chatInstance;
      default:
        logMessage(`Creating new SidebarManager for unknown site type: ${siteType}`);
        return new SidebarManager(siteType);
    }
  }

  public async show(syncState: boolean = true): Promise<void> {
    if (!window.activeSidebarManager || window.activeSidebarManager !== this) {
      logMessage('[SidebarManager] Ensuring window.activeSidebarManager reference is set during show()');
      window.activeSidebarManager = this;
    }

    try {
      const userPreferences = getZustandPreferences();
      await this.initialize();
      if (this.shadowHost) {
        const wasMinimized = userPreferences.isMinimized ?? false;
        this.shadowHost.setAttribute('data-initial-minimized', wasMinimized ? 'true' : 'false');
      }
      if (syncState) {
        this.syncZustandVisibilityState(true);
      }
    } catch (error) {
      logMessage(`[SidebarManager] Error loading Zustand preferences in show(): ${error}`);
    }
    return super.show();
  }

  /**
   * Create sidebar content - NOW USING IdentitySidebar
   */
  protected createSidebarContent(): React.ReactNode {
    const userPreferences = getZustandPreferences();
    const isMobile = isMobileDevice();
    logMessage(`[SidebarManager] Creating IdentitySidebar content (mobile: ${isMobile})`);

    if (isMobile) {
      logMessage('[SidebarManager] Using MobileSidebar for mobile device');
      return <MobileSidebar initialPreferences={userPreferences} />;
    }

    // Use IdentitySidebar as the main UI
    return <IdentitySidebar initialPreferences={userPreferences} />;
  }

  public showWithToolOutputs(): void {
    if (!window.activeSidebarManager || window.activeSidebarManager !== this) {
      logMessage('[SidebarManager] Ensuring window.activeSidebarManager reference is set in showWithToolOutputs()');
      window.activeSidebarManager = this;
    }

    if (this.isInitializing) {
      logMessage('[SidebarManager] Already initializing, skipping duplicate call');
      return;
    }

    if (this.initializationTimeout) {
      clearTimeout(this.initializationTimeout);
      this.initializationTimeout = null;
    }

    this.isInitializing = true;
    logMessage('[SidebarManager] Scheduling sidebar initialization with 500ms delay');

    this.initializationTimeout = setTimeout(async () => {
      try {
        logMessage('[SidebarManager] Starting delayed sidebar initialization');

        if (!window.activeSidebarManager || window.activeSidebarManager !== this) {
          logMessage('[SidebarManager] Re-setting window.activeSidebarManager reference after delay');
          window.activeSidebarManager = this;
        }

        const zustandState = JSON.parse(localStorage.getItem('mcp-super-assistant-ui-store') || '{}');
        const mcpEnabled = zustandState.state?.mcpEnabled ?? true;
        const sidebarState = zustandState.state?.sidebar;
        const lastVisibleState = sidebarState && typeof sidebarState.isVisible === 'boolean'
          ? sidebarState.isVisible
          : true;

        logMessage(`[SidebarManager] MCP enabled: ${mcpEnabled}, Last visibility state: ${lastVisibleState}`);

        if (!mcpEnabled) {
          logMessage('[SidebarManager] MCP is disabled, skipping sidebar initialization');
          return;
        }

        logMessage('[SidebarManager] MCP is enabled, initializing IdentitySidebar...');
        await this.initializeCollapsedStateWithErrorHandling();

        if (!lastVisibleState) {
          logMessage('[SidebarManager] Hiding sidebar UI (MCP still active in background)');
          if (this.shadowHost) {
            this.shadowHost.style.display = 'none';
            this.shadowHost.style.opacity = '0';
            this._isVisible = false;
          }
        } else {
          logMessage('[SidebarManager] Sidebar shown successfully');
        }
      } catch (error) {
        logMessage(`[SidebarManager] Error during initialization: ${error}`);
        await this.fallbackInitialization();
      } finally {
        this.isInitializing = false;
        this.isFirstLoad = false;
        this.initializationTimeout = null;
      }
    }, 500);
  }

  public getIsInitialized(): boolean {
    return !this.isFirstLoad;
  }

  private async initializeCollapsedState(): Promise<void> {
    this.isFirstLoad = false;

    if (!window.activeSidebarManager || window.activeSidebarManager !== this) {
      logMessage('[SidebarManager] Ensuring window.activeSidebarManager reference is set in initializeCollapsedState()');
      window.activeSidebarManager = this;
    }

    await this.initialize();

    try {
      const preferences = getZustandPreferences();
      const wasMinimized = preferences.isMinimized ?? false;
      const isPushMode = preferences.isPushMode ?? false;
      const sidebarWidth = preferences.sidebarWidth || 400;

      if (this.shadowHost) {
        if (wasMinimized) {
          this.shadowHost.setAttribute('data-initial-minimized', 'true');
          this.shadowHost.style.width = '56px';
        } else {
          this.shadowHost.setAttribute('data-initial-minimized', 'false');
        }

        this.shadowHost.style.display = 'block';
        this.shadowHost.style.opacity = '1';
        this.shadowHost.classList.add('initialized');
      }
      this._isVisible = true;

      if (isPushMode) {
        const initialWidth = wasMinimized ? 56 : sidebarWidth;
        this.setPushContentMode(true, initialWidth, wasMinimized);
        this.verifyAndRetryPushMode(initialWidth, wasMinimized);
      }

      setTimeout(() => {
        if (!window.activeSidebarManager || window.activeSidebarManager !== this) {
          logMessage('[SidebarManager] Final check: Re-setting window.activeSidebarManager reference before React render');
          window.activeSidebarManager = this;
        }
        logMessage('[SidebarManager] Rendering IdentitySidebar component');
        this.render();
        logMessage('[SidebarManager] IdentitySidebar fully initialized');
      }, 20);
    } catch (error) {
      logMessage(`[SidebarManager] Error during initialization: ${error}`);
      await this.initialize();
      if (this.shadowHost) {
        this.shadowHost.setAttribute('data-initial-minimized', 'false');
        this.shadowHost.style.display = 'block';
        this.shadowHost.style.opacity = '1';
        this.shadowHost.classList.add('initialized');
        this._isVisible = true;
        this.render();
        logMessage('[SidebarManager] Fallback initialization completed');
      }
    }
  }

  private async initializeCollapsedStateWithErrorHandling(): Promise<void> {
    try {
      await this.initializeCollapsedState();
    } catch (error) {
      logMessage(`[SidebarManager] Error in initializeCollapsedState: ${error}`);
      await this.fallbackInitialization();
    }
  }

  private async safeInitialize(): Promise<void> {
    try {
      await this.initialize();
    } catch (error) {
      logMessage(`[SidebarManager] Error in safeInitialize: ${error}`);
    }
  }

  private async fallbackInitialization(): Promise<void> {
    try {
      await this.initialize();
      if (this.shadowHost) {
        this.shadowHost.setAttribute('data-initial-minimized', 'false');
        this.shadowHost.style.display = 'block';
        this.shadowHost.style.opacity = '1';
        this.shadowHost.classList.add('initialized');
        this._isVisible = true;
        setTimeout(() => {
          try {
            this.render();
            logMessage('[SidebarManager] Fallback initialization completed');
          } catch (renderError) {
            logMessage(`[SidebarManager] Fallback render failed: ${renderError}`);
          }
        }, 50);
      }
    } catch (error) {
      logMessage(`[SidebarManager] Even fallback initialization failed: ${error}`);
    }
  }

  private verifyAndRetryPushMode(width: number, isCollapsed: boolean): void {
    const hasClass = document.documentElement.classList.contains('push-mode-enabled');
    const hasMargin = document.documentElement.style.marginRight !== '';
    const hasWidth = document.documentElement.style.width !== '';
    const isPushModeApplied = hasClass && hasMargin && hasWidth;
    const computedStyle = window.getComputedStyle(document.documentElement);
    const computedMarginRight = computedStyle.marginRight;
    const expectedMargin = `${width}px`;
    const marginApplied = computedMarginRight === expectedMargin;

    if (!isPushModeApplied || !marginApplied) {
      logMessage(`[SidebarManager] Push mode verification failed. Applied: ${isPushModeApplied}, Margin correct: ${marginApplied}`);
      if (!marginApplied) {
        logMessage('[SidebarManager] Falling back to transform-based push mode');
        document.documentElement.classList.add('push-mode-transform');
        document.documentElement.style.setProperty('transform', `translateX(-${width}px)`, 'important');
      }
      setTimeout(() => {
        this.setPushContentMode(true, width, isCollapsed);
        setTimeout(() => {
          const retryHasClass = document.documentElement.classList.contains('push-mode-enabled');
          const retryHasMargin = document.documentElement.style.marginRight !== '';
          const retryHasWidth = document.documentElement.style.width !== '';
          const retryComputedStyle = window.getComputedStyle(document.documentElement);
          const retryMarginApplied = retryComputedStyle.marginRight === expectedMargin || 
                                    retryComputedStyle.transform.includes('translateX');
          if (retryHasClass && (retryHasMargin || retryMarginApplied)) {
            logMessage('[SidebarManager] Push mode successfully applied after retry');
          } else {
            logMessage('[SidebarManager] Push mode still failed after retry');
          }
        }, 100);
      }, 50);
    } else {
      logMessage('[SidebarManager] Push mode verification successful');
    }
  }

  public refreshContent(): void {
    logMessage('[SidebarManager] Content refresh requested - relying on React state updates');
    if (this.shadowHost) {
      const refreshEvent = new CustomEvent('mcpSidebarRefresh', {
        detail: { timestamp: Date.now() },
      });
      this.shadowHost.dispatchEvent(refreshEvent);
    }
  }

  protected render(): void {
    const now = Date.now();
    if (this.isRendering) {
      logMessage('[SidebarManager] BLOCKED: Render already in progress');
      return;
    }
    if (now - this.lastRenderTime < 100) {
      logMessage('[SidebarManager] BLOCKED: Render throttled');
      return;
    }
    this.isRendering = true;
    this.lastRenderTime = now;
    try {
      logMessage('[SidebarManager] Starting protected render');
      super.render();
      logMessage('[SidebarManager] Protected render completed successfully');
    } catch (error) {
      logMessage(`[SidebarManager] Error in protected render: ${error}`);
    } finally {
      setTimeout(() => { this.isRendering = false; }, 50);
    }
  }

  private syncZustandVisibilityState(isVisible: boolean): void {
    try {
      const store = useUIStore.getState();
      store.setSidebarVisibility(isVisible, 'sidebar-manager-sync');
      logMessage(`[SidebarManager] Synced Zustand visibility state to: ${isVisible}`);
    } catch (error) {
      try {
        const zustandState = JSON.parse(localStorage.getItem('mcp-super-assistant-ui-store') || '{}');
        if (zustandState.state && zustandState.state.sidebar) {
          zustandState.state.sidebar.isVisible = isVisible;
          localStorage.setItem('mcp-super-assistant-ui-store', JSON.stringify(zustandState));
        }
      } catch (fallbackError) {
        logMessage(`[SidebarManager] Fallback sync failed: ${fallbackError}`);
      }
    }
  }

  public destroy(): void {
    if (window.activeSidebarManager === this) {
      window.activeSidebarManager = undefined;
    }
    switch (this.siteType) {
      case 'perplexity': if (SidebarManager.perplexityInstance === this) SidebarManager.perplexityInstance = null; break;
      case 'chatgpt': if (SidebarManager.chatgptInstance === this) SidebarManager.chatgptInstance = null; break;
      case 'grok': if (SidebarManager.grokInstance === this) SidebarManager.grokInstance = null; break;
      case 'gemini': if (SidebarManager.geminiInstance === this) SidebarManager.geminiInstance = null; break;
      case 'aistudio': if (SidebarManager.aistudioInstance === this) SidebarManager.aistudioInstance = null; break;
      case 'openrouter': if (SidebarManager.openrouterInstance === this) SidebarManager.openrouterInstance = null; break;
      case 'deepseek': if (SidebarManager.deepseekInstance === this) SidebarManager.deepseekInstance = null; break;
      case 'kagi': if (SidebarManager.kagiInstance === this) SidebarManager.kagiInstance = null; break;
      case 't3chat': if (SidebarManager.t3chatInstance === this) SidebarManager.t3chatInstance = null; break;
    }
    logMessage(`[SidebarManager] Destroyed sidebar manager for site type: ${this.siteType}`);
    super.destroy();
  }

  private isNavigationEvent(): boolean {
    return window.location.hostname === 'gemini.google.com' && 
           window.location.href.includes('/app');
  }

  public safeDestroy(): void {
    if (this.isNavigationEvent()) {
      logMessage(`[SidebarManager] Skipping destroy during navigation for ${this.siteType}`);
      return;
    }
    logMessage(`[SidebarManager] Performing actual destroy for ${this.siteType}`);
    this.destroy();
  }

  public async hide(): Promise<void> {
    this.syncZustandVisibilityState(false);
    return super.hide();
  }
}