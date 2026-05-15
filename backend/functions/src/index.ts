import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { CitizenProfile, LocationDetails, AlertPreferences } from "./types";

// Initialize admin SDK if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Interface to initialize a user profile in the 'citizens' collection.
 * Triggered after successful Firebase Auth signup.
 */
export const initializeUserProfile = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated.");
  }

  const uid = context.auth.uid;
  const email = context.auth.token.email || "";

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
    throw new functions.https.HttpsError("internal", "Failed to initialize user profile.");
  }
});

/**
 * Interface to update onboarding data (City, District, Locations).
 */
export const updateOnboardingData = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated.");
  }

  const uid = context.auth.uid;
  const {
    city,
    district,
    homeLocation,
    workLocation,
    frequentAreas,
    onboardingComplete
  } = data;

  // Simple validation
  if (!city || !district) {
    throw new functions.https.HttpsError("invalid-argument", "City and District are required.");
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
    await db.collection("citizens").doc(uid).update(updates);
    return { success: true, message: "Onboarding data updated." };
  } catch (error) {
    console.error("Error updating onboarding data:", error);
    throw new functions.https.HttpsError("internal", "Failed to update onboarding data.");
  }
});

/**
 * Interface to update user alert preferences.
 */
export const setAlertPreferences = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated.");
  }

  const uid = context.auth.uid;
  const { preferences }: { preferences: AlertPreferences } = data;

  try {
    await db.collection("citizens").doc(uid).update({
      preferences,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { success: true, message: "Preferences updated." };
  } catch (error) {
    console.error("Error updating preferences:", error);
    throw new functions.https.HttpsError("internal", "Failed to update preferences.");
  }
});
