#!/usr/bin/env node
"use strict";

// Lightweight static-site smoke tests; uses only Node.js built-ins.
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");
const failures = [];
const pass = (label) => console.log("PASS " + label);
const fail = (label, detail) => failures.push(label + (detail ? ": " + detail : ""));

for (const file of ["index.html", "styles.css", "script.js", "manifest.webmanifest", "sw.js", "favicon.svg", "privacy.html", "disclaimer.html", "404.html", "about.html", "guides/index.html", "guides/market-basics.html", "guides/risk-management.html", "guides/candlestick-basics.html"]) {
  if (fs.existsSync(path.join(root, file))) pass("required file exists: " + file);
  else fail("required file missing", file);
}

const html = read("index.html");
const js = read("script.js");
const css = read("styles.css");
let manifest;
try { manifest = JSON.parse(read("manifest.webmanifest")); pass("web app manifest parses as JSON"); }
catch (error) { fail("web app manifest is invalid JSON", error.message); }

if (manifest) {
  if (manifest.name && manifest.short_name && manifest.start_url && manifest.display) pass("manifest has core install fields");
  else fail("manifest missing a required install field");
  for (const icon of manifest.icons || []) {
    if (/^https?:\/\//.test(icon.src) || fs.existsSync(path.join(root, icon.src.replace(/^\.\//, "")))) pass("manifest icon exists: " + icon.src);
    else fail("manifest icon missing", icon.src);
  }
}

try { new Function(js); pass("application JavaScript parses"); }
catch (error) { fail("application JavaScript syntax error", error.message); }
try { new Function(read("sw.js")); pass("service-worker JavaScript parses"); }
catch (error) { fail("service-worker syntax error", error.message); }

const ids = [...html.matchAll(/\bid=["']([^"']+)["']/g)].map((match) => match[1]);
const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
if (duplicates.length) fail("duplicate HTML IDs", [...new Set(duplicates)].join(", "));
else pass("HTML IDs are unique");

const views = new Set([...html.matchAll(/\bid=["']view-([^"']+)["']/g)].map((match) => match[1]));
const targets = [...new Set([...html.matchAll(/\bdata-view=["']([^"']+)["']/g)].map((match) => match[1]))];
const missingViews = targets.filter((target) => !views.has(target));
if (missingViews.length) fail("navigation target has no matching view", missingViews.join(", "));
else pass("navigation targets map to existing views");

if (html.includes('rel="manifest"')) pass("HTML links the web app manifest");
else fail("HTML does not link the web app manifest");
if (js.includes('navigator.serviceWorker.register("./sw.js")')) pass("app registers its service worker");
else fail("service worker registration missing");
if (css.includes("prefers-reduced-motion:reduce")) pass("reduced-motion preference is supported");
else fail("reduced-motion CSS rule missing");

const shellMatch = read("sw.js").match(/const APP_SHELL = \[([\s\S]*?)\];/);
if (!shellMatch) fail("service-worker app shell list not found");
else {
  const shellFiles = [...shellMatch[1].matchAll(/["'](\.\/[^"']+)["']/g)].map((match) => match[1]);
  for (const file of shellFiles) {
    const local = file.replace(/^\.\//, "");
    if (fs.existsSync(path.join(root, local))) pass("cached app-shell file exists: " + local);
    else fail("cached app-shell file missing", local);
  }
}

if (failures.length) {
  console.error("\n" + failures.length + " smoke test(s) failed:");
  for (const failure of failures) console.error("FAIL " + failure);
  process.exitCode = 1;
} else console.log("\nAll Decnotrade smoke tests passed.");
