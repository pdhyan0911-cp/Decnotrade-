(() => {
  "use strict";
  const welcome = document.getElementById("welcomeScreen");
  const appShell = document.getElementById("appShell");
  const startButton = document.getElementById("startButton");
  const accountButton = document.getElementById("accountBtn");
  const toast = document.getElementById("toast");

  // Keep the designed welcome/start page, but open the learning workspace directly.
  if (!welcome || !appShell || !startButton) return;
  welcome.hidden = false;
  appShell.hidden = true;

  function showWorkspace() {
    welcome.hidden = true;
    appShell.hidden = false;
    window.scrollTo({ top: 0, behavior: "auto" });
    if (accountButton) accountButton.textContent = "Learning mode";
  }

  function showMessage(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    window.clearTimeout(window.__decnotradeAuthToastTimer);
    window.__decnotradeAuthToastTimer = window.setTimeout(() => toast.classList.remove("show"), 2200);
  }

  startButton.addEventListener("click", showWorkspace);
  if (accountButton) {
    accountButton.textContent = "Learning mode";
    accountButton.addEventListener("click", () => showMessage("You're already in learning mode. No login is required."));
  }
})();