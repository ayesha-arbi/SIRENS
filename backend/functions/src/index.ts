import * as admin from "firebase-admin";
<<<<<<< HEAD
import { CitizenProfile, AlertPreferences, Report, Poll } from "./types";
=======
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { CitizenProfile, AlertPreferences } from "./types";
>>>>>>> 3e556d4b72ce79ce561b5ddbceeb70d60fc6a56a

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const bucket = admin.storage().bucket();

/**
 * Generates a signed URL for a user to upload an image directly to Firebase Storage.
 * This avoids sending large binary data through the Cloud Function.
 */
export const getUploadUrl = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated.");
  }

  const { fileType = "image/jpeg", fileExtension = "jpg" } = data;

  const fileName = `reports/${context.auth.uid}/${Date.now()}.${fileExtension}`;
  const file = bucket.file(fileName);

  // Generate a signed URL valid for 15 minutes
  const [url] = await file.getSignedUrl({
    version: "v4",
    action: "write",
    expires: Date.now() + 15 * 60 * 1000,
    contentType: fileType,
  });

  return { uploadUrl: url, filePath: fileName };
});

/**
 * Creates a community report and automatically generates a corresponding poll.
 */
export const createCommunityReport = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated.");
  }

  const uid = context.auth.uid;
  const { imageUrl, category, description, location, areaName, city } = data;

  if (!imageUrl || !category || !location || !city) {
    throw new functions.https.HttpsError("invalid-argument", "Image, Category, Location, and City are required.");
  }

  const reportId = db.collection("reports").doc().id;

  const report: Report = {
    reportId,
    userId: uid,
    imageUrl,
    category,
    description,
    location: new admin.firestore.GeoPoint(location.latitude, location.longitude),
    areaName,
    city,
    timestamp: admin.firestore.Timestamp.now(),
    status: "active",
  };

  const poll: Poll = {
    pollId: `poll_${reportId}`,
    reportId: reportId,
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
    throw new functions.https.HttpsError("internal", "Failed to create report and poll.");
  }
});

/**
 * Submits a vote to a community poll.
 */
export const submitPollVote = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated.");
  }

  const uid = context.auth.uid;
  const { pollId, vote } = data;

  if (vote !== 'yes' && vote !== 'no') {
    throw new functions.https.HttpsError("invalid-argument", "vote must be 'yes' or 'no'.");
  }

  try {
    const pollRef = db.collection("polls").doc(pollId);
    const pollDoc = await pollRef.get();

    if (!pollDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Poll not found.");
    }

    const pollData = pollDoc.data()!;
    const yesVotes = pollData.yesVotes || [];
    const noVotes = pollData.noVotes || [];

    if (yesVotes.includes(uid) || noVotes.includes(uid)) {
      throw new functions.https.HttpsError("already-exists", "You have already voted on this poll.");
    }

    if (vote === 'yes') {
      await pollRef.update({ yesVotes: admin.firestore.FieldValue.arrayUnion(uid) });
    } else {
      await pollRef.update({ noVotes: admin.firestore.FieldValue.arrayUnion(uid) });
    }

    return { success: true };
  } catch (error) {
    if (error instanceof functions.https.HttpsError) throw error;
    console.error("Error submitting poll vote:", error);
    throw new functions.https.HttpsError("internal", "Failed to submit vote.");
  }
});

/**
 * Fetches a personalized feed of reports based on the citizen's profile.
 */
export const getPersonalizedFeed = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated.");
  }

  const uid = context.auth.uid;
  const userDoc = await db.collection("citizens").doc(uid).get();

  if (!userDoc.exists) {
    throw new functions.https.HttpsError("not-found", "User profile not found. Please complete onboarding.");
  }

  const profile = userDoc.data()!;

  try {
    // 1. Fetch reports from the user's own city/district
    const cityQuery = db.collection("reports")
      .where("city", "==", profile.city)
      .orderBy("timestamp", "desc")
      .limit(20);

    // 2. Filter by preferences (e.g., only show traffic if traffic: true)
    const snapshot = await cityQuery.get();
    const reports = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as Report) }));

    const filteredReports = reports.filter(report => {
      const cat = report.category;
      if (cat === 'traffic' && !profile.preferences?.traffic) return false;
      if (cat === 'weather' && !profile.preferences?.weather) return false;
      return true;
    });

    return { reports: filteredReports };
  } catch (error) {
    console.error("Error fetching personalized feed:", error);
    throw new functions.https.HttpsError("internal", "Failed to fetch feed.");
  }
});

/**
<<<<<<< HEAD
 * Interface to initialize a user profile in the 'citizens' collection.
=======
 * Initialize a user profile in the 'citizens' collection.
 * Triggered after successful Firebase Auth signup.
>>>>>>> 3e556d4b72ce79ce561b5ddbceeb70d60fc6a56a
 */
export const initializeUserProfile = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated.");
  }

  const uid = request.auth.uid;
  const email = request.auth.token.email || "";

  const initialProfile: Partial<CitizenProfile> = {
    uid,
    email,
    onboardingComplete: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp() as unknown as Date,
    updatedAt: admin.firestore.FieldValue.serverTimestamp() as unknown as Date,
  };

  try {
    await db.collection("citizens").doc(uid).set(initialProfile, { merge: true });
    return { success: true, message: "User profile initialized." };
  } catch (error) {
    console.error("Error initializing user profile:", error);
    throw new HttpsError("internal", "Failed to initialize user profile.");
  }
});

/**
 * Update onboarding data (City, District, Locations).
 */
export const updateOnboardingData = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated.");
  }

  const uid = request.auth.uid;
  const {
    city,
    district,
    homeLocation,
    workLocation,
    frequentAreas,
    onboardingComplete,
  } = request.data;

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
    updatedAt: admin.firestore.FieldValue.serverTimestamp() as unknown as Date,
  };

  try {
    await db.collection("citizens").doc(uid).set(updates, { merge: true });
    return { success: true, message: "Onboarding data updated." };
  } catch (error) {
    console.error("Error updating onboarding data:", error);
    throw new HttpsError("internal", "Failed to update onboarding data.");
  }
});

/**
 * Update user alert preferences.
 */
export const setAlertPreferences = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated.");
  }

  const uid = request.auth.uid;
  const { preferences }: { preferences: AlertPreferences } = request.data;

  try {
    await db.collection("citizens").doc(uid).set({
      preferences,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    return { success: true, message: "Preferences updated." };
  } catch (error) {
    console.error("Error updating preferences:", error);
    throw new HttpsError("internal", "Failed to update preferences.");
  }
});