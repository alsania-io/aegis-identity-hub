import { BaseAdapterPlugin } from './base.adapter';
import type { AdapterCapability, PluginContext } from '../plugin-types';
import { createLogger } from '@extension/shared/lib/logger';

const logger = createLogger('KagiAdapter');

export class KagiAdapter extends BaseAdapterPlugin {
  readonly name = 'KagiAdapter';
  readonly version = '2.0.0';
  readonly hostnames = ['kagi.com', 'www.kagi.com'];
  readonly capabilities: AdapterCapability[] = [
    'text-insertion',
    'form-submission',
    'file-attachment',
    'dom-manipulation'
  ];

  private urlCheckInterval: number | null = null;
  private lastUrl: string = '';

  async initialize(context: PluginContext): Promise<void> {
    await super.initialize(context);
    this.lastUrl = window.location.href;
    logger.debug('KagiAdapter initialized');
  }

  async activate(): Promise<void> {
    await super.activate();
    this.startUrlMonitoring();
    logger.info('KagiAdapter activated');
  }

  async deactivate(): Promise<void> {
    await super.deactivate();
    this.stopUrlMonitoring();
    logger.info('KagiAdapter deactivated');
  }

  async cleanup(): Promise<void> {
    this.stopUrlMonitoring();
    await super.cleanup();
    logger.debug('KagiAdapter cleaned up');
  }

  private startUrlMonitoring(): void {
    this.urlCheckInterval = window.setInterval(() => {
      const currentUrl = window.location.href;
      if (currentUrl !== this.lastUrl) {
        const oldUrl = this.lastUrl;
        this.lastUrl = currentUrl;
        this.onPageChanged?.(currentUrl, oldUrl);
      }
    }, 1000);
  }

  private stopUrlMonitoring(): void {
    if (this.urlCheckInterval !== null) {
      clearInterval(this.urlCheckInterval);
      this.urlCheckInterval = null;
    }
  }

  async insertText(text: string, options?: { targetElement?: HTMLElement }): Promise<boolean> {
    try {
      const targetElement = options?.targetElement || this.findChatInput();
      
      if (!targetElement) {
        logger.warn('No suitable input element found');
        return false;
      }

      if (targetElement instanceof HTMLTextAreaElement || targetElement instanceof HTMLInputElement) {
        targetElement.value = text;
        targetElement.dispatchEvent(new Event('input', { bubbles: true }));
        targetElement.dispatchEvent(new Event('change', { bubbles: true }));
      } else if (targetElement.isContentEditable) {
        targetElement.textContent = text;
        targetElement.dispatchEvent(new Event('input', { bubbles: true }));
      }

      targetElement.focus();
      this.context.eventBus.emit('tool:execution-completed', {
        toolName: `${this.name}.insertText`,
        input: { text },
        result: { success: true },
        timestamp: Date.now()
      });
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Error inserting text: ${errorMessage}`);
      this.context.eventBus.emit('tool:execution-failed', {
        toolName: `${this.name}.insertText`,
        error: errorMessage,
        timestamp: Date.now()
      });
      return false;
    }
  }

  async submitForm(options?: { formElement?: HTMLFormElement }): Promise<boolean> {
    try {
      const submitButton = this.findSubmitButton();
      
      if (!submitButton) {
        logger.warn('No submit button found');
        return false;
      }

      submitButton.click();
      this.context.eventBus.emit('tool:execution-completed', {
        toolName: `${this.name}.submitForm`,
        input: {},
        result: { success: true },
        timestamp: Date.now()
      });
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Error submitting form: ${errorMessage}`);
      this.context.eventBus.emit('tool:execution-failed', {
        toolName: `${this.name}.submitForm`,
        error: errorMessage,
        timestamp: Date.now()
      });
      return false;
    }
  }

  async attachFile(file: File, options?: { inputElement?: HTMLInputElement }): Promise<boolean> {
    try {
      const fileInput = options?.inputElement || this.findFileInput();
      
      if (!fileInput) {
        logger.warn('No file input found');
        return false;
      }

      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      fileInput.files = dataTransfer.files;
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));

      this.context.eventBus.emit('tool:execution-completed', {
        toolName: `${this.name}.attachFile`,
        input: { fileName: file.name, fileSize: file.size },
        result: { success: true },
        timestamp: Date.now()
      });
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Error attaching file: ${errorMessage}`);
      this.context.eventBus.emit('tool:execution-failed', {
        toolName: `${this.name}.attachFile`,
        error: errorMessage,
        timestamp: Date.now()
      });
      return false;
    }
  }

  isSupported(): boolean {
    return this.hostnames.some(hostname => 
      window.location.hostname.includes(hostname as string)
    );
  }

  private findChatInput(): HTMLElement | null {
    const selectors = [
      'textarea[placeholder*="Ask"]',
      'textarea[placeholder*="question"]',
      'textarea[name="q"]',
      'textarea.chat-input',
      'div[contenteditable="true"]',
      'textarea',
      'input[type="text"]'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector) as HTMLElement;
      if (element && this.isVisible(element)) {
        return element;
      }
    }

    return null;
  }

  private findSubmitButton(): HTMLButtonElement | null {
    const selectors = [
      'button[type="submit"]',
      'button[aria-label*="Send"]',
      'button[aria-label*="Submit"]',
      'button.submit-button',
      'button:has(svg)'
    ];

    for (const selector of selectors) {
      const button = document.querySelector(selector) as HTMLButtonElement;
      if (button && this.isVisible(button)) {
        return button;
      }
    }

    return null;
  }

  private findFileInput(): HTMLInputElement | null {
    const selectors = [
      'input[type="file"]',
      'input[accept*="image"]',
      'input.file-input'
    ];

    for (const selector of selectors) {
      const input = document.querySelector(selector) as HTMLInputElement;
      if (input) {
        return input;
      }
    }

    return null;
  }

  private isVisible(element: HTMLElement): boolean {
    return !!(
      element.offsetWidth ||
      element.offsetHeight ||
      element.getClientRects().length
    );
  }
}
