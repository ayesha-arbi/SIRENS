/**
 * SIRENS — API Integrations Test Script
 * Tests: Open-Meteo, GNews, Google Geocoding, Google Directions
 *
 * SETUP:
 *   npm install node-fetch
 *
 * USAGE:
 *   node test-apis.js
 *
 * Fill in the CONFIG block below before running.
 */

const fetch = (...args) => import("node-fetch").then(({ default: f }) => f(...args));

// ─────────────────────────────────────────────
// CONFIG — fill these in
// ─────────────────────────────────────────────
require("dotenv").config();

const CONFIG = {
  GNEWS_API_KEY: process.env.REACT_APP_GNEWS_API_KEY,
  GOOGLE_MAPS_API_KEY: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
  TEST_LAT: 24.8607,
  TEST_LNG: 67.0011,
  ORIGIN: "Karachi Airport, Karachi",
  DESTINATION: "Clifton, Karachi",
};
// ─────────────────────────────────────────────

// ── Utility ──────────────────────────────────

let passed = 0;
let failed = 0;

function printResult(name, success, detail) {
  if (success) {
    passed++;
    console.log(`✅ ${name}`);
  } else {
    failed++;
    console.log(`❌ ${name}`);
  }
  console.log(`   ${detail}\n`);
}

// ══════════════════════════════════════════════
// 1. OPEN-METEO — Weather (no key needed)
// ══════════════════════════════════════════════

async function testOpenMeteo() {
  console.log("─── Test 1: Open-Meteo (Weather) ───");
  try {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", String(CONFIG.TEST_LAT));
    url.searchParams.set("longitude", String(CONFIG.TEST_LNG));
    url.searchParams.set("current_weather", "true");
    url.searchParams.set("windspeed_unit", "kmh");

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);

    const data = await res.json();
    const w = data.current_weather;

    if (!w || w.temperature === undefined) throw new Error("Missing current_weather in response");

    printResult(
      "Open-Meteo",
      true,
      `Temperature: ${w.temperature}°C | Wind: ${w.windspeed} km/h | Code: ${w.weathercode} | Time: ${w.time}`
    );
  } catch (err) {
    printResult("Open-Meteo", false, `Error: ${err.message}`);
  }
}

// ══════════════════════════════════════════════
// 2. GNEWS — News headlines
// ══════════════════════════════════════════════

async function testGNews() {
  console.log("─── Test 2: GNews (Top Headlines) ───");
  try {
    if (CONFIG.GNEWS_API_KEY === "YOUR_GNEWS_API_KEY") {
      printResult("GNews", false, "Skipped — GNEWS_API_KEY not set in CONFIG");
      return;
    }

    const url = new URL("https://gnews.io/api/v4/top-headlines");
    url.searchParams.set("apikey", CONFIG.GNEWS_API_KEY);
    url.searchParams.set("lang", "en");
    url.searchParams.set("max", "3");

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);

    const data = await res.json();
    if (!Array.isArray(data.articles)) throw new Error("No articles array in response");
    if (data.articles.length === 0) throw new Error("Got 0 articles — check API key or quota");

    const titles = data.articles.map((a, i) => `\n     [${i + 1}] ${a.title}`).join("");
    printResult("GNews", true, `Got ${data.totalArticles} total articles. Sample:${titles}`);
  } catch (err) {
    printResult("GNews", false, `Error: ${err.message}`);
  }
}

async function testGNewsSearch() {
  console.log("─── Test 2b: GNews (Search — 'flood Pakistan') ───");
  try {
    if (CONFIG.GNEWS_API_KEY === "YOUR_GNEWS_API_KEY") {
      printResult("GNews Search", false, "Skipped — GNEWS_API_KEY not set in CONFIG");
      return;
    }

    const url = new URL("https://gnews.io/api/v4/search");
    url.searchParams.set("apikey", CONFIG.GNEWS_API_KEY);
    url.searchParams.set("q", "flood Pakistan");
    url.searchParams.set("lang", "en");
    url.searchParams.set("max", "3");

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);

    const data = await res.json();
    if (!Array.isArray(data.articles)) throw new Error("No articles array in response");

    const titles = data.articles.map((a, i) => `\n     [${i + 1}] ${a.title}`).join("");
    printResult(
      "GNews Search",
      true,
      data.articles.length > 0
        ? `Found ${data.articles.length} results:${titles}`
        : "0 results returned (query may be too specific)"
    );
  } catch (err) {
    printResult("GNews Search", false, `Error: ${err.message}`);
  }
}

// ══════════════════════════════════════════════
// 3. GOOGLE MAPS — Geocoding
// ══════════════════════════════════════════════

async function testGeocode() {
  console.log("─── Test 3: Google Maps Geocoding ───");
  try {
    if (CONFIG.GOOGLE_MAPS_API_KEY === "YOUR_GOOGLE_MAPS_API_KEY") {
      printResult("Google Geocoding", false, "Skipped — GOOGLE_MAPS_API_KEY not set in CONFIG");
      return;
    }

    const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
    url.searchParams.set("address", "Karachi, Pakistan");
    url.searchParams.set("key", CONFIG.GOOGLE_MAPS_API_KEY);

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);

    const data = await res.json();
    if (data.status !== "OK") throw new Error(`Geocode status: ${data.status} — ${data.error_message || "no message"}`);
    if (!data.results?.length) throw new Error("No results returned");

    const top = data.results[0];
    const { lat, lng } = top.geometry.location;
    printResult(
      "Google Geocoding",
      true,
      `Address: "${top.formatted_address}" → lat: ${lat}, lng: ${lng}`
    );
  } catch (err) {
    printResult("Google Geocoding", false, `Error: ${err.message}`);
  }
}

// ══════════════════════════════════════════════
// 4. GOOGLE DIRECTIONS
// ══════════════════════════════════════════════

async function testDirections() {
  console.log("─── Test 4: Google Directions ───");
  try {
    if (CONFIG.GOOGLE_MAPS_API_KEY === "YOUR_GOOGLE_MAPS_API_KEY") {
      printResult("Google Directions", false, "Skipped — GOOGLE_MAPS_API_KEY not set in CONFIG");
      return;
    }

    const url = new URL("https://maps.googleapis.com/maps/api/directions/json");
    url.searchParams.set("origin", CONFIG.ORIGIN);
    url.searchParams.set("destination", CONFIG.DESTINATION);
    url.searchParams.set("mode", "DRIVING");
    url.searchParams.set("key", CONFIG.GOOGLE_MAPS_API_KEY);

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);

    const data = await res.json();
    if (data.status !== "OK") throw new Error(`Directions status: ${data.status} — ${data.error_message || "no message"}`);
    if (!data.routes?.length) throw new Error("No routes returned");

    const leg = data.routes[0].legs[0];
    printResult(
      "Google Directions",
      true,
      `From: "${leg.start_address}"\n   To:   "${leg.end_address}"\n   Distance: ${leg.distance.text} | Duration: ${leg.duration.text}`
    );
  } catch (err) {
    printResult("Google Directions", false, `Error: ${err.message}`);
  }
}

// ── Run all ───────────────────────────────────

(async () => {
  console.log("🚀 SIRENS — API Integrations Test Runner\n");

  await testOpenMeteo();
  await testGNews();
  await testGNewsSearch();
  await testGeocode();
  await testDirections();

  console.log("════════════════════════════════");
  console.log(`🏁 Done: ${passed} passed, ${failed} failed`);
  console.log("════════════════════════════════");
})();