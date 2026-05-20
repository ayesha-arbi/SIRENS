import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { CitizenProfile, AlertPreferences, Report, Poll, SOSSignal, OfficialAlert } from "./types";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const bucket = admin.storage().bucket();

const ALLOWED_MIME_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const getUploadUrl = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated.");
  }

  const { fileType = "image/jpeg" } = request.data;

  if (!ALLOWED_MIME_TYPES[fileType]) {
    throw new HttpsError(
      "invalid-argument",
      `Unsupported file type. Allowed types: ${Object.keys(ALLOWED_MIME_TYPES).join(", ")}`
    );
  }

  const fileExtension = ALLOWED_MIME_TYPES[fileType];
  const fileName = `reports/${request.auth.uid}/${Date.now()}.${fileExtension}`;
  const file = bucket.file(fileName);

  const [url] = await file.getSignedUrl({
    version: "v4",
    action: "write",
    expires: Date.now() + 15 * 60 * 1000,
    contentType: fileType,
  });

  return { uploadUrl: url, filePath: fileName };
});

export const createCommunityReport = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated.");
  }

  const uid = request.auth.uid;
  const { imageUrl, category, description, location, areaName, city } = request.data;

  if (!imageUrl || !category || !location || !city) {
    throw new HttpsError("invalid-argument", "Image, Category, Location, and City are required.");
  }

  // Validate location shape before constructing a GeoPoint.
  if (
    typeof location.latitude !== "number" ||
    typeof location.longitude !== "number"
  ) {
    throw new HttpsError("invalid-argument", "location must have numeric latitude and longitude.");
  }

  const reportId = db.collection("reports").doc().id;

  const report: Report = {
    reportId,
    userId: uid,
    imageUrl,
    category,
    description: description ?? "",
    location: new admin.firestore.GeoPoint(location.latitude, location.longitude),
    areaName: areaName ?? "",
    city,
    timestamp: admin.firestore.Timestamp.now(),
    status: "active",
  };

  const poll: Poll = {
    pollId: `poll_${reportId}`,
    reportId,
    question: `Is there still a ${category} at ${areaName}?`,
    yesVotes: [],
    noVotes: [],
    createdAt: admin.firestore.Timestamp.now(),
  };

  try {
    const batch = db.batch();
    batch.set(db.collection("reports").doc(reportId), report);
    batch.set(db.collection("polls").doc(poll.pollId), poll);
    await batch.commit();
    return { success: true, reportId };
  } catch (error) {
    console.error("Error creating community report:", error);
    throw new HttpsError("internal", "Failed to create report and poll.");
  }
});

export const submitPollVote = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated.");
  }

  const uid = request.auth.uid;
  const { pollId, vote } = request.data;

  if (vote !== "yes" && vote !== "no") {
    throw new HttpsError("invalid-argument", "vote must be 'yes' or 'no'.");
  }

  const pollRef = db.collection("polls").doc(pollId);

  try {
    await db.runTransaction(async (tx) => {
      // First check if it's an AI verification request (Agent 4)
      let targetRef = db.collection("verification_requests").doc(pollId);
      let targetDoc = await tx.get(targetRef);

      // Fallback to citizen-generated polls
      if (!targetDoc.exists) {
        targetRef = db.collection("polls").doc(pollId);
        targetDoc = await tx.get(targetRef);
      }

      if (!targetDoc.exists) {
        throw new HttpsError("not-found", "Poll or Verification Request not found.");
      }

      const data = targetDoc.data()!;
      const yesVotes: string[] = data.yesVotes || [];
      const noVotes: string[] = data.noVotes || [];

      if (yesVotes.includes(uid) || noVotes.includes(uid)) {
        throw new HttpsError("already-exists", "You have already voted on this poll.");
      }

      const field = vote === "yes" ? "yesVotes" : "noVotes";
      tx.update(targetRef, { [field]: admin.firestore.FieldValue.arrayUnion(uid) });
    });

    return { success: true };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    console.error("Error submitting poll vote:", error);
    throw new HttpsError("internal", "Failed to submit vote.");
  }
});

export const getPersonalizedFeed = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated.");
  }

  const uid = request.auth.uid;
  const userDoc = await db.collection("citizens").doc(uid).get();

  if (!userDoc.exists) {
    throw new HttpsError("not-found", "User profile not found. Please complete onboarding.");
  }

  const profile = userDoc.data()!;

  try {
    const snapshot = await db.collection("reports")
      .where("city", "==", profile.city)
      .orderBy("timestamp", "desc")
      // Fetch extra docs so the in-memory preference filter still returns a full page.
      .limit(60)
      .get();

    const reports = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as Report) }));

    const filteredReports = reports
      .filter(report => {
        const cat = report.category;
        if (cat === "traffic" && !profile.preferences?.traffic) return false;
        if (cat === "weather" && !profile.preferences?.weather) return false;
        return true;
      })
      .slice(0, 20);

    return { reports: filteredReports };
  } catch (error) {
    console.error("Error fetching personalized feed:", error);
    throw new HttpsError("internal", "Failed to fetch feed.");
  }
});

export const initializeUserProfile = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated.");
  }

  const uid = request.auth.uid;
  const email = request.auth.token.email || "";

  try {
    const docRef = db.collection("citizens").doc(uid);
    const existing = await docRef.get();

    if (existing.exists) {
      // Profile already exists — do not overwrite onboardingComplete or createdAt.
      return { success: true, message: "User profile already exists." };
    }

    const initialProfile: Partial<CitizenProfile> = {
      uid,
      email,
      onboardingComplete: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await docRef.set(initialProfile);
    return { success: true, message: "User profile initialized." };
  } catch (error) {
    console.error("Error initializing user profile:", error);
    throw new HttpsError("internal", "Failed to initialize user profile.");
  }
});

export const updateOnboardingData = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated.");
  }

  const uid = request.auth.uid;
  const { city, district, homeLocation, workLocation, frequentAreas, onboardingComplete } = request.data;

  if (!city || !district) {
    throw new HttpsError("invalid-argument", "City and District are required.");
  }

  const updates: Partial<CitizenProfile> = {
    city,
    district,
    homeLocation,
    workLocation,
    frequentAreas,
    onboardingComplete,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  try {
    await db.collection("citizens").doc(uid).set(updates, { merge: true });
    return { success: true, message: "Onboarding data updated." };
  } catch (error) {
    console.error("Error updating onboarding data:", error);
    throw new HttpsError("internal", "Failed to update onboarding data.");
  }
});

export const setAlertPreferences = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated.");
  }

  const uid = request.auth.uid;
  const { preferences } = request.data;

  // Runtime validation — reject malformed or missing preference fields.
  if (
    typeof preferences?.weather !== "boolean" ||
    typeof preferences?.traffic !== "boolean" ||
    typeof preferences?.highSeverityOnly !== "boolean" ||
    !["push", "email", "sms"].includes(preferences?.notificationChannel)
  ) {
    throw new HttpsError(
      "invalid-argument",
      "preferences must include weather (bool), traffic (bool), highSeverityOnly (bool), and notificationChannel ('push'|'email'|'sms')."
    );
  }

  const validatedPreferences: AlertPreferences = {
    weather: preferences.weather,
    traffic: preferences.traffic,
    highSeverityOnly: preferences.highSeverityOnly,
    notificationChannel: preferences.notificationChannel,
  };

  try {
    await db.collection("citizens").doc(uid).set({
      preferences: validatedPreferences,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    return { success: true, message: "Preferences updated." };
  } catch (error) {
    console.error("Error updating preferences:", error);
    throw new HttpsError("internal", "Failed to update preferences.");
  }
});

export const triggerSOS = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated.");
  }

  const uid = request.auth.uid;
  const { location, message = "Emergency signal triggered" } = request.data;

  if (!location || typeof location.latitude !== "number" || typeof location.longitude !== "number") {
    throw new HttpsError("invalid-argument", "Valid location (lat/lng) is required for SOS.");
  }

  const sosId = db.collection("sos_signals").doc().id;
  const sosSignal: SOSSignal = {
    sosId,
    userId: uid,
    location: new admin.firestore.GeoPoint(location.latitude, location.longitude),
    message,
    status: "pending",
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  };

  try {
    await db.collection("sos_signals").doc(sosId).set(sosSignal);
    return { success: true, sosId };
  } catch (error) {
    console.error("Error triggering SOS:", error);
    throw new HttpsError("internal", "Failed to send SOS signal.");
  }
});

export const getSOSList = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated.");
  }

  try {
    const snapshot = await db.collection("sos_signals")
      .where("status", "==", "pending")
      .orderBy("timestamp", "desc")
      .get();

    const signals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return { signals };
  } catch (error) {
    console.error("Error fetching SOS list:", error);
    throw new HttpsError("internal", "Failed to fetch SOS signals.");
  }
});

export const sendOfficialAlert = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated.");
  }

  const { title, message, city, severity } = request.data;

  if (!title || !message || !city || !severity) {
    throw new HttpsError("invalid-argument", "Title, Message, City, and Severity are required.");
  }

  const alertId = db.collection("alerts").doc().id;
  const alert: OfficialAlert = {
    alertId,
    title,
    message,
    city,
    severity: severity as 'low' | 'medium' | 'high',
    active: true,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  };

  try {
    await db.collection("alerts").doc(alertId).set(alert);
    return { success: true, alertId };
  } catch (error) {
    console.error("Error sending official alert:", error);
    throw new HttpsError("internal", "Failed to send official alert.");
  }
});

export const resolveReport = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated.");
  }

  const { reportId } = request.data;
  if (!reportId) {
    throw new HttpsError("invalid-argument", "reportId is required.");
  }

  try {
    await db.collection("reports").doc(reportId).update({
      status: "resolved",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    console.error("Error resolving report:", error);
    throw new HttpsError("internal", "Failed to resolve report.");
  }
});

// ============================================================================
// AGENT 5 TRIGGER (Called from Authority Dashboard)
// ============================================================================
export const triggerImpactEvaluation = onCall(async (request) => {
  const { crisisId } = request.data;
  if (!crisisId) {
    throw new HttpsError("invalid-argument", "crisisId is required");
  }

  const crisisDoc = await db.collection("crises").doc(crisisId).get();
  if (!crisisDoc.exists) {
    throw new HttpsError("not-found", "Crisis not found");
  }

  const crisisData = crisisDoc.data() as any;

  // Gather fresh signals (weather and community reports from the last hour for this city)
  const oneHourAgo = new Date();
  oneHourAgo.setHours(oneHourAgo.getHours() - 1);
  const freshSignalsSnap = await db.collection("raw_signals")
    .where("city", "==", crisisData.city)
    .where("createdAt", ">=", admin.firestore.Timestamp.fromDate(oneHourAgo))
    .get();

  const freshSignals = freshSignalsSnap.docs.map(d => d.data().text);
  
  // Extract actions taken from the plan
  const actionsTaken = crisisData.agent2Plan?.actionPlan?.map((item: any) => 
    `${item.action} at ${item.target || item.authority}`
  ) || [];

  // Dynamically import Agent 5 to avoid Firebase initialization race conditions
  const { evaluateImpact } = await import("./ai/flows/evaluateImpact");

  try {
    const result = await evaluateImpact({
      crisisId,
      originalSeverity: crisisData.severity,
      originalAffectedArea: crisisData.affectedArea,
      city: crisisData.city,
      actionsTaken,
      freshSignals
    });
    return { success: true, result };
  } catch (e: any) {
    console.error("Agent 5 Evaluation Failed:", e);
    throw new HttpsError("internal", "Agent 5 failed to evaluate impact");
  }
});

// ============================================================================
// AGENTIC AI PIPELINE (Genkit)
// ============================================================================
export * from "./ai/index";

// ============================================================================
// DATA COLLECTION + ORCHESTRATION (Scheduled Functions + Firestore Triggers)
// ============================================================================
export * from "./pipeline";
export * from "./verificationLoop";