import * as admin from 'firebase-admin';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { defineSecret } from 'firebase-functions/params';
import { classifySignals } from './ai/flows/classifySignals';
import { planCrisis } from './ai/flows/planCrisis';
import { executePlan } from './ai/flows/executePlan';

const db = admin.firestore();

// ── Secrets (set via `firebase functions:secrets:set`) ───────────────────────
const gnewsApiKey = defineSecret('GNEWS_API_KEY');
const geminiApiKey = defineSecret('GOOGLE_GENAI_API_KEY');
const googleMapsApiKey = defineSecret('REACT_APP_GOOGLE_MAPS_API_KEY');

// ── City config (expandable later) ──────────────────────────────────────────
const MONITORED_CITIES = [
  { name: 'Karachi', lat: 24.8607, lng: 67.0011 },
];

// =============================================================================
// 1. WEATHER INGESTION — Every 1 hour
//    Fetches Open-Meteo for each monitored city.
//    Deduplicates by comparing against the last saved weather signal.
// =============================================================================
export const ingestWeather = onSchedule('every 60 minutes', async () => {
  for (const city of MONITORED_CITIES) {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lng}&current_weather=true`;
      const res = await fetch(url);
      const data = await res.json();
      const weather = data.current_weather;

      if (!weather) continue;

      // ── Dedup: skip if identical weathercode was saved in the last 2 hours ──
      const recentSnap = await db.collection('raw_signals')
        .where('source', '==', 'open_meteo')
        .where('city', '==', city.name)
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();

      if (!recentSnap.empty) {
        const last = recentSnap.docs[0].data();
        if (last.weathercode === weather.weathercode && last.temperature === weather.temperature) {
          console.log(`Weather unchanged for ${city.name}, skipping.`);
          continue;
        }
      }

      // ── Write new signal ──
      await db.collection('raw_signals').add({
        source: 'open_meteo',
        text: `Weather update for ${city.name}: Temperature ${weather.temperature}°C, Wind ${weather.windspeed} km/h, Weather code ${weather.weathercode}`,
        location: { lat: city.lat, lng: city.lng },
        areaName: city.name,
        city: city.name,
        timestamp: new Date().toISOString(),
        // Extra fields for dedup comparison next cycle
        weathercode: weather.weathercode,
        temperature: weather.temperature,
        processed: false,
        processAfter: admin.firestore.Timestamp.now(), // Process immediately
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`Weather signal saved for ${city.name}`);
    } catch (e) {
      console.error(`Weather fetch failed for ${city.name}:`, e);
    }
  }
});

// =============================================================================
// 2. NEWS INGESTION — Every 1 hour
//    Fetches GNews for crisis-related headlines.
//    Deduplicates by checking if the exact article title already exists.
// =============================================================================
export const ingestNews = onSchedule(
  { schedule: 'every 60 minutes', secrets: [gnewsApiKey] },
  async () => {
    for (const city of MONITORED_CITIES) {
      try {
        const query = `crisis OR flood OR accident OR fire ${city.name} Pakistan`;
        const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=en&max=5&apikey=${gnewsApiKey.value()}`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.errors || !data.articles) {
          console.warn(`GNews returned no articles for ${city.name}`);
          continue;
        }

        for (const article of data.articles) {
          // ── Dedup: skip if this exact title was saved in the last 12 hours ──
          const existsSnap = await db.collection('raw_signals')
            .where('source', '==', 'gnews')
            .where('newsTitle', '==', article.title)
            .limit(1)
            .get();

          if (!existsSnap.empty) continue;

          await db.collection('raw_signals').add({
            source: 'gnews',
            text: `${article.title}. ${article.description || ''}`,
            areaName: city.name,
            city: city.name,
            timestamp: article.publishedAt || new Date().toISOString(),
            newsTitle: article.title, // For dedup
            processed: false,
            processAfter: admin.firestore.Timestamp.now(), // Process immediately
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }

        console.log(`News signals saved for ${city.name}`);
      } catch (e) {
        console.error(`News fetch failed for ${city.name}:`, e);
      }
    }
  }
);

// =============================================================================
// 3. COMMUNITY REPORT TRIGGER — On new report creation
//    When a citizen submits a report, write it to raw_signals with a 15-min
//    delay (processAfter) so poll votes have time to accumulate.
// =============================================================================
export const onCommunityReport = onDocumentCreated('reports/{reportId}', async (event) => {
  const data = event.data?.data();
  if (!data) return;

  const processAfter = new Date();
  processAfter.setMinutes(processAfter.getMinutes() + 15);

  await db.collection('raw_signals').add({
    source: 'community_report',
    text: data.description || `${data.category} reported at ${data.areaName || 'unknown area'}`,
    location: data.location ? {
      lat: data.location.latitude,
      lng: data.location.longitude,
    } : undefined,
    areaName: data.areaName || '',
    city: data.city,
    timestamp: new Date().toISOString(),
    reportId: event.params.reportId,
    processed: false,
    processAfter: admin.firestore.Timestamp.fromDate(processAfter),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`Community report ${event.params.reportId} queued for processing in 15 minutes.`);
});

// =============================================================================
// 4. CRISIS DETECTION LOOP — Every 15 minutes
//    Reads all unprocessed signals past their wait period.
//    Feeds them into Agent 1 (classifySignals).
//    Routes based on confidence:
//      - Low confidence  → PATH A only (personalized alert)
//      - High confidence → PATH A + save crisis for Agent 2
// =============================================================================
export const crisisDetectionLoop = onSchedule(
  { schedule: 'every 15 minutes', secrets: [geminiApiKey, googleMapsApiKey] },
  async () => {
  const now = admin.firestore.Timestamp.now();

  // Get unprocessed signals that are past their waiting period
  const signalsSnap = await db.collection('raw_signals')
    .where('processed', '==', false)
    .where('processAfter', '<=', now)
    .get();

  if (signalsSnap.empty) {
    console.log('No unprocessed signals found.');
    return;
  }

  // Group signals by city
  const signalsByCity: Record<string, any[]> = {};
  signalsSnap.docs.forEach(doc => {
    const d = doc.data();
    const city = d.city || 'Unknown';
    if (!signalsByCity[city]) signalsByCity[city] = [];
    signalsByCity[city].push({ id: doc.id, ...d });
  });

  // ── 1. Mark all signals as processed FIRST to prevent infinite loops on failure ──
  // Handle Firestore's 500 batch limit
  const chunkSize = 500;
  for (let i = 0; i < signalsSnap.docs.length; i += chunkSize) {
    const chunk = signalsSnap.docs.slice(i, i + chunkSize);
    const batch = db.batch();
    chunk.forEach(doc => {
      batch.update(doc.ref, { processed: true });
    });
    await batch.commit();
  }

  // ── 2. Process all cities in PARALLEL to reduce latency ──
  const cityPromises = Object.entries(signalsByCity).map(async ([city, signals]) => {
    console.log(`Processing ${signals.length} signals for ${city}...`);

    try {
      // Run Agent 1
      const crisis = await classifySignals({ city, signals });

      // Skip if no crisis detected
      if (crisis.crisisType === 'none') {
        console.log(`No crisis detected for ${city}.`);
        return;
      }

      // PATH A: Always send personalized alert
      await sendPersonalizedAlert(city, crisis);

      // PATH B: Only continue pipeline if confidence is high
      if (crisis.credibilityScore >= 0.5) {
        console.log(`[PATH B] High confidence (${crisis.credibilityScore}) in ${city}. Running Agent 2 (Planner)...`);
        
        const actionPlan = await planCrisis(crisis);
        
        const crisisRef = db.collection('crises').doc();
        await crisisRef.set({
          ...crisis,
          city,
          agent2Plan: actionPlan,
          status: 'planned',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`[Agent 2] Plan saved for ${city}: ${crisisRef.id}`);

        // Run Agent 3
        console.log(`[Agent 3] Executing plan for ${crisisRef.id}...`);
        await executePlan({
          crisisId: crisisRef.id,
          crisisType: crisis.crisisType,
          city: city,
          affectedArea: crisis.affectedArea,
          plan: actionPlan,
        });
        console.log(`[Agent 3] Execution complete for ${crisisRef.id}`);
      } else {
        console.log(`Low confidence (${crisis.credibilityScore}) in ${city}. Alert sent, pipeline stopped.`);
      }
    } catch (e) {
      console.error(`❌ Pipeline failed for city ${city}:`, e);
    }
  });

  await Promise.all(cityPromises);
});

// =============================================================================
// PATH A: Personalized Alert Dispatcher
//    Queries citizens in the affected city whose preferences match the crisis
//    category, and writes a targeted notification for each.
// =============================================================================
export async function sendPersonalizedAlert(
  city: string,
  crisis: { crisisType: string; severity: string; credibilityScore: number; affectedArea: string; description: string }
) {
  // Map crisis types to the preference fields citizens can toggle
  const categoryToPreference: Record<string, string> = {
    flood: 'weather',
    heatwave: 'weather',
    accident: 'traffic',
    road_block: 'traffic',
    fire: 'weather',
    power_outage: 'weather',
    infrastructure: 'weather',
  };

  const prefKey = categoryToPreference[crisis.crisisType] || 'weather';

  // Find citizens in this city who have completed onboarding
  const citizensSnap = await db.collection('citizens')
    .where('city', '==', city)
    .where('onboardingComplete', '==', true)
    .get();

  if (citizensSnap.empty) {
    console.log(`No onboarded citizens found in ${city} for alerts.`);
    return;
  }

  const batch = db.batch();
  let alertCount = 0;

  for (const doc of citizensSnap.docs) {
    const citizen = doc.data();
    const prefs = citizen.preferences;

    // Skip citizens who disabled this category
    if (prefs && prefs[prefKey] === false) continue;

    // Skip citizens who only want high severity, if this is low/medium
    if (prefs?.highSeverityOnly && (crisis.severity === 'low' || crisis.severity === 'medium')) continue;

    const notifRef = db.collection('notifications').doc();
    batch.set(notifRef, {
      userId: doc.id,
      title: `⚠️ ${crisis.crisisType.toUpperCase()} Alert — ${crisis.affectedArea}`,
      message: crisis.description,
      severity: crisis.severity,
      crisisType: crisis.crisisType,
      affectedArea: crisis.affectedArea,
      credibilityScore: crisis.credibilityScore,
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    alertCount++;
  }

  await batch.commit();
  console.log(`Sent ${alertCount} personalized alerts for ${crisis.crisisType} in ${city}.`);
}
