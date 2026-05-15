/**
 * SIRENS Firebase Cloud Functions - API Test Script
 * 
 * SETUP:
 *   npm install node-fetch
 * 
 * USAGE:
 *   node test-functions.js
 * 
 * FILL IN the config block below before running.
 */

const fetch = (...args) => import("node-fetch").then(({ default: f }) => f(...args));

// ─────────────────────────────────────────────
// CONFIG — fill these in
// ─────────────────────────────────────────────
const CONFIG = {
  // From Firebase Console → Project Settings → General → Web API Key
  FIREBASE_API_KEY: "YOUR_FIREBASE_WEB_API_KEY",

  // A real user that exists in your Firebase Auth (create one in the console if needed)
  TEST_EMAIL: "test@example.com",
  TEST_PASSWORD: "testpassword123",

  // Emulator base URL — change port if different
  FUNCTIONS_BASE_URL: "http://127.0.0.1:5001/sirens-451958/us-central1",
};
// ─────────────────────────────────────────────

// ── Helpers ──────────────────────────────────

async function getIdToken() {
  console.log("🔑 Signing in to get ID token...");

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${CONFIG.FIREBASE_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: CONFIG.TEST_EMAIL,
        password: CONFIG.TEST_PASSWORD,
        returnSecureToken: true,
      }),
    }
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Auth failed: ${data.error?.message}`);
  }

  console.log(`✅ Signed in as: ${data.email}\n`);
  return data.idToken;
}

async function callFunction(functionName, data, idToken) {
  const url = `${CONFIG.FUNCTIONS_BASE_URL}/${functionName}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      data,                        // Firebase callable functions expect { data: ... }
      context: {
        auth: { token: idToken },  // emulator picks this up
      },
    }),
  });

  const json = await res.json();
  return { status: res.status, body: json };
}

function printResult(name, result) {
  const ok = result.status >= 200 && result.status < 300 && !result.body?.error;
  const icon = ok ? "✅" : "❌";
  console.log(`${icon} ${name}`);
  console.log(`   Status : ${result.status}`);
  console.log(`   Response: ${JSON.stringify(result.body, null, 2)}\n`);
}

// ── Tests ─────────────────────────────────────

async function testInitializeUserProfile(idToken) {
  console.log("─── Test 1: initializeUserProfile ───");
  const result = await callFunction("initializeUserProfile", {}, idToken);
  printResult("initializeUserProfile", result);
}

async function testUpdateOnboardingData(idToken) {
  console.log("─── Test 2: updateOnboardingData ───");
  const result = await callFunction(
    "updateOnboardingData",
    {
      city: "Karachi",
      district: "Clifton",
      homeLocation: { lat: 24.8138, lng: 67.0305 },
      workLocation: { lat: 24.8607, lng: 67.0104 },
      frequentAreas: ["Saddar", "DHA"],
      onboardingComplete: true,
    },
    idToken
  );
  printResult("updateOnboardingData", result);
}

async function testSetAlertPreferences(idToken) {
  console.log("─── Test 3: setAlertPreferences ───");
  const result = await callFunction(
    "setAlertPreferences",
    {
      preferences: {
        alertRadius: 5,
        notificationsEnabled: true,
        alertTypes: ["flood", "fire", "earthquake"],
      },
    },
    idToken
  );
  printResult("setAlertPreferences", result);
}

// ── Run all ───────────────────────────────────

(async () => {
  console.log("🚀 SIRENS — Firebase Functions Test Runner");
  console.log(`   Targeting: ${CONFIG.FUNCTIONS_BASE_URL}\n`);

  try {
    const idToken = await getIdToken();

    await testInitializeUserProfile(idToken);
    await testUpdateOnboardingData(idToken);
    await testSetAlertPreferences(idToken);

    console.log("🏁 All tests complete.");
  } catch (err) {
    console.error("💥 Fatal error:", err.message);
  }
})();