(() => {
  "use strict";

  const welcome = document.getElementById("welcomeScreen");
  const appShell = document.getElementById("appShell");
  const accountButton = document.getElementById("accountBtn");
  const toast = document.getElementById("toast");

  if (!appShell) return;

  // The main dashboard is now the homepage. No login or welcome gate.
  function showDashboard() {
    if (welcome) welcome.hidden = true;
    appShell.hidden = false;

    appShell.querySelectorAll(".view").forEach(view => {
      view.classList.toggle("active", view.id === "view-overview");
    });

    appShell.querySelectorAll(".nav-link[data-view]").forEach(link => {
      const active = link.dataset.view === "overview";
      link.classList.toggle("active", active);
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });

    const title = document.getElementById("pageTitle");
    if (title) title.textContent = "Overview";
    if (accountButton) accountButton.textContent = "Learning mode";
    window.scrollTo(0, 0);
    window.dispatchEvent(new Event("resize"));
  }

  showDashboard();

  // The brand/home link always returns to the main dashboard.
  const homeLink = appShell.querySelector(".brand");
  if (homeLink) {
    homeLink.setAttribute("href", "#overview");
    homeLink.addEventListener("click", event => {
      event.preventDefault();
      showDashboard();
      history.replaceState(null, "", window.location.pathname + window.location.search + "#dashboard");
    });
  }

  if (accountButton) {
    accountButton.addEventListener("click", () => {
      if (!toast) return;
      toast.textContent = "You're in learning mode. No login is required.";
      toast.classList.add("show");
      window.clearTimeout(window.__decnotradeAuthToastTimer);
      window.__decnotradeAuthToastTimer = window.setTimeout(() => toast.classList.remove("show"), 2200);
    });
  }

  window.openDecnotradeDashboard = showDashboard;
})();