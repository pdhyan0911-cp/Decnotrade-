(() => {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const dialog = $("#authDialog");
  const welcome = $("#welcomeScreen");
  const appShell = $("#appShell");
  if (!dialog || !welcome || !appShell) return;
  // Always begin new/unsigned visitors on the designed welcome screen; Start opens the separate login page.
  welcome.hidden = false;
  dialog.hidden = true;
  appShell.hidden = true;
  const status = $("#authStatus");
  const guestKey = "decnotrade_guest_started_v1";
  const localKey = "decnotrade_v1";
  const hours48 = 48 * 60 * 60 * 1000;
  const config = window.DECNOTRADE_FIREBASE_CONFIG || {};
  const configured = !!(config.apiKey && config.authDomain && config.projectId && config.appId &&
    !Object.values(config).some(v => typeof v === "string" && v.startsWith("YOUR_")));
  let auth = null, db = null, currentUser = null, createMode = false, syncing = false, syncTimer = null, authInitialized = false, recaptchaVerifier = null, phoneConfirmation = null;

  function setStatus(message, error = false) {
    status.textContent = message;
    status.dataset.error = error ? "true" : "false";
  }
  function guestInfo() {
    const raw = Number(localStorage.getItem(guestKey));
    if (!raw || !Number.isFinite(raw)) return { exists: false, valid: false, remaining: 0 };
    const remaining = Math.max(0, raw + hours48 - Date.now());
    return { exists: true, valid: remaining > 0, remaining, started: raw };
  }
  function remainingLabel(ms) {
    const h = Math.max(1, Math.ceil(ms / 3600000));
    return h >= 24 ? Math.ceil(h / 24) + " day" + (Math.ceil(h / 24) === 1 ? "" : "s") : h + " hour" + (h === 1 ? "" : "s");
  }
  function updateGuestButton() {
    const b = $("#guestContinue");
    const g = guestInfo();
    if (currentUser) { b.textContent = "Signed in — guest mode not needed"; b.disabled = true; return; }
    if (g.valid) { b.innerHTML = "Continue as guest · " + remainingLabel(g.remaining) + ' left <span>→</span>'; b.disabled = false; }
    else if (g.exists) { b.textContent = "Guest access expired — sign in to continue"; b.disabled = true; }
    else { b.innerHTML = 'Continue as guest for 2 days <span>→</span>'; b.disabled = false; }
  }
  function showDialog() {
    if (currentUser) { closeDialog(); return; }
    updateGuestButton();
    welcome.hidden = true;
    appShell.hidden = true;
    dialog.hidden = false;
    window.scrollTo({ top: 0, behavior: "auto" });
    setStatus(configured
      ? "Choose a sign-in method, or continue as a guest for 2 days."
      : "You are on the login page. Guest mode works now; Google, Facebook, GitHub and email sign-in need the real Firebase project configuration before they can authenticate.", !configured);
  }
  function closeDialog() {
    if (!(currentUser || guestInfo().valid)) return;
    dialog.hidden = true;
    welcome.hidden = true;
    appShell.hidden = false;
    window.scrollTo({ top: 0, behavior: "auto" });
  }
  function returnToWelcome() {
    if (currentUser || guestInfo().valid) { closeDialog(); return; }
    dialog.hidden = true;
    appShell.hidden = true;
    welcome.hidden = false;
    window.scrollTo({ top: 0, behavior: "auto" });
  }
  $("#startButton").addEventListener("click", showDialog);
  function readLocalState() {
    try { return JSON.parse(localStorage.getItem(localKey) || "null"); } catch { return null; }
  }
  function mergeArrays(a, b) {
    const all = [...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])];
    const seen = new Set();
    return all.filter(item => {
      const key = item && typeof item === "object" ? (item.id || JSON.stringify(item)) : String(item);
      if (seen.has(key)) return false;
      seen.add(key); return true;
    }).slice(0, 500);
  }
  function mergeWorkspace(local, remote, importingGuest) {
    if (!local || typeof local !== "object") return remote || {};
    if (!remote || typeof remote !== "object") return local;
    const merged = importingGuest ? { ...remote, ...local } : { ...local, ...remote };
    for (const key of ["orders", "journal", "alerts", "completed", "watchlist", "challengeCompleted"]) {
      merged[key] = mergeArrays(local[key], remote[key]);
    }
    if (importingGuest) {
      merged.cash = local.cash;
      merged.positions = local.positions || {};
      merged.realized = local.realized || 0;
      merged.profile = local.profile || remote.profile;
    }
    return merged;
  }
  async function syncWorkspace(state, importingGuest = false) {
    if (!currentUser || !db || !state || syncing) return;
    syncing = true;
    try {
      const ref = db.collection("users").doc(currentUser.uid);
      const snap = await ref.get();
      const remote = snap.exists ? (snap.data().workspace || {}) : null;
      const merged = mergeWorkspace(state, remote, importingGuest);
      localStorage.setItem(localKey, JSON.stringify(merged));
      window.dispatchEvent(new CustomEvent("decnotrade:cloud-loaded", { detail: merged }));
      await ref.set({ workspace: merged, email: currentUser.email || null, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
      localStorage.removeItem(guestKey);
      setStatus("Signed in. Your learning workspace is synced to your account.");
    } catch (e) {
      setStatus("Signed in, but cloud sync failed. Check that Firestore is enabled and firestore.rules are published.", true);
    } finally { syncing = false; }
  }
  function queueSync(state) {
    if (!currentUser || !db) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(async () => {
      if (syncing) return;
      syncing = true;
      try {
        await db.collection("users").doc(currentUser.uid).set({
          workspace: state,
          email: currentUser.email || null,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      } catch { setStatus("Cloud sync paused. Check your Firebase Firestore setup.", true); }
      finally { syncing = false; }
    }, 700);
  }
  function providerReady() {
    if (!configured || !window.firebase || !firebase.apps || !firebase.apps.length || !auth) {
      setStatus("This sign-in button is ready, but account login cannot start until the real Firebase web configuration is added and the provider is enabled. No fake login or password collection is used.", true);
      return false;
    }
    return true;
  }
  let providerBusy = false;
  const providerButtons = ["#googleSignIn", "#facebookSignIn", "#githubSignIn"];
  async function signInProvider(providerName) {
    if (!providerReady() || providerBusy) return;
    let provider;
    if (providerName === "google") provider = new firebase.auth.GoogleAuthProvider();
    if (providerName === "facebook") provider = new firebase.auth.FacebookAuthProvider();
    if (providerName === "github") provider = new firebase.auth.GithubAuthProvider();
    if (!provider) { setStatus("This sign-in option is not available.", true); return; }
    providerBusy = true;
    providerButtons.forEach(sel => { const button = $(sel); button.disabled = true; button.setAttribute("aria-busy", "true"); });
    const labels = { google: "Google", facebook: "Facebook", github: "GitHub" };
    try {
      setStatus("Connecting securely to " + labels[providerName] + "…");
      // Redirect is more reliable than popups on mobile browsers and Android webviews.
      await auth.signInWithRedirect(provider);
    } catch (e) {
      providerBusy = false;
      providerButtons.forEach(sel => { const button = $(sel); button.disabled = false; button.removeAttribute("aria-busy"); });
      const messages = {
        "auth/unauthorized-domain": "Add this website's Vercel domain in Firebase Authentication → Settings → Authorized domains.",
        "auth/operation-not-allowed": "This sign-in provider is not enabled in Firebase Authentication yet.",
        "auth/account-exists-with-different-credential": "This email already uses another sign-in method. Sign in with that method first.",
        "auth/cancelled-popup-request": "Another sign-in request is already running. Please try again.",
        "auth/network-request-failed": "Connection failed. Check your internet and try again."
      };
      setStatus(messages[e.code] || (e.message || "Sign-in could not start. Check the Firebase provider setup and try again."), true);
    }
  }

  function phoneErrorMessage(e) {
    const messages = {
      "auth/invalid-phone-number": "Enter a valid phone number with country code, for example +91 followed by your number.",
      "auth/missing-phone-number": "Enter your phone number first.",
      "auth/too-many-requests": "Too many attempts. Please wait and try again later.",
      "auth/quota-exceeded": "Firebase SMS quota has been reached. Try later or check your Firebase plan.",
      "auth/captcha-check-failed": "reCAPTCHA verification failed. Refresh the page and try again.",
      "auth/operation-not-allowed": "Enable Phone sign-in in Firebase Authentication → Sign-in method."
    };
    return messages[e.code] || e.message || "Phone verification could not start. Check Firebase Phone provider setup.";
  }
  function setupRecaptcha() {
    if (recaptchaVerifier) return recaptchaVerifier;
    recaptchaVerifier = new firebase.auth.RecaptchaVerifier("recaptcha-container", {
      size: "normal",
      callback: () => {},
      "expired-callback": () => {
        setStatus("reCAPTCHA expired. Please verify it again.", true);
      }
    });
    return recaptchaVerifier;
  }
  $("#sendPhoneCode").addEventListener("click", async () => {
    if (!providerReady()) return;
    const phone = $("#authPhone").value.trim();
    if (!/^\\+[1-9]\\d{7,14}$/.test(phone)) {
      setStatus("Enter a phone number with country code, such as +91 followed by your number.", true);
      $("#authPhone").focus();
      return;
    }
    const sendButton = $("#sendPhoneCode");
    sendButton.disabled = true;
    try {
      setStatus("Complete the reCAPTCHA, then Firebase will send an SMS code.");
      const verifier = setupRecaptcha();
      await verifier.render();
      phoneConfirmation = await auth.signInWithPhoneNumber(phone, verifier);
      $("#phoneCodeSection").hidden = false;
      $("#authPhoneCode").focus();
      setStatus("Verification code sent if SMS delivery is available. Enter it below to finish sign-in.");
    } catch (e) {
      if (recaptchaVerifier) {
        try { recaptchaVerifier.clear(); } catch {}
        recaptchaVerifier = null;
      }
      setStatus(phoneErrorMessage(e), true);
    } finally {
      sendButton.disabled = false;
    }
  });
  $("#verifyPhoneCode").addEventListener("click", async () => {
    const code = $("#authPhoneCode").value.trim();
    if (!phoneConfirmation) {
      setStatus("Request a verification code first.", true);
      return;
    }
    if (!code) {
      setStatus("Enter the SMS verification code.", true);
      $("#authPhoneCode").focus();
      return;
    }
    const verifyButton = $("#verifyPhoneCode");
    verifyButton.disabled = true;
    try {
      setStatus("Verifying your phone number…");
      await phoneConfirmation.confirm(code);
      phoneConfirmation = null;
      setStatus("Phone verified. You're signed in.");
    } catch (e) {
      setStatus(e.code === "auth/invalid-verification-code" ? "That code wasn't accepted. Check it and try again." : phoneErrorMessage(e), true);
    } finally {
      verifyButton.disabled = false;
    }
  });

  $("#googleSignIn").addEventListener("click", () => signInProvider("google"));
  $("#facebookSignIn").addEventListener("click", () => signInProvider("facebook"));
  $("#githubSignIn").addEventListener("click", () => signInProvider("github"));
  $("#authClose").addEventListener("click", returnToWelcome);
  $("#accountBtn").addEventListener("click", () => currentUser ? auth && auth.signOut() : showDialog());
  $("#guestContinue").addEventListener("click", () => {
    const g = guestInfo();
    if (g.valid) { closeDialog(); return; }
    if (g.exists) { setStatus("Your 2-day guest period has ended. Sign in or create an account to continue.", true); return; }
    localStorage.setItem(guestKey, String(Date.now()));
    updateGuestButton();
    $("#authClose").hidden = false;
    setStatus("Guest mode started for 2 days on this device. Create an account before it expires to keep your progress.");
    closeDialog();
    const btn = $("#accountBtn"); if (btn) btn.textContent = "Guest · 2 days";
  });
  $("#forgotPassword").addEventListener("click", async () => {
    if (!providerReady()) return;
    const email = $("#authEmail").value.trim();
    if (!email) { setStatus("Enter your email address first, then tap Forgot password.", true); $("#authEmail").focus(); return; }
    try { await auth.sendPasswordResetEmail(email); setStatus("If an account exists for that email, Firebase will send a password-reset link."); }
    catch (e) { setStatus(e.message || "Could not request a password reset.", true); }
  });
  $("#authModeToggle").addEventListener("click", () => {
    createMode = !createMode;
    $("#authTitle").textContent = createMode ? "Create your account." : "Your progress, your space.";
    $("#emailAuthSubmit").textContent = createMode ? "Create account" : "Sign in with email";
    $("#authModePrompt").textContent = createMode ? "Already have an account?" : "New to Decnotrade?";
    $("#authModeToggle").textContent = createMode ? "Sign in" : "Create account";
    $("#authPassword").autocomplete = createMode ? "new-password" : "current-password";
    setStatus(configured ? "Use at least 6 characters for your password." : "Email accounts also require Firebase setup before they can be created.");
  });
  $("#emailAuthForm").addEventListener("submit", async e => {
    e.preventDefault();
    if (!providerReady()) return;
    const email = $("#authEmail").value.trim(), password = $("#authPassword").value;
    try {
      setStatus(createMode ? "Creating your account…" : "Signing in…");
      if (createMode) await auth.createUserWithEmailAndPassword(email, password);
      else await auth.signInWithEmailAndPassword(email, password);
    } catch (err) {
      const messages = {
        "auth/email-already-in-use":"An account already exists for this email. Try signing in.",
        "auth/weak-password":"Choose a stronger password with at least 6 characters.",
        "auth/invalid-email":"Enter a valid email address.",
        "auth/invalid-credential":"Email or password is incorrect.",
        "auth/user-not-found":"No account was found. Choose Create account to register.",
        "auth/wrong-password":"Email or password is incorrect."
      };
      setStatus(messages[err.code] || err.message || "Could not sign in. Please try again.", true);
    }
  });
  window.addEventListener("decnotrade:state", e => queueSync(e.detail));
  if (configured && window.firebase) {
    try {
      if (!firebase.apps.length) firebase.initializeApp(config);
      auth = firebase.auth();
      db = firebase.firestore();
      auth.getRedirectResult().catch(e => {
        const messages = {
          "auth/unauthorized-domain": "This website domain is not authorized in Firebase Authentication.",
          "auth/operation-not-allowed": "Enable this provider in Firebase Authentication → Sign-in method.",
          "auth/network-request-failed": "Connection failed while returning from sign-in. Please retry."
        };
        setStatus(messages[e.code] || "Sign-in did not finish. Please choose a sign-in option and try again.", true);
      }).finally(() => {
        providerBusy = false;
        providerButtons.forEach(sel => { const button = $(sel); button.disabled = false; button.removeAttribute("aria-busy"); });
      });
      auth.onAuthStateChanged(async user => {
        currentUser = user || null;
        const b = $("#accountBtn");
        if (user) {
          b.textContent = (user.displayName || user.email || "Account").split("@")[0].slice(0, 18);
          providerBusy = false;
          providerButtons.forEach(sel => { const button = $(sel); button.disabled = false; button.removeAttribute("aria-busy"); });
          const g = guestInfo();
          await syncWorkspace(readLocalState(), g.valid);
          if (!dialog.hidden) closeDialog();
        } else {
          b.textContent = guestInfo().valid ? "Guest · " + remainingLabel(guestInfo().remaining) : "Sign in";
          if (authInitialized && !guestInfo().valid) showDialog();
          updateGuestButton();
        }
        authInitialized = true;
      });
    } catch {
      setStatus("Firebase configuration could not be initialized. Check firebase-config.js.", true);
      welcome.hidden = false;
      dialog.hidden = true;
      appShell.hidden = true;
    }
  } else {
    $("#accountBtn").textContent = guestInfo().valid ? "Guest · " + remainingLabel(guestInfo().remaining) : "Sign in";
    welcome.hidden = false;
    dialog.hidden = true;
    appShell.hidden = true;
    setStatus("Secure account login is prepared, but it needs your Firebase project configuration before Google, Facebook, GitHub and email sign-in can work.", true);
  }
})();
