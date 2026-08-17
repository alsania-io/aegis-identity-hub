// Auto-Aegis with robust DOM traversal for send button
class TargetedAutoSendManager {
    constructor() {
        this.isEnabled = true;
        this.monitorInterval = null;
        this.lastContent = '';
        this.debugMode = true;
        this.setupMessageListener();
        this.loadSettings();
        this.log('🎯 Auto-Aegis initialized - PERMANENTLY ENABLED');
    }

    log(message) {
        if (this.debugMode) {
            console.log(`[TargetedAutoSend] ${message}`);
        }
    }

    async loadSettings() {
        this.isEnabled = true;
        this.log('Settings: PERMANENTLY ENABLED');
        this.startMonitoring();
    }

    setupMessageListener() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            this.log(`Received message: ${request.action}`);
            if (request.action === 'toggleAutoSend') {
                this.toggleMonitoring(true);
                sendResponse({success: true, message: 'Auto-send is permanently enabled'});
            } else if (request.action === 'getStatus') {
                sendResponse({enabled: true, message: 'Permanently enabled'});
            } else if (request.action === 'debugInfo') {
                sendResponse(this.getDebugInfo());
            } else if (request.action === 'testSendButton') {
                this.testSendButton();
                sendResponse({success: true});
            }
            return true;
        });
    }

    toggleMonitoring(enabled) {
        this.isEnabled = true;
        this.startMonitoring();
        this.showStatus('🟢 Auto-Send PERMANENTLY ENABLED', 'success');
    }

    startMonitoring() {
        if (this.monitorInterval) clearInterval(this.monitorInterval);
        this.log('Starting targeted monitoring...');
        this.monitorInterval = setInterval(() => this.checkForFunctionResults(), 2000);
    }

    stopMonitoring() {
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
            this.monitorInterval = null;
            this.log('Monitoring stopped');
        }
    }

    findInput() {
        const inputSelectors = [
            'textarea[placeholder*="Message"]',
            'textarea[spellcheck]',
            'textarea.chat-input',
            '[data-testid="chat-input"] textarea',
            '.chat-input-container textarea',
            'textarea[rows]',
            '[contenteditable="true"]',
            '[role="textbox"]',
            '.ProseMirror'
        ];
        
        for (const selector of inputSelectors) {
            const el = document.querySelector(selector);
            if (el && this.isElementVisible(el)) {
                this.log(`Input found: ${selector}`);
                return el;
            }
        }
        return null;
    }

    findSendButtonNearInput(input) {
        if (!input) return null;
        
        // Walk up the DOM from input to find the toolbar container
        let current = input;
        for (let i = 0; i < 12 && current && current !== document.body; i++) {
            current = current.parentElement;
            if (!current) break;
            
            // Look for buttons in this container
            const candidates = [];
            const buttons = current.querySelectorAll('button, div[role="button"]');
            
            // Include ALL visible buttons (including disabled ones - send button starts disabled)
            for (const btn of buttons) {
                if (this.isElementVisible(btn)) {
                    candidates.push(btn);
                }
            }
            
            // If we found 3-10 candidates, this is likely the toolbar
            if (candidates.length >= 3 && candidates.length <= 10) {
                this.log(`Found toolbar with ${candidates.length} buttons at level ${i}`);
                
                // Log candidates for debugging
                candidates.forEach((btn, idx) => {
                    const aria = btn.getAttribute('aria-label') || '';
                    const title = btn.getAttribute('title') || '';
                    this.log(`  Candidate ${idx}: disabled=${btn.disabled} aria="${aria}" title="${title}" class="${btn.className}"`);
                });
                
                // Priority 1: Button that is disabled (send button often starts disabled when input empty)
                for (const btn of candidates) {
                    const isDisabled = btn.disabled || btn.getAttribute('aria-disabled') === 'true';
                    const aria = (btn.getAttribute('aria-label') || '').toLowerCase();
                    const title = (btn.getAttribute('title') || '').toLowerCase();
                    if (isDisabled && !aria.includes('mcp') && !title.includes('mcp')) {
                        this.log('Send button found via disabled state');
                        return btn;
                    }
                }
                
                // Priority 2: aria-label/title with "send" (exclude MCP)
                for (const btn of candidates) {
                    const aria = (btn.getAttribute('aria-label') || '').toLowerCase();
                    const title = (btn.getAttribute('title') || '').toLowerCase();
                    if ((aria.includes('send') || title.includes('send')) && 
                        !aria.includes('mcp') && !title.includes('mcp')) {
                        this.log('Send button found via send aria/title');
                        return btn;
                    }
                }
                
                // Priority 3: Look for SVG with send/arrow icon (exclude MCP)
                for (const btn of candidates) {
                    const svg = btn.querySelector('svg');
                    if (svg) {
                        const use = svg.querySelector('use');
                        const href = use?.getAttribute('href') || '';
                        const aria = (btn.getAttribute('aria-label') || '').toLowerCase();
                        if ((href.includes('send') || href.includes('arrow')) && !aria.includes('mcp')) {
                            this.log('Send button found via send SVG icon');
                            return btn;
                        }
                    }
                }
                
                // Priority 4: Send is typically the second from right (MCP is rightmost now)
                // Get positions to find the two rightmost buttons
                const withPos = candidates.map(btn => ({
                    btn: btn,
                    right: btn.getBoundingClientRect().right
                }));
                withPos.sort((a, b) => b.right - a.right);
                
                // Exclude MCP buttons from being selected as send, find first non-MCP from rightmost
                let sendCandidate = null;
                for (let idx = 0; idx < withPos.length; idx++) {
                    const candidate = withPos[idx].btn;
                    const aria = (candidate.getAttribute('aria-label') || '').toLowerCase();
                    const title = (candidate.getAttribute('title') || '').toLowerCase();
                    const className = candidate.className.toLowerCase();
                    
                    // Skip if this looks like MCP button
                    if (aria.includes('mcp') || title.includes('mcp') || className.includes('mcp')) {
                        this.log(`Skipping MCP button at position ${idx}`);
                        continue;
                    }
                    
                    sendCandidate = candidate;
                    this.log(`Send button selected as candidate at position ${idx} (${withPos[idx].right}px from right)`);
                    break;
                }
                
                if (sendCandidate) {
                    return sendCandidate;
                }
            }
        }
        
        return null;
    }

    checkForFunctionResults() {
        try {
            const input = this.findInput();
            if (!input) {
                return;
            }

            const currentContent = this.getInputContent(input);
            const hasFunctionResults = this.detectFunctionResults(currentContent);
            const contentChanged = currentContent !== this.lastContent;

            if (contentChanged && hasFunctionResults) {
                this.log(`🚀 Function results detected! Content length: ${currentContent.length}`);
                
                // Wait a bit for the UI to settle, then find and click send
                setTimeout(() => {
                    const sendBtn = this.findSendButtonNearInput(input);
                    if (sendBtn && this.isSendButtonReady(sendBtn)) {
                        this.log('Clicking send button...');
                        this.clickSendButton(sendBtn);
                    } else {
                        this.log('Send button not ready');
                    }
                }, 500);
                
                this.lastContent = currentContent;
            }
        } catch (error) {
            this.log('Error in checkForFunctionResults: ' + error);
        }
    }

    getInputContent(input) {
        return input.value || input.textContent || '';
    }

    detectFunctionResults(content) {
        const indicators = ['function_result', 'Function Result', '<function_result', '```jsonl', '{"type": "function_call', 'call_id', 'function_call_start', 'function_call_end'];
        return indicators.some(ind => content.includes(ind));
    }

    isElementVisible(element) {
        if (!element) return false;
        const rect = element.getBoundingClientRect();
        return element.offsetParent !== null && rect.width > 0 && rect.height > 0;
    }

    isSendButtonReady(button) {
        if (!button || !this.isElementVisible(button)) return false;
        const isDisabled = button.disabled || button.getAttribute('aria-disabled') === 'true' || button.classList.contains('disabled');
        const computedStyle = window.getComputedStyle(button);
        const isVisible = computedStyle.opacity !== '0' && computedStyle.pointerEvents !== 'none';
        return !isDisabled && isVisible;
    }

    clickSendButton(button) {
        try {
            this.log('Clicking send button...');
            button.click();
            button.dispatchEvent(new MouseEvent('click', {bubbles: true}));
            this.log('✅ Send button clicked!');
            this.showStatus('✅ Sent!', 'success');
        } catch (error) {
            this.log('❌ Click failed: ' + error);
        }
    }

    testSendButton() {
        this.log('=== TESTING SEND BUTTON ===');
        const input = this.findInput();
        if (!input) {
            this.log('❌ Input not found');
            return;
        }
        const sendBtn = this.findSendButtonNearInput(input);
        if (sendBtn) {
            this.log(`✅ Send button found!`);
            this.log(`Button: ${sendBtn.className}`);
            this.log(`Aria: ${sendBtn.getAttribute('aria-label')}`);
            this.clickSendButton(sendBtn);
        } else {
            this.log('❌ Send button not found');
        }
    }

    showStatus(message, type = 'info') {
        const statusId = 'targeted-auto-send-status';
        let statusEl = document.getElementById(statusId);
        if (!statusEl) {
            statusEl = document.createElement('div');
            statusEl.id = statusId;
            statusEl.style.cssText = 'position:fixed;top:10px;right:10px;background:#333;color:white;padding:8px 12px;border-radius:6px;font-size:12px;z-index:10000;';
            document.body.appendChild(statusEl);
        }
        statusEl.style.background = type === 'success' ? '#2e7d32' : '#1976d2';
        statusEl.textContent = message;
        setTimeout(() => { if (statusEl.textContent === message) statusEl.remove(); }, 3000);
    }

    getDebugInfo() {
        const input = this.findInput();
        const sendBtn = input ? this.findSendButtonNearInput(input) : null;
        return {
            enabled: this.isEnabled,
            inputFound: !!input,
            sendButtonFound: !!sendBtn,
            url: window.location.href,
            timestamp: new Date().toISOString()
        };
    }
}

const targetedAutoSendManager = new TargetedAutoSendManager();
window.targetedAutoSendManager = targetedAutoSendManager;
console.log('[TargetedAutoSend] Extension loaded with robust DOM traversal!');