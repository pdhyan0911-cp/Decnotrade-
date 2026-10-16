(() => {
  "use strict";
  const welcome = document.getElementById("welcomeScreen");
  const appShell = document.getElementById("appShell");
  const startButton = document.getElementById("startButton");
  const accountButton = document.getElementById("accountBtn");
  const toast = document.getElementById("toast");

  if (!welcome || !appShell || !startButton) return;

  function showDashboard() {
    welcome.hidden = true;
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

  // A direct homepage link with #dashboard opens the dashboard after page load.
  if (window.location.hash === "#dashboard") {
    showDashboard();
  } else {
    welcome.hidden = false;
    appShell.hidden = true;
  }

  // Clicking Start goes to the website homepage's dashboard URL.
  startButton.addEventListener("click", () => {
    window.location.href = "/#dashboard";
  });

  window.addEventListener("hashchange", () => {
    if (window.location.hash === "#dashboard") showDashboard();
  });

  window.openDecnotradeDashboard = showDashboard;

  if (accountButton) {
    accountButton.addEventListener("click", () => {
      if (!toast) return;
      toast.textContent = "You're already in learning mode. No login is required.";
      toast.classList.add("show");
      window.clearTimeout(window.__decnotradeAuthToastTimer);
      window.__decnotradeAuthToastTimer = window.setTimeout(() => toast.classList.remove("show"), 2200);
    });
  }
})();
