(() => {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const dialog = $("#authDialog");
  const welcome = $("#welcomeScreen");
  const appShell = $("#appShell");
  if (!dialog || !welcome || !appShell) return;
  const guestKey = "decnotrade_guest_started_v1";
  const localKey = "decnotrade_v1";
  const hours48 = 48 * 60 * 60 * 1000;
  // Restore an active guest session directly to the dashboard after refresh.
  const restoreGuestSession = Number(localStorage.getItem(guestKey)) > 0 &&
    Number(localStorage.getItem(guestKey)) + hours48 > Date.now();
  welcome.hidden = restoreGuestSession;
  dialog.hidden = true;
  appShell.hidden = !restoreGuestSession;
  const status = $("#authStatus");
  const config = window.DECNOTRADE_FIREBASE_CONFIG || {};
  const configured = !!(config.apiKey && config.authDomain && config.projectId && config.appId &&
    !Object.values(config).some(v => typeof v === "string" && v.startsWith("YOUR_")));
  let auth = null, db = null, currentUser = null, createMode = false, syncing = false, syncTimer = null, authInitialized = false, recaptchaVerifier = null, phoneConfirmation = null, suppressSignedOutDialogOnce = false;

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
      : "You are on the login page. Guest mode works now; Google, Facebook and email sign-in need the real Firebase project configuration before they can authenticate.", !configured);
  }
  function closeDialog() {
    if (!(currentUser || guestInfo().valid)) return;
    dialog.hidden = true;
    welcome.hidden = true;
    appShell.hidden = false;
    requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
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
  const providerButtons = ["#googleSignIn", "#facebookSignIn"];
  async function signInProvider(providerName) {
    if (!providerReady() || providerBusy) return;
    let provider;
    if (providerName === "google") provider = new firebase.auth.GoogleAuthProvider();
    if (providerName === "facebook") provider = new firebase.auth.FacebookAuthProvider();
    if (!provider) { setStatus("This sign-in option is not available.", true); return; }
    providerBusy = true;
    const originalLabels = new Map();
    providerButtons.forEach(sel => {
      const button = $(sel);
      if (!button) return;
      originalLabels.set(button, button.innerHTML);
      button.disabled = true;
      button.setAttribute("aria-busy", "true");
      if (button.id === providerName + "SignIn") button.innerHTML = '<span class="provider-mark">…</span> Opening sign-in…';
    });
    const labels = { google: "Google", facebook: "Facebook" };
    try {
      setStatus("Opening " + labels[providerName] + " sign-in…");
      // Redirect works reliably on mobile browsers; if it fails, the catch handler reports the cause.
      await auth.signInWithRedirect(provider);
    } catch (e) {
      providerBusy = false;
      providerButtons.forEach(sel => {
        const button = $(sel);
        if (!button) return;
        button.disabled = false;
        button.removeAttribute("aria-busy");
        if (originalLabels.has(button)) button.innerHTML = originalLabels.get(button);
      });
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
  let phoneCaptchaSolved = false;
  let recaptchaRendering = false;

  function setupRecaptcha() {
    if (recaptchaVerifier) return recaptchaVerifier;
    phoneCaptchaSolved = false;
    recaptchaVerifier = new firebase.auth.RecaptchaVerifier("recaptcha-container", {
      size: "normal",
      callback: () => {
        phoneCaptchaSolved = true;
        $("#sendPhoneCode").disabled = false;
        $("#sendPhoneCode").textContent = "Send verification code";
        setStatus("CAPTCHA complete. Tap Send verification code again to receive your SMS.");
      },
      "expired-callback": () => {
        phoneCaptchaSolved = false;
        $("#sendPhoneCode").disabled = true;
        setStatus("CAPTCHA expired. Complete the human check again.", true);
      }
    });
    return recaptchaVerifier;
  }

  function validPhoneNumber() {
    return /^\+[1-9]\d{7,14}$/.test($("#authPhone").value.trim());
  }

  async function showPhoneCaptcha() {
    if (!providerReady() || recaptchaRendering || recaptchaVerifier) return;
    if (!validPhoneNumber()) {
      setStatus("Enter a valid phone number with country code first, such as +91 followed by your number.", true);
      $("#authPhone").focus();
      return;
    }
    recaptchaRendering = true;
    $("#sendPhoneCode").disabled = true;
    $("#sendPhoneCode").textContent = "Loading CAPTCHA…";
    try {
      const verifier = setupRecaptcha();
      await verifier.render();
      $("#sendPhoneCode").textContent = "Send verification code";
      setStatus("Complete the CAPTCHA below. If picture tiles appear, select the matching pictures and press Verify. Then tap Send verification code again.");
    } catch (e) {
      if (recaptchaVerifier) { try { recaptchaVerifier.clear(); } catch {} }
      recaptchaVerifier = null;
      phoneCaptchaSolved = false;
      $("#sendPhoneCode").textContent = "Send verification code";
      $("#sendPhoneCode").disabled = !validPhoneNumber();
      setStatus(phoneErrorMessage(e), true);
    } finally {
      recaptchaRendering = false;
    }
  }

  $("#authPhone").addEventListener("input", () => {
    if (!validPhoneNumber()) {
      $("#sendPhoneCode").disabled = true;
      if (recaptchaVerifier) { try { recaptchaVerifier.clear(); } catch {} }
      recaptchaVerifier = null;
      phoneCaptchaSolved = false;
      $("#recaptcha-container").replaceChildren();
      $("#sendPhoneCode").textContent = "Send verification code";
    } else if (!recaptchaVerifier) {
      $("#sendPhoneCode").disabled = false;
    }
  });

  $("#sendPhoneCode").disabled = true;
  $("#sendPhoneCode").addEventListener("click", async () => {
    if (!providerReady()) return;
    if (!validPhoneNumber()) {
      setStatus("Enter a valid phone number with country code, such as +91 followed by your number.", true);
      $("#authPhone").focus();
      return;
    }

    // First click displays CAPTCHA. After the user solves it, the second click sends the SMS.
    if (!recaptchaVerifier) {
      await showPhoneCaptcha();
      return;
    }
    if (!phoneCaptchaSolved) {
      setStatus("Complete the CAPTCHA first. Then tap Send verification code again.", true);
      return;
    }

    const sendButton = $("#sendPhoneCode");
    sendButton.disabled = true;
    sendButton.textContent = "Sending SMS…";
    try {
      phoneConfirmation = await auth.signInWithPhoneNumber($("#authPhone").value.trim(), recaptchaVerifier);
      $("#phoneCodeSection").hidden = false;
      $("#authPhoneCode").value = "";
      $("#authPhoneCode").focus();
      setStatus("SMS request sent. Enter the verification code from your phone to sign in.");
      try { recaptchaVerifier.clear(); } catch {}
      recaptchaVerifier = null;
      phoneCaptchaSolved = false;
      $("#recaptcha-container").replaceChildren();
      sendButton.textContent = "Send verification code";
      sendButton.disabled = !validPhoneNumber();
    } catch (e) {
      if (recaptchaVerifier) { try { recaptchaVerifier.clear(); } catch {} }
      recaptchaVerifier = null;
      phoneCaptchaSolved = false;
      $("#recaptcha-container").replaceChildren();
      sendButton.textContent = "Try verification again";
      sendButton.disabled = !validPhoneNumber();
      setStatus(phoneErrorMessage(e), true);
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
      if (createMode) {
        const credential = await auth.createUserWithEmailAndPassword(email, password);
        await credential.user.sendEmailVerification();
        suppressSignedOutDialogOnce = true;
        await auth.signOut();
        setStatus("Account created. Check your inbox and spam folder for the verification email, open its link, then return here and sign in. Your account will not open until the email is verified.");
      } else {
        const credential = await auth.signInWithEmailAndPassword(email, password);
        if (!credential.user.emailVerified) {
          try { await credential.user.sendEmailVerification(); } catch {}
          suppressSignedOutDialogOnce = true;
          await auth.signOut();
          setStatus("Please verify your email first. We sent a verification link if delivery is available. Open it from your inbox, then sign in again.", true);
        }
      }
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
          const emailPasswordAccount = user.providerData && user.providerData.some(p => p.providerId === "password");
          if (emailPasswordAccount && !user.emailVerified) {
            b.textContent = "Verify email";
            return;
          }
          providerBusy = false;
          providerButtons.forEach(sel => { const button = $(sel); button.disabled = false; button.removeAttribute("aria-busy"); });
          const g = guestInfo();
          // Restore the dashboard on reload for authenticated users; cloud sync runs in the background.
          closeDialog();
          void syncWorkspace(readLocalState(), g.valid);
        } else {
          b.textContent = guestInfo().valid ? "Guest · " + remainingLabel(guestInfo().remaining) : "Sign in";
          if (authInitialized && !guestInfo().valid && !suppressSignedOutDialogOnce) showDialog();
          suppressSignedOutDialogOnce = false;
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
    setStatus("Secure account login is prepared, but it needs your Firebase project configuration before Google, Facebook and email sign-in can work.", true);
  }
})();
