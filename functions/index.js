const { onSchedule } = require("firebase-functions/v2/scheduler");
const { defineSecret } = require("firebase-functions/params");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");

initializeApp();
const db = getFirestore();
const resendApiKey = defineSecret("RESEND_API_KEY");
const FROM_EMAIL = process.env.REMINDER_FROM_EMAIL || "Decnotrade <reminders@your-verified-domain.example>";
const SITE_URL = "https://decnotrade.vercel.app";

exports.sendComebackReminders = onSchedule(
  { schedule: "every 24 hours", timeZone: "Asia/Kolkata", secrets: [resendApiKey], region: "asia-south1" },
  async () => {
    const cutoff = Timestamp.fromMillis(Date.now() - 48 * 60 * 60 * 1000);
    const snapshot = await db.collection("users").where("notificationPrefs.emailEnabled", "==", true).get();
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const lastActiveAt = data.lastActiveAt;
      const prefs = data.notificationPrefs || {};
      if (!lastActiveAt || typeof lastActiveAt.toMillis !== "function" || lastActiveAt.toMillis() > cutoff.toMillis()) continue;
      if (prefs.lastReminderForActivityAt && typeof prefs.lastReminderForActivityAt.toMillis === "function" &&
          prefs.lastReminderForActivityAt.toMillis() >= lastActiveAt.toMillis()) continue;
      let account;
      try { account = await getAuth().getUser(doc.id); } catch { continue; }
      if (!account.email || !account.emailVerified || account.disabled) continue;
      const safeName = String(account.displayName || "there").replace(/[<>]/g, "").slice(0, 50);
      const html = `<!doctype html><html><body style="margin:0;background:#f3f1e9;font-family:Arial,sans-serif;color:#26382d;padding:28px 12px"><div style="max-width:560px;margin:auto;background:#fffdf7;border-radius:18px;overflow:hidden;border:1px solid #e1e3d8"><div style="padding:30px 28px 10px"><div style="font-size:12px;letter-spacing:3px;color:#657b68;font-weight:bold">DECNOTRADE · LEARNING STUDIO</div><h1 style="font-family:Georgia,serif;font-weight:normal;font-size:30px;line-height:1.2;margin:20px 0 10px">A little pause. A fresh perspective.</h1><p style="font-size:16px;line-height:1.7;color:#5c695f">Hi ${safeName}, it has been a couple of days. Your learning space is here whenever you're ready—no pressure, just a fresh start.</p></div><div style="margin:12px 28px 0;padding:25px 22px;border-radius:12px;background:linear-gradient(135deg,#e6e8d9,#f6eee0);"><div style="font-family:Georgia,serif;font-size:22px;line-height:1.35;color:#344b3b">Small moments of practice can build lasting clarity.</div><p style="margin:12px 0 0;color:#617163;font-size:14px;line-height:1.6">Explore a lesson, review your notes, or simply pick up where you left off.</p></div><div style="padding:24px 28px 30px"><a href="${SITE_URL}" style="display:inline-block;background:#355d45;color:#fffdf7;text-decoration:none;border-radius:8px;padding:14px 20px;font-size:14px;font-weight:bold">RETURN TO DECNOTRADE →</a><p style="font-size:12px;line-height:1.6;color:#7b857b;margin:22px 0 0">You received this because you enabled comeback reminders. Turn them off in Decnotrade → Preferences. This is a learning reminder, not financial advice.</p></div></div></body></html>`;
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: "Bearer " + resendApiKey.value(), "Content-Type": "application/json" },
        body: JSON.stringify({ from: FROM_EMAIL, to: [account.email], subject: "A little pause. A fresh perspective — Decnotrade", html })
      });
      if (!response.ok) {
        console.error("Reminder email failed", doc.id, response.status, await response.text());
        continue;
      }
      await doc.ref.set({
        notificationPrefs: { lastReminderForActivityAt: lastActiveAt, lastReminderSentAt: Timestamp.now() }
      }, { merge: true });
    }
  }
);
