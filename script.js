const lessons = {
  candles: {
    kicker: "PATH 01 · FOUNDATIONS",
    title: "Candlestick basics",
    body: "<p>A candlestick summarises price movement during a chosen time period. It does not predict what happens next.</p><ul><li><strong>Open:</strong> the first recorded price in the period.</li><li><strong>High and low:</strong> the highest and lowest recorded prices.</li><li><strong>Close:</strong> the final recorded price in the period.</li><li><strong>Body and wicks:</strong> show the open-close range and the wider high-low range.</li></ul><p><strong>Study prompt:</strong> On a chart, identify the open, close, high and low before trying to interpret a candle.</p>"
  },
  trends: {
    kicker: "PATH 02 · CHART CONTEXT",
    title: "Trends & market structure",
    body: "<p>Traders often describe a series of rising swing highs and lows as an uptrend, and falling swing highs and lows as a downtrend. Price can also move sideways in a range.</p><ul><li>Look at several swings instead of one candle.</li><li>Mark the timeframe you are studying; structure can differ across timeframes.</li><li>Remember that patterns are interpretations, not guarantees.</li></ul><p><strong>Study prompt:</strong> Practise describing what a chart has already done without predicting its next move.</p>"
  },
  risk: {
    kicker: "PATH 03 · RESPONSIBLE LEARNING",
    title: "Risk management",
    body: "<p>Every market decision involves uncertainty. Risk management is about recognising that uncertainty before making decisions—not removing risk entirely.</p><ul><li>Never treat a past pattern as a promise of future results.</li><li>Learn the difference between risk, reward and probability.</li><li>Avoid borrowed money and never risk money needed for essentials.</li><li>Take breaks and keep learning decisions separate from emotion.</li></ul><p><strong>Study prompt:</strong> Explain in your own words why even a well-researched idea can be wrong.</p>"
  },
  "chart-reading": {
    kicker: "MARKET BASICS",
    title: "A simple chart-reading routine",
    body: "<p>Start with observation rather than prediction. A repeatable routine can help keep your learning organised.</p><ul><li>Identify the chart timeframe and what each candle represents.</li><li>Describe the broad structure: rising, falling or ranging.</li><li>Notice important areas without assuming price must react there.</li><li>Write down what you do not know as well as what you observe.</li></ul><p>This is educational practice only; it is not a trade signal or financial advice.</p>"
  },
  volume: {
    kicker: "MARKET BASICS",
    title: "Volume basics",
    body: "<p>Volume typically represents how much of an asset was traded during a period, depending on the market and data source.</p><ul><li>Volume can add context to price movement.</li><li>Volume data may differ between exchanges and providers.</li><li>High volume alone does not tell you whether a price will rise or fall.</li><li>Always check what the volume measure actually represents.</li></ul><p><strong>Study prompt:</strong> Describe volume and price separately before considering how they relate.</p>"
  }
};
const menuButton = document.querySelector(".menu-toggle");
const nav = document.querySelector("#main-nav");
const modal = document.querySelector("#lesson-modal");
const modalTitle = document.querySelector("#modal-title");
const modalKicker = document.querySelector("#modal-kicker");
const modalBody = document.querySelector("#modal-body");
const toast = document.querySelector("#toast");
let lastFocused = null;
let toastTimeout;

document.querySelector("#year").textContent = new Date().getFullYear();

menuButton.addEventListener("click", () => {
  const isOpen = nav.classList.toggle("open");
  menuButton.setAttribute("aria-expanded", String(isOpen));
  menuButton.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
});
nav.querySelectorAll("a").forEach(link => link.addEventListener("click", () => {
  nav.classList.remove("open");
  menuButton.setAttribute("aria-expanded", "false");
  menuButton.setAttribute("aria-label", "Open navigation");
}));

function openLesson(topic) {
  const lesson = lessons[topic];
  if (!lesson) return;
  lastFocused = document.activeElement;
  modalKicker.textContent = lesson.kicker;
  modalTitle.textContent = lesson.title;
  modalBody.innerHTML = lesson.body;
  modal.hidden = false;
  document.body.style.overflow = "hidden";
  modal.querySelector(".modal-close").focus();
}
function closeLesson() {
  modal.hidden = true;
  document.body.style.overflow = "";
  if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
}
document.querySelectorAll("[data-topic]").forEach(button => {
  button.addEventListener("click", () => openLesson(button.dataset.topic));
});
modal.querySelector(".modal-close").addEventListener("click", closeLesson);
modal.querySelector(".modal-done").addEventListener("click", closeLesson);
modal.addEventListener("click", event => { if (event.target === modal) closeLesson(); });
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && !modal.hidden) closeLesson();
});

document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener("click", event => {
    const target = document.querySelector(link.getAttribute("href"));
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    history.replaceState(null, "", link.getAttribute("href"));
  });
});

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove("show"), 2600);
}
document.querySelectorAll(".brand").forEach(link => link.addEventListener("click", () => {
  showToast("Welcome to Decrotrade — learn responsibly.");
}));
