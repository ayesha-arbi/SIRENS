import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { CitizenProfile, AlertPreferences, Report, Poll } from "./types";

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
      const pollDoc = await tx.get(pollRef);

      if (!pollDoc.exists) {
        throw new HttpsError("not-found", "Poll not found.");
      }

      const pollData = pollDoc.data()!;
      const yesVotes: string[] = pollData.yesVotes || [];
      const noVotes: string[] = pollData.noVotes || [];

      if (yesVotes.includes(uid) || noVotes.includes(uid)) {
        throw new HttpsError("already-exists", "You have already voted on this poll.");
      }

      const field = vote === "yes" ? "yesVotes" : "noVotes";
      tx.update(pollRef, { [field]: admin.firestore.FieldValue.arrayUnion(uid) });
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

// ============================================================================
// AGENTIC AI PIPELINE (Genkit)
// ============================================================================
export * from "./ai/index";

// ============================================================================
// DATA COLLECTION + ORCHESTRATION (Scheduled Functions + Firestore Triggers)
// ============================================================================
export * from "./pipeline";
export * from "./verificationLoop";
