(() => {
  "use strict";

  const STORAGE_KEY = "decnotrade_privacy_choice_v1";
  let activated = false;
  let banner;

  function readChoice() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      return value && typeof value.advertising === "boolean" ? value : null;
    } catch {
      return null;
    }
  }

  function saveChoice(advertising) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        advertising,
        updatedAt: new Date().toISOString()
      }));
    } catch {
      // If storage is unavailable, advertising remains blocked for this page.
    }
  }

  function activateAdvertising() {
    if (activated || readChoice()?.advertising !== true) return;
    activated = true;

    document.querySelectorAll('script[type="text/plain"][data-consent-category="advertising"]').forEach((blocked) => {
      const live = document.createElement("script");
      for (const attribute of blocked.attributes) {
        if (attribute.name === "type" || attribute.name.startsWith("data-consent-")) continue;
        live.setAttribute(attribute.name, attribute.value);
      }
      if (blocked.dataset.consentSrc) live.src = blocked.dataset.consentSrc;
      live.textContent = blocked.textContent;
      blocked.replaceWith(live);
    });

    window.dispatchEvent(new CustomEvent("decnotrade:advertising-consent", {
      detail: { advertising: true }
    }));
  }

  function ensureBanner() {
    if (banner) return banner;
    const style = document.createElement("style");
    style.textContent = `
      .dc-consent-banner{position:fixed;z-index:10000;left:16px;right:16px;bottom:16px;max-width:760px;margin:auto;padding:18px;background:#fff;color:#18251f;border:1px solid #dce5dc;border-radius:16px;box-shadow:0 12px 45px #10251c26;font:14px/1.55 Inter,system-ui,-apple-system,"Segoe UI",sans-serif}
      .dc-consent-banner[hidden]{display:none}
      .dc-consent-banner h2{font-size:16px;margin:0 0 6px}
      .dc-consent-banner p{margin:0 0 12px;color:#59685e;font-size:12px}
      .dc-consent-actions{display:flex;gap:9px;flex-wrap:wrap}
      .dc-consent-actions button{flex:1;min-width:130px;min-height:42px;border-radius:10px;padding:9px 14px;font:700 13px Inter,system-ui,sans-serif;cursor:pointer}
      .dc-consent-accept{border:1px solid #214c3a;background:#214c3a;color:#fff}
      .dc-consent-reject{border:1px solid #9aa99c;background:#fff;color:#20382a}
      .dc-consent-policy{color:#326b52;text-underline-offset:3px}
      .dc-consent-footer{margin:8px 0 0 8px;border:0;background:transparent;color:inherit;text-decoration:underline;text-underline-offset:3px;font:inherit;font-size:11px;cursor:pointer}
      @media(max-width:520px){.dc-consent-banner{left:8px;right:8px;bottom:8px;padding:14px}.dc-consent-actions{flex-direction:column}.dc-consent-actions button{width:100%}}
    `;
    document.head.appendChild(style);

    banner = document.createElement("section");
    banner.className = "dc-consent-banner";
    banner.hidden = true;
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-modal", "false");
    banner.setAttribute("aria-labelledby", "dcConsentTitle");
    banner.innerHTML = `
      <h2 id="dcConsentTitle">Your privacy choices</h2>
      <p>Optional advertising scripts and ad storage stay off unless you accept. Reject is just as easy as Accept. The workspace also loads Firebase to support account sign-in and session restoration. You can change this choice later from the footer. <a class="dc-consent-policy" href="/privacy.html">Privacy notice</a>.</p>
      <div class="dc-consent-actions">
        <button class="dc-consent-reject" type="button" data-choice="reject">Reject optional advertising</button>
        <button class="dc-consent-accept" type="button" data-choice="accept">Accept optional advertising</button>
      </div>
    `;
    banner.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-choice]");
      if (!button) return;
      const allow = button.dataset.choice === "accept";
      const previous = readChoice();
      saveChoice(allow);
      banner.hidden = true;
      if (allow) activateAdvertising();
      else if (previous?.advertising === true) window.location.reload();
      window.dispatchEvent(new CustomEvent("decnotrade:consent-updated", {
        detail: { advertising: allow }
      }));
    });
    document.body.appendChild(banner);
    return banner;
  }

  function openSettings() {
    ensureBanner().hidden = false;
  }

  function addFooterSettings() {
    let footers = [...document.querySelectorAll("footer")];
    if (!footers.length) {
      const footer = document.createElement("footer");
      footer.className = "dc-consent-generated-footer";
      document.body.appendChild(footer);
      footers = [footer];
    }
    footers.forEach((footer) => {
      if (footer.querySelector("[data-dc-consent-settings]")) return;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "dc-consent-footer";
      button.dataset.dcConsentSettings = "true";
      button.textContent = "Cookie settings";
      button.addEventListener("click", openSettings);
      footer.appendChild(button);
    });
  }

  function initialize() {
    addFooterSettings();
    const choice = readChoice();
    if (choice?.advertising === true) activateAdvertising();
    else if (!choice) ensureBanner().hidden = false;
  }

  window.DecnotradePrivacyConsent = {
    openSettings,
    getChoice: () => readChoice()
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();