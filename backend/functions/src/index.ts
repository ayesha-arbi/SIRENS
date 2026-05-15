import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { CitizenProfile, AlertPreferences } from "./types";

// Initialize admin SDK if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Initialize a user profile in the 'citizens' collection.
 * Triggered after successful Firebase Auth signup.
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

  // Simple validation
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
    await db.collection("citizens").doc(uid).update(updates);
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
    await db.collection("citizens").doc(uid).update({
      preferences,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { success: true, message: "Preferences updated." };
  } catch (error) {
    console.error("Error updating preferences:", error);
    throw new HttpsError("internal", "Failed to update preferences.");
  }
});