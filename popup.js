/* =====================================================
   TrustLens Live – Popup Script (FINAL)
   ===================================================== */

const scoreEl = document.getElementById("score");
const barEl = document.getElementById("score-bar");
const detailsEl = document.getElementById("details");
const historyEl = document.getElementById("history");
const statusEl = document.getElementById("status");

/* ----------------------------------
   Listen for verification result
   ---------------------------------- */
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type !== "SHOW_TRUST_RESULT") return;
  renderResult(msg.result);
});

/* ----------------------------------
   Load history on popup open
   ---------------------------------- */
chrome.storage.local.get({ history: [] }, ({ history }) => {
  renderHistory(history);
});

/* ----------------------------------
   Render main verification result
   ---------------------------------- */
function renderResult(result) {
  if (!result) return;

  const score = result.score;
  const claim = result.claims?.[0];

  // Score text
  scoreEl.textContent = `Trust Score: ${score}`;

  // Score bar color
  if (score >= 70) barEl.style.background = "#2e7d32"; // green
  else if (score >= 40) barEl.style.background = "#ef6c00"; // orange
  else barEl.style.background = "#c62828"; // red

  // Verdict text
  statusEl.textContent = claim?.verdict || "Result";

  // Details
  detailsEl.textContent = JSON.stringify(result, null, 2);

  // Refresh history
  chrome.storage.local.get({ history: [] }, ({ history }) => {
    renderHistory(history);
  });
}

/* ----------------------------------
   Render verification history
   ---------------------------------- */
function renderHistory(history) {
  historyEl.innerHTML = "";

  if (!history.length) {
    const li = document.createElement("li");
    li.textContent = "No checks yet";
    historyEl.appendChild(li);
    return;
  }

  history.forEach(item => {
    const li = document.createElement("li");
    li.textContent = `${item.score}% – ${item.text.slice(0, 40)}…`;
    historyEl.appendChild(li);
  });
}
