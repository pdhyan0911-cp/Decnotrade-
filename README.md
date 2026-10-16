# Decrotrade

Decrotrade is a responsive learning and paper-trading interface combining three areas:

- **Paper trading:** virtual cash, simulated buy/sell orders, positions, portfolio P&L, watchlists and order history.
- **Practice analytics:** order activity, realized and unrealized simulation P&L, virtual cash, holdings and recent order history.
- **Strategy lab:** position-sizing/risk calculator and hypothetical expectancy scenario explorer (not a historical backtest).
- **Alerts & risk:** local price-level reminders checked manually against fixed sample prices, plus a pre-practice checklist.
- **Trading academy:** beginner-friendly lessons, knowledge checks, progress tracking and a searchable glossary.
- **Dec AI:** built-in educational response preview for trading concepts. It is **not connected to a live AI model** until a secure backend is configured.

Also includes a local-device trade journal, sample market overview, settings, privacy notice, disclaimer and custom 404 page.

## Run locally

Open `index.html` in a modern browser. The site is a static HTML/CSS/JavaScript project and requires no build command.

## Important limitations

- Market values and chart movements are illustrative sample data, **not live quotes**.
- Paper trades are simulations only. No broker or exchange is connected; no real-money orders are placed.
- Account state, lesson progress, journal notes and reminders use browser local storage and do not sync across devices.
- Analytics summarize only simulated activity saved in this browser. The scenario explorer uses user-entered assumptions, not historical market data.
- Price reminders are not background alerts and do not send push notifications; they are checked manually against fixed sample values.
- Dec AI responses are built-in educational explanations, not generative AI or personalized financial advice. A real AI integration needs a server-side endpoint and secret management.
- Authentication, cloud persistence, real-time market data, owner-only analytics, payments and advertising integrations are not included in this static preview.

## Deploy to Vercel

Import the GitHub repository into Vercel. Select **Other** as the framework preset and leave the build command empty. Deploy, then test the deployed URL on desktop and mobile.

Review and update the privacy notice, disclaimer, and product behaviour before public launch or monetization.
