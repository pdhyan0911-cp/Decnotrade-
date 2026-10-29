(() => {
  "use strict";
  const KEY = "decnotrade_v1";
  const CAP = 100000;

  function normalize(workspace) {
    if (!workspace || typeof workspace !== "object" || Array.isArray(workspace)) return false;
    const cash = Number.isFinite(workspace.cash) && workspace.cash >= 0 ? workspace.cash : CAP;
    const positions = workspace.positions && typeof workspace.positions === "object" && !Array.isArray(workspace.positions)
      ? workspace.positions
      : {};
    const valid = Object.entries(positions).filter(([, p]) =>
      p && Number.isInteger(p.qty) && p.qty > 0 && Number.isFinite(p.avg) && p.avg > 0
    );
    const invested = valid.reduce((sum, [, p]) => sum + p.avg * p.qty, 0);
    if (cash + invested <= CAP) return false;

    const factor = CAP / (cash + invested);
    const reduced = {};
    for (const [symbol, p] of valid) {
      const qty = Math.floor(p.qty * factor);
      if (qty > 0) reduced[symbol] = { ...p, qty };
    }
    const remainingCost = Object.values(reduced).reduce((sum, p) => sum + p.avg * p.qty, 0);
    workspace.positions = reduced;
    workspace.cash = Math.max(0, Math.round((CAP - remainingCost) * 100) / 100);
    return true;
  }

  function migrateLocalWorkspace() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return;
      const workspace = JSON.parse(raw);
      if (normalize(workspace)) localStorage.setItem(KEY, JSON.stringify(workspace));
    } catch (_) {
      // Leave unreadable local data untouched.
    }
  }

  migrateLocalWorkspace();

  // Run before the main app's cloud-loaded handler so restored account data is capped too.
  window.addEventListener("decnotrade:cloud-loaded", event => {
    const workspace = event.detail;
    if (!normalize(workspace)) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(workspace));
    } catch (_) {
      // The main app will still receive the normalized in-memory workspace.
    }
  });
})();