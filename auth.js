(() => {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const dialog = $("#authDialog");
  if (!dialog) return;
  const status = $("#authStatus");
  const guestKey = "decnotrade_guest_started_v1";
  const localKey = "decnotrade_v1";
  const hours48 = 48 * 60 * 60 * 1000;
  const config = window.DECNOTRADE_FIREBASE_CONFIG || {};
  const configured = !!(config.apiKey && config.authDomain && config.projectId && config.appId &&
    !Object.values(config).some(v => typeof v === "string" && v.startsWith("YOUR_")));
  let auth = null, db = null, currentUser = null, createMode = false, syncing = false, syncTimer = null;

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
    updateGuestButton();
    $("#authClose").hidden = !(currentUser || guestInfo().valid);
    if (!dialog.open) dialog.showModal();
  }
  function closeDialog() {
    if (currentUser || guestInfo().valid) dialog.close();
  }
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
      setStatus("Secure sign-in is not connected yet. Firebase project settings must be added before account login can work.", true);
      return false;
    }
    return true;
  }
  async function signInProvider(providerName) {
    if (!providerReady()) return;
    let provider;
    if (providerName === "google") provider = new firebase.auth.GoogleAuthProvider();
    if (providerName === "facebook") provider = new firebase.auth.FacebookAuthProvider();
    if (providerName === "github") provider = new firebase.auth.GithubAuthProvider();
    if (!provider) return;
    try {
      setStatus("Opening " + providerName + " sign-in…");
      await auth.signInWithPopup(provider);
    } catch (e) {
      setStatus(e.code === "auth/unauthorized-domain"
        ? "This website domain must be added in Firebase Authentication → Settings → Authorized domains."
        : (e.code === "auth/operation-not-allowed"
          ? "Enable this sign-in provider in Firebase Authentication first."
          : (e.code === "auth/popup-closed-by-user" ? "Sign-in was cancelled." : "Sign-in failed: " + (e.message || "Please try again."))), true);
    }
  }

  $("#googleSignIn").addEventListener("click", () => signInProvider("google"));
  $("#facebookSignIn").addEventListener("click", () => signInProvider("facebook"));
  $("#githubSignIn").addEventListener("click", () => signInProvider("github"));
  $("#authClose").addEventListener("click", closeDialog);
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
  window.addEventListener("decnotrade:cloud-loaded", e => {
    // The main workspace reads localStorage on page load. Refresh visible panels after account restore.
    if (e.detail && typeof e.detail === "object") setTimeout(() => location.reload(), 80);
  });

  if (configured && window.firebase) {
    try {
      if (!firebase.apps.length) firebase.initializeApp(config);
      auth = firebase.auth();
      db = firebase.firestore();
      auth.onAuthStateChanged(async user => {
        currentUser = user || null;
        const b = $("#accountBtn");
        if (user) {
          b.textContent = (user.displayName || user.email || "Account").split("@")[0].slice(0, 18);
          const g = guestInfo();
          await syncWorkspace(readLocalState(), g.valid);
          if (dialog.open) dialog.close();
        } else {
          b.textContent = guestInfo().valid ? "Guest · " + remainingLabel(guestInfo().remaining) : "Sign in";
          if (!guestInfo().valid) showDialog();
          updateGuestButton();
        }
      });
    } catch {
      setStatus("Firebase configuration could not be initialized. Check firebase-config.js.", true);
      showDialog();
    }
  } else {
    $("#accountBtn").textContent = guestInfo().valid ? "Guest · " + remainingLabel(guestInfo().remaining) : "Sign in";
    if (!guestInfo().valid) showDialog();
    setStatus("Secure account login is prepared, but it needs your Firebase project configuration before Google, Facebook, GitHub and email sign-in can work.", true);
  }
})();
