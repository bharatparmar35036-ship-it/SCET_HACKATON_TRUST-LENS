/* =====================================================
   TrustLens Live – Service Worker (Manifest V3)
   ===================================================== */

const VERIFY_ENDPOINT = "http://localhost:3000/verify";

/* -----------------------------------------------------
   Create right-click context menu on install
   ----------------------------------------------------- */
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "trustlens-verify",
    title: "Verify with TrustLens",
    contexts: ["selection"]
  });
});

/* -----------------------------------------------------
   Handle messages from content script (text selection)
   ----------------------------------------------------- */
chrome.runtime.onMessage.addListener(async (msg, sender) => {
  if (msg.type !== "TEXT_SELECTED") return;
  if (!msg.text || typeof msg.text !== "string") return;

  await verifyText(msg.text, sender.tab?.id);
});

/* -----------------------------------------------------
   Handle context menu verification
   ----------------------------------------------------- */
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "trustlens-verify") return;
  if (!info.selectionText) return;

  await verifyText(info.selectionText, tab.id);
});

/* -----------------------------------------------------
   Core verification flow
   ----------------------------------------------------- */
async function verifyText(text, tabId) {
  try {
    const res = await fetch(VERIFY_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });

    const result = await res.json();

    // Send result to content script (highlight text)
    if (tabId) {
      chrome.tabs.sendMessage(tabId, {
        type: "SHOW_TRUST_RESULT",
        result
      });
    }

    // Send result to popup UI
    chrome.runtime.sendMessage({
      type: "SHOW_TRUST_RESULT",
      result
    });

    // Save verification history
    saveToHistory(result);

  } catch (err) {
    console.error("TrustLens verification failed:", err);
  }
}

/* -----------------------------------------------------
   Save verification history (chrome.storage)
   ----------------------------------------------------- */
function saveToHistory(result) {
  chrome.storage.local.get({ history: [] }, ({ history }) => {
    history.unshift({
      text: result.claims?.[0]?.claim || "",
      score: result.score,
      summary: result.summary,
      timestamp: Date.now()
    });

    // Keep last 20 entries
    chrome.storage.local.set({
      history: history.slice(0, 20)
    });
  });
}
