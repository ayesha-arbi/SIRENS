require("dotenv").config();
const fetch = (...args) => import("node-fetch").then(({ default: f }) => f(...args));
const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccount.json");

// Initialize Firebase
if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

const GOOGLE_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
const GNEWS_KEY = process.env.REACT_APP_GNEWS_API_KEY;

// ── 1. Fetch Weather ──────────────────────────
async function fetchWeather(lat, lng) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true`;
    const res = await fetch(url);
    const data = await res.json();
    return { success: true, data: data.current_weather };
  } catch (e) {
    return { success: false, error: e.message, fallback: "No weather data available" };
  }
}

// ── 2. Fetch Traffic/Route ────────────────────
async function fetchRoute(origin, destination) {
  try {
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&key=${GOOGLE_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.status !== "OK") throw new Error(data.status);
    const leg = data.routes[0].legs[0];
    return { success: true, distance: leg.distance.text, duration: leg.duration.text };
  } catch (e) {
    return { success: false, error: e.message, fallback: "Route unavailable" };
  }
}

// ── 3. Fetch News ─────────────────────────────
async function fetchNews(query) {
  try {
    const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=en&max=3&apikey=${GNEWS_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.errors) throw new Error("Rate limited");
    return { success: true, articles: data.articles };
  } catch (e) {
    return { success: false, error: e.message, fallback: "News unavailable - using citizen reports only" };
  }
}

// ── 4. Get Active Reports from Firestore ──────
async function getActiveReports(city) {
  try {
    const snap = await db.collection("reports")
      .where("city", "==", city)
      .where("status", "==", "active")
      .get();
    return { success: true, reports: snap.docs.map(d => ({ id: d.id, ...d.data() })) };
  } catch (e) {
    return { success: false, error: e.message, reports: [] };
  }
}

// ── 5. Get Pending SOS Signals ────────────────
async function getPendingSOS() {
  try {
    const snap = await db.collection("sos_signals")
      .where("status", "==", "pending")
      .get();
    return { success: true, signals: snap.docs.map(d => ({ id: d.id, ...d.data() })) };
  } catch (e) {
    return { success: false, signals: [] };
  }
}

// ── 6. Send Alert ─────────────────────────────
async function sendAlert(title, message, affectedAreas, severity, city) {
  try {
    await db.collection("alerts").add({
      title, message, affectedAreas, severity, city,
      active: true,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ── 7. MAIN — Fuse all signals ────────────────
async function fuseSignals(city, lat, lng) {
  console.log(`\n🚨 SIRENS Agent — Fusing signals for ${city}\n`);

  const [weather, reports, sos, news] = await Promise.all([
    fetchWeather(lat, lng),
    getActiveReports(city),
    getPendingSOS(),
    fetchNews(`crisis ${city} Pakistan`),
  ]);

  // Build signal summary for Antigravity agent
  const signalSummary = {
    city,
    timestamp: new Date().toISOString(),
    weather: weather.success ? weather.data : weather.fallback,
    citizenReports: reports.reports,
    sosSignals: sos.signals,
    news: news.success ? news.articles?.map(a => a.title) : [news.fallback],
    reportCount: reports.reports.length,
    sosCount: sos.signals.length,
  };

  console.log("📡 Signal Summary:");
  console.log(JSON.stringify(signalSummary, null, 2));
  return signalSummary;
}

// ── Run ───────────────────────────────────────
fuseSignals("Karachi", 24.8607, 67.0011);

module.exports = { fetchWeather, fetchRoute, fetchNews, getActiveReports, getPendingSOS, sendAlert, fuseSignals };