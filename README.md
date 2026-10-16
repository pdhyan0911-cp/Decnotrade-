# Decnotrade — Market Learning Studio

Decnotrade is a fresh, responsive website for learning market concepts and practising with virtual funds. Its visual direction is inspired by clean modern financial workspaces, but it has its own brand and layout.

## Included in this build

- **Overview dashboard:** virtual balance, open positions, practice P&L, learning progress, sample market chart and watchlist.
- **Market explorer:** searchable illustrative instruments and a local watchlist.
- **Paper portfolio:** simulated virtual buy/sell orders, position tracking, order history, realized and unrealized practice P&L, and reset controls.
- **Performance lab:** summarizes only the user's simulated activity saved in the browser.
- **Strategy studio:** educational position-size arithmetic and a hypothetical expectancy/break-even scenario calculator. It is not a historical backtest or prediction.
- **Learning paths:** six beginner modules with short knowledge checks and local progress tracking.
- **Dec AI guide:** built-in educational responses for common concepts. It is not connected to a live AI model.
- **Decision journal:** locally saved reflections with remove controls.
- **Watch & risk:** sample-level reminders that can be checked manually; no background notifications.
- **Preferences:** local data reset and transparent product limitations.
- **Responsive UI:** desktop sidebar, mobile navigation, accessible form labels and clear simulation notices.

## Run locally

Open `index.html` in a modern browser. This is a static HTML/CSS/JavaScript website and has no build command.

## Deploy on Vercel

Import this repository into Vercel, select **Other** as the framework preset, leave the build command empty, and deploy the static project. If Vercel is connected to the `main` branch, new commits may trigger a deployment automatically. Verify the deployment URL and test key interactions on desktop and mobile after deploying.

## Important limitations

- Market prices and chart movements are illustrative fixed sample values, **not live market data**.
- The portfolio is a simulation only. There is no broker or exchange connection, and no real-money orders can be placed.
- Data is stored in this browser's local storage. It does not sync between devices or accounts.
- Analytics describe only simulated orders saved in this browser; they do not represent real investment performance.
- The scenario tool uses user-entered assumptions and is not a backtest or forecast.
- Price reminders are checked only when the user presses the check button. They do not run in the background or send notifications.
- Dec AI uses built-in educational responses, not a live generative AI model. A real model would need a secure server-side endpoint.
- There is no account login, cloud database, owner-only visitor analytics, payments, or advertising integration in this static build.
- This website is educational and is not financial advice. Review privacy and disclaimer content before public launch or monetization.
