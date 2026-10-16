/*
  Firebase setup for Decnotrade authentication.
  1) Create a Firebase project at https://console.firebase.google.com/
  2) Register a Web app and copy its Firebase config values below.
  3) Enable Authentication providers: Email/Password, Google, Facebook and GitHub.
  4) Add your live Vercel domain and localhost to Authentication > Settings > Authorized domains.
  5) Enable Firestore Database and publish firestore.rules from this repository.
  Firebase web config is public client configuration; NEVER put service-account/private keys here.
*/
window.DECNOTRADE_FIREBASE_CONFIG = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  appId: "YOUR_FIREBASE_APP_ID"
};
