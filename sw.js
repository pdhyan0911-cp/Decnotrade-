"use strict";
const CACHE_NAME = "decnotrade-static-v20";
const APP_SHELL = [
  "./",
  "./index.html",
  "./chart-studio.html",
  "./styles.css",
  "./script.js",
  "./balance-cap.js",
  "./auth.js",
  "./firebase-config.js",
  "./favicon.svg",
  "./manifest.webmanifest",
  "./privacy.html",
  "./disclaimer.html",
  "./404.html",
  "./about.html",
  "./guides/index.html",
  "./guides/market-basics.html",
  "./guides/risk-management.html",
  "./guides/candlestick-basics.html"
];
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("decnotrade-static-") && key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).then(response => {
      if (response && response.ok) caches.open(CACHE_NAME).then(cache => cache.put("./index.html", response.clone()));
      return response;
    }).catch(async () => (await caches.match(request)) || (await caches.match("./index.html")) || Response.error()));
    return;
  }
  event.respondWith(caches.match(request).then(cached => {
    const network = fetch(request).then(response => {
      if (response && response.ok && response.type === "basic") caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
      return response;
    });
    return cached || network;
  }));
});
