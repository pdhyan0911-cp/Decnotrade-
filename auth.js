(() => {
  "use strict";
  const welcome = document.getElementById("welcomeScreen");
  const appShell = document.getElementById("appShell");
  const startButton = document.getElementById("startButton");
  const accountButton = document.getElementById("accountBtn");
  const toast = document.getElementById("toast");

  if (!welcome || !appShell || !startButton) return;

  // Always begin on the designed welcome page; the dashboard is the next screen.
  welcome.hidden = false;
  appShell.hidden = true;

  function showWorkspace(event) {
    if (event) event.preventDefault();
    welcome.hidden = true;
    appShell.hidden = false;
    // Keep the dashboard's default Overview panel selected.
    const views = appShell.querySelectorAll(".view");
    views.forEach(view => view.classList.toggle("active", view.id === "view-overview"));
    const navLinks = appShell.querySelectorAll(".nav-link[data-view]");
    navLinks.forEach(link => {
      const active = link.dataset.view === "overview";
      link.classList.toggle("active", active);
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
    const pageTitle = document.getElementById("pageTitle");
    if (pageTitle) pageTitle.textContent = "Overview";
    window.scrollTo({ top: 0, behavior: "auto" });
    // Redraw responsive elements after the formerly hidden dashboard becomes visible.
    window.dispatchEvent(new Event("resize"));
    if (accountButton) accountButton.textContent = "Learning mode";
  }

  // Expose a simple fallback hook for the welcome button.
  window.openDecnotradeDashboard = showWorkspace;

  // Capture the click early so other page scripts cannot swallow the start action.
  document.addEventListener("click", event => {
    const clickedButton = event.target && event.target.closest
      ? event.target.closest("#startButton")
      : null;
    if (clickedButton) showWorkspace(event);
  }, true);

  startButton.addEventListener("click", showWorkspace);
  if (accountButton) {
    accountButton.textContent = "Learning mode";
    accountButton.addEventListener("click", () => {
      if (!toast) return;
      toast.textContent = "You're already in learning mode. No login is required.";
      toast.classList.add("show");
      window.clearTimeout(window.__decnotradeAuthToastTimer);
      window.__decnotradeAuthToastTimer = window.setTimeout(() => toast.classList.remove("show"), 2200);
    });
  }
})();
