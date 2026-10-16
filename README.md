# Decnotrade — Market Learning Studio

Decnotrade is a standalone, responsive market-learning website with its own brand, navigation and product experience. It is not the Decrotrade website. This repository is intended to be deployed as a separate site.

## Product areas

- **Overview:** virtual portfolio summary, illustrative chart, watchlist and learning progress.
- **Market explorer:** searchable illustrative instruments and local watchlist.
- **Paper portfolio:** virtual buy/sell exercises, positions, practice P&L, order history and reset controls.
- **Performance lab:** activity counts and a snapshot of local simulated orders.
- **Strategy studio:** educational position-size arithmetic and hypothetical expectancy/break-even calculations; not a historical backtest.
- **Learning paths:** six beginner lessons, checkpoints and a searchable glossary.
- **Dec AI guide:** built-in educational responses for common questions. It is not a live generative AI model.
- **Decision journal:** local reflections with delete controls.
- **Watch & risk:** sample-value reminders checked manually.
- **Daily challenges:** short educational activities and local learning points.
- **Rewards & progress:** locally derived badges and milestones; no cash value.
- **Invite & share:** copy/share actions and a sample share label; no signup tracking or referral payouts.
- **My profile:** local display name and learning goal, stored only in this browser.
- **Owner console:** readiness checklist for secure authentication and owner-only analytics. No private visitor data is displayed because server-side security is not configured.
- **Monetization hub:** AdSense preparation notes and Razorpay marked as a later phase.
- **Preferences:** local reset and product limitations.
- **Policy pages:** privacy notice, educational disclaimer and branded 404 page.

## Run locally

Open `index.html` in a modern browser. This is a static HTML/CSS/JavaScript project with no build command.

## Deploy as a separate website

Import **this repository** (`pdhyan0911-cp/Decnotrade-`) as its own Vercel project. Do not connect this deployment to the existing Decrotrade project or overwrite the Decrotrade repository. Choose **Other** as the framework preset, leave the build command empty, and deploy the static files. Configure a Decnotrade-specific Vercel project/domain. Test the deployment URL after it finishes.

## Important limitations and launch sequence

1. Confirm the separate Decnotrade design and test its interactions on mobile and desktop.
2. If real account registration is required, add a secure authentication provider and backend. A client-side profile is not secure login.
3. Add a database and server-side role checks before enabling private owner analytics or user management. Never rely on hiding an admin screen in frontend code.
4. Add analytics only after deciding what data is needed and updating the privacy notice.
5. Apply for Google AdSense only after the site is ready and meets the provider's policies; approval is not guaranteed.
6. Keep Razorpay/payment integration for the final phase. It requires account approval, server-side order creation, verified payment signatures/webhooks, and secrets stored only on the server.
7. Add a secure AI endpoint only if/when a real AI service is connected.

## Current technical limitations

- Market prices and charts are fixed illustrative values, not live market data.
- The portfolio is virtual only; no broker/exchange integration or real-money orders are available.
- Practice data, profile, learning progress, rewards and notes are stored in this browser's local storage. They do not sync between devices or accounts.
- Analytics are limited to simulated activity stored in this browser.
- Reminders are manually checked and do not run in the background or send notifications.
- Dec AI uses built-in educational responses, not a live AI model.
- Challenge points and badges are learning progress indicators only; they have no cash value.
- The referral share label does not track signups or issue rewards.
- There is no secure login, backend database, protected owner analytics, payment processing, AdSense tag, or global leaderboard in this static build.
- The website is educational and is not financial advice. Review all policy pages before public launch or monetization.

## Install and offline support

- The site includes a web app manifest and registers a service worker on HTTPS deployments, allowing compatible browsers to offer an install option and cache the app shell.
- Open the deployed site at least once while online before trying to reopen it offline. Offline availability depends on the browser and hosting environment.
- Cached pages do not turn sample quotes into live data, and browser-local practice data is not cloud-synced.
- After updating the site, refresh online so the latest app files can be downloaded.

## Release verification

- Confirm the deployed URL serves `index.html`, `styles.css`, `script.js`, `manifest.webmanifest`, and `sw.js`.
- On a compatible browser, check the install option and test a reload while offline.
- Test navigation, a virtual order, backup export/import, and mobile layout on the deployed build before sharing publicly.
