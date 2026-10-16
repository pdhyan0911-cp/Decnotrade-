# Decnotrade account login setup

The login interface is committed, including Google, Facebook, GitHub, email sign-in, account creation, and 48-hour guest mode. Real account authentication and cloud sync remain inactive until a Firebase project is connected.

## 1. Create and configure Firebase

1. Open https://console.firebase.google.com/ and create a Firebase project.
2. In Project settings, register a **Web app** and copy its web configuration.
3. Open **Authentication → Sign-in method** and enable:
   - Email/Password
   - Google
   - Facebook (requires a Meta developer app and its App ID/App Secret in Firebase provider settings)
   - GitHub (requires a GitHub OAuth app and its Client ID/Client Secret in Firebase provider settings)
4. In **Authentication → Settings → Authorized domains**, add your deployed Vercel hostname (for example, `decnotrade.vercel.app`) and any custom domain you use.
5. Open **Firestore Database** and create a database.
6. Open `firebase-config.js` in this repository and replace the four `YOUR_...` placeholders with the corresponding Firebase web-app values. Do not add service-account keys or private secrets to this file.
7. Publish the security rules in `firestore.rules` using Firebase Console → Firestore Database → Rules. They restrict each user's workspace document to that signed-in user.

## 2. Deploy and test

After committing the real Firebase web config and publishing Firestore rules, wait for Vercel to deploy. Test account creation, email sign-in, Google sign-in, Facebook sign-in, GitHub sign-in, sign-out, guest expiry, and data restore on a second browser/device. Each OAuth provider must be enabled and correctly configured in its own provider console; buttons cannot complete OAuth before that setup.

## Guest and privacy behavior

- Guest mode is intended to last 48 hours on the same browser/device. After expiry, the UI asks the visitor to sign in or create an account.
- Guest workspace data is merged into the signed-in account's Firestore workspace when the user signs in while guest access is still active.
- The guest timer is browser-side and is not tamper-proof; a static website cannot securely enforce time limits against someone who clears browser storage.
- Cloud workspace data is stored under the authenticated Firebase user ID. Review and publish the included Firestore rules before enabling cloud sync.
- Firebase web config is designed to be public. Never commit Firebase service-account credentials, private API secrets, or OAuth client secrets to this repository.
