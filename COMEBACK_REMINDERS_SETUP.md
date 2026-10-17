# Decnotrade comeback reminders

## Included
- An opt-in email preference in Settings → Preferences.
- A scheduled Firebase Cloud Function that checks opted-in, verified accounts inactive for 48 hours.
- At most one email per inactive period. Returning to Decnotrade updates activity; another reminder can only happen after another 48-hour inactive period.
- A calm, natural editorial email design linking to https://decnotrade.vercel.app.
- WhatsApp is not activated until an official WhatsApp Business provider, approved templates, and separate consent are configured.

## Deploy setup
1. Install Firebase CLI and sign in with an account that owns Firebase project `decnotrade-216e5`.
2. Run `firebase functions:secrets:set RESEND_API_KEY` and enter a Resend API key. Never commit this key.
3. Configure `REMINDER_FROM_EMAIL` to an address on a domain verified with Resend. The placeholder sender in code will not deliver.
4. Run `npm --prefix functions install`, then `firebase deploy --only functions:sendComebackReminders`.
5. Ensure Cloud Firestore and Firebase Authentication are enabled. Verify that email/password accounts must verify their email.
6. Deploy the static site to Vercel and test with a verified account that explicitly enables reminders.

## Important
- Scheduled Functions require Google Cloud billing and may incur charges. Review pricing before enabling.
- Email delivery requires a valid Resend key and a verified sender domain.
- The existing Firestore rule permits a signed-in user to update only their own `users/{uid}` document.
- Guest users can save a local preference, but cannot receive remote reminders.
- Never add private keys or API tokens to frontend files.
