/* =====================================================
   TrustLens Live – Content Script (FINAL)
   ===================================================== */

let lastSelectionText = "";
let savedRange = null;

/* -------------------------------
   Capture text selection
   ------------------------------- */
document.addEventListener("mouseup", () => {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;

  const range = selection.getRangeAt(0);
  const text = selection.toString().trim();

  if (!text) return;
  if (text === lastSelectionText) return;

  lastSelectionText = text;
  savedRange = range.cloneRange();

  chrome.runtime.sendMessage({
    type: "TEXT_SELECTED",
    text
  });
});

/* -------------------------------
   Receive verification result
   ------------------------------- */
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type !== "SHOW_TRUST_RESULT") return;
  if (!msg.result || typeof msg.result.score !== "number") return;
  if (!savedRange) return;

  // Try highlight (safe-only)
  highlightSelection(savedRange, msg.result.score);

  // Always show floating result
  showFloatingResult(savedRange, msg.result);
});

/* =====================================================
   SAFE HIGHLIGHT LOGIC
   ===================================================== */

function highlightSelection(range, score) {
  const startBlock = getBlockParent(range.startContainer);
  const endBlock = getBlockParent(range.endContainer);

  // ❌ Skip unsafe selections
  if (!startBlock || startBlock !== endBlock) {
    console.warn("TrustLens: Highlight skipped (multi-block)");
    return false;
  }

  // ❌ Prevent nested highlights
  if (
    startBlock.classList?.contains("trust-true") ||
    startBlock.classList?.contains("trust-false") ||
    startBlock.classList?.contains("trust-mixed")
  ) {
    return false;
  }

  const span = document.createElement("span");

  if (score >= 70) span.className = "trust-true";
  else if (score >= 40) span.className = "trust-mixed";
  else span.className = "trust-false";

  span.title = `Trust Score: ${score}`;

  try {
    // Safe inline highlight
    range.surroundContents(span);
  } catch (e) {
    // ❌ DO NOT fallback to extractContents (breaks layout)
    console.warn("TrustLens: surroundContents failed, skipped");
    return false;
  }

  window.getSelection().removeAllRanges();
  return true;
}

/* -------------------------------
   Find nearest block-level parent
   ------------------------------- */
function getBlockParent(node) {
  while (node && node.nodeType === Node.TEXT_NODE) {
    node = node.parentElement;
  }

  while (node) {
    const display = window.getComputedStyle(node).display;
    if (display === "block" || display === "list-item") {
      return node;
    }
    node = node.parentElement;
  }

  return null;
}

/* =====================================================
   FLOATING RESULT CARD (AUTO POPUP)
   ===================================================== */

function showFloatingResult(range, result) {
  // Remove existing card
  const old = document.getElementById("trustlens-float");
  if (old) old.remove();

  const rect = range.getBoundingClientRect();
  if (!rect || rect.width === 0 || rect.height === 0) return;

  const div = document.createElement("div");
  div.id = "trustlens-float";

  const score = result.score;
  const claim = result.claims?.[0];

  if (score >= 70) div.classList.add("green");
  else if (score >= 40) div.classList.add("orange");
  else div.classList.add("red");

  div.innerHTML = `
    <h4>TrustLens</h4>
    <div class="score">Trust Score: ${score}</div>
    <div><strong>${claim.verdict}</strong></div>
    <div class="reason">${claim.reason}</div>
  `;

  // Smart positioning (avoid off-screen)
  const top = window.scrollY + rect.bottom + 8;
  const left = Math.min(
    window.scrollX + rect.left,
    window.scrollX + window.innerWidth - 300
  );

  div.style.position = "absolute";
  div.style.top = `${top}px`;
  div.style.left = `${left}px`;
  div.style.zIndex = "999999";

  document.body.appendChild(div);

  // Auto-dismiss after 6s
  const timeout = setTimeout(() => {
    div.remove();
  }, 6000);

  // Manual close
  div.addEventListener("click", () => {
    clearTimeout(timeout);
    div.remove();
  });
}
