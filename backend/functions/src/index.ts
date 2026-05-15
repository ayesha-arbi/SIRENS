import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { CitizenProfile, AlertPreferences, Report, Poll } from "./types";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const bucket = admin.storage().bucket();

export const getUploadUrl = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated.");
  }

  const { fileType = "image/jpeg", fileExtension = "jpg" } = request.data;
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

  try {
    const pollRef = db.collection("polls").doc(pollId);
    const pollDoc = await pollRef.get();

    if (!pollDoc.exists) {
      throw new HttpsError("not-found", "Poll not found.");
    }

    const pollData = pollDoc.data()!;
    const yesVotes = pollData.yesVotes || [];
    const noVotes = pollData.noVotes || [];

    if (yesVotes.includes(uid) || noVotes.includes(uid)) {
      throw new HttpsError("already-exists", "You have already voted on this poll.");
    }

    if (vote === "yes") {
      await pollRef.update({ yesVotes: admin.firestore.FieldValue.arrayUnion(uid) });
    } else {
      await pollRef.update({ noVotes: admin.firestore.FieldValue.arrayUnion(uid) });
    }

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
      .limit(20)
      .get();

    const reports = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as Report) }));

    const filteredReports = reports.filter(report => {
      const cat = report.category;
      if (cat === "traffic" && !profile.preferences?.traffic) return false;
      if (cat === "weather" && !profile.preferences?.weather) return false;
      return true;
    });

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

  const initialProfile: Partial<CitizenProfile> = {
    uid,
    email,
    onboardingComplete: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  try {
    await db.collection("citizens").doc(uid).set(initialProfile, { merge: true });
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