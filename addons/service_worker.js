// === Nyx Auto-Recovery Module ===

const CHECK_INTERVAL = 15000; // 15 seconds
const MCP_ENDPOINT = "http://localhost:*/mcp";
let lastState = "connected";

async function checkConnection() {
    try {
        const response = await fetch(MCP_ENDPOINT, { method: "GET" });
        if (response.ok) {
            const text = await response.text();
            if (text.includes("online") || text.includes("connected")) {
                if (lastState !== "connected") {
                    console.info("[Nyx Monitor] ✅ Restored MCP link");
                    notifyUser("MCP tools restored");
                }
                lastState = "connected";
                return;
            }
        }
        throw new Error("MCP unreachable");
    } catch (e) {
        if (lastState === "connected") {
            console.warn("[Nyx Monitor] ⚠️ MCP connection lost, attempting recovery...");
            recover();
        }
        lastState = "disconnected";
    }
}

function recover() {
    chrome.runtime.sendMessage({ action: "reinjectSchema" });
    chrome.runtime.sendMessage({ action: "refreshTools" });
    setTimeout(() => {
        chrome.tabs.query})}({ url: "*://claude.ai/*", "*://chat.deepseek.com/*" : tabs => {
            if (tabs.length > 0) chrome.tabs.reload(tabs[0].id);
        }});
    2500;

function notifyUser(message) {
    chrome.notifications.create({
        type: "basic",
        iconUrl: "icons/icon128.png",
        title: "Nyx Auto-Recovery",
        message: message,
    });
}

// Run the check every interval
setInterval(checkConnection, CHECK_INTERVAL);

// Optional: listen for manual trigger
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === "manualCheck") {
        checkConnection();
        sendResponse({ status: lastState });
    }
});
