(() => {
  "use strict";
  // Independent dashboard navigation, so page links still work if another script fails.
  function activateView(name) {
    const target = document.getElementById("view-" + name);
    if (!target) return false;
    document.querySelectorAll(".view").forEach(section => {
      section.classList.toggle("active", section === target);
    });
    document.querySelectorAll(".nav-link[data-view]").forEach(button => {
      const active = button.dataset.view === name;
      button.classList.toggle("active", active);
      if (active) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
    const titles = {
      overview:"Overview", markets:"Market explorer", practice:"Paper portfolio",
      analytics:"Performance lab", strategy:"Strategy studio", academy:"Learning paths",
      assistant:"Dec AI guide", journal:"Decision journal", alerts:"Watch & risk",
      challenges:"Daily challenges", rewards:"Rewards & progress", referrals:"Invite & share",
      profile:"My profile", admin:"Owner console", monetization:"Monetization", settings:"Preferences"
    };
    const title = document.getElementById("pageTitle");
    if (title) title.textContent = titles[name] || name;
    const sidebar = document.getElementById("sidebar");
    const backdrop = document.getElementById("sidebarBackdrop");
    const menu = document.getElementById("menuToggle");
    if (sidebar) sidebar.classList.remove("open");
    if (backdrop) backdrop.classList.remove("is-visible");
    if (menu) menu.setAttribute("aria-expanded", "false");
    window.scrollTo({top:0,behavior:"auto"});
    return true;
  }
  document.addEventListener("click", event => {
    const element = event.target instanceof Element ? event.target : null;
    const button = element && element.closest("[data-view]");
    if (!button) return;
    const name = button.getAttribute("data-view");
    if (activateView(name)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);
  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".view").forEach(section => {
    });
    const menu = document.getElementById("menuToggle");
    const sidebar = document.getElementById("sidebar");
    const backdrop = document.getElementById("sidebarBackdrop");
    if (menu && sidebar) menu.addEventListener("click", () => {
      const open = sidebar.classList.toggle("open");
      if (backdrop) backdrop.classList.toggle("is-visible", open);
      menu.setAttribute("aria-expanded", String(open));
    });
    if (backdrop && sidebar) backdrop.addEventListener("click", () => {
      sidebar.classList.remove("open");
      backdrop.classList.remove("is-visible");
      if (menu) menu.setAttribute("aria-expanded", "false");
    });
  });
})();