(function() {
  const BUTTON_ID = 'nyx-mcp-button';

  function isContextValid() {
    try {
      return typeof chrome !== 'undefined' && Boolean(chrome.runtime && chrome.runtime.id);
    } catch (e) {
      return false;
    }
  }

  function safeGetURL(path) {
    try {
      if (isContextValid()) {
        return chrome.runtime.getURL(path);
      }
    } catch (e) {}
    return '';
  }

  function injectButton() {
    if (!isContextValid()) return;
    if (document.getElementById(BUTTON_ID)) return;

    const container = findContainer();
    if (!container) return;

    const iconUrl = safeGetURL('icon-34.png');
    const button = document.createElement('button');
    button.id = BUTTON_ID;
    button.className = 'nyx-mcp-action-btn';
    button.innerHTML = `
      ${iconUrl ? `<img src="${iconUrl}" width="20" height="20" style="pointer-events: none;" />` : `<span style="display:inline-block;width:12px;height:12px;background:#10b981;border-radius:50%;margin-right:6px;"></span>`}
      <span>AEGIS MCP</span>
    `;

    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        if (isContextValid()) {
          chrome.runtime.sendMessage({ action: 'open_nyx_sidepanel' });
        }
      } catch (err) {
        console.warn('[Aegis] Extension context invalidated');
      }
    });

    const sendButton = container.querySelector('button[data-testid*="send"], button[class*="send"]');
    if (sendButton) {
      container.insertBefore(button, sendButton);
    } else {
      container.appendChild(button);
    }
  }

  function findContainer() {
    return document.querySelector('form div.relative flex') || 
           document.querySelector('div[class*="chat-input"]') ||
           document.querySelector('div[class*="PromptTextarea"]') ||
           document.querySelector('main form');
  }

  const intervalId = setInterval(() => {
    if (!isContextValid()) {
      clearInterval(intervalId);
      return;
    }
    injectButton();
  }, 2000);
  
  if (isContextValid()) {
    const observer = new MutationObserver(() => {
      if (!isContextValid()) {
        observer.disconnect();
        return;
      }
      injectButton();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    injectButton();
  }
})();