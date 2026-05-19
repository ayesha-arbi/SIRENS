"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.triggerImpactEvaluation = exports.resolveReport = exports.sendOfficialAlert = exports.getSOSList = exports.triggerSOS = exports.setAlertPreferences = exports.updateOnboardingData = exports.initializeUserProfile = exports.getPersonalizedFeed = exports.submitPollVote = exports.createCommunityReport = exports.getUploadUrl = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
const bucket = admin.storage().bucket();
const ALLOWED_MIME_TYPES = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
};
exports.getUploadUrl = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "User must be authenticated.");
    }
    const { fileType = "image/jpeg" } = request.data;
    if (!ALLOWED_MIME_TYPES[fileType]) {
        throw new https_1.HttpsError("invalid-argument", `Unsupported file type. Allowed types: ${Object.keys(ALLOWED_MIME_TYPES).join(", ")}`);
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
exports.createCommunityReport = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "User must be authenticated.");
    }
    const uid = request.auth.uid;
    const { imageUrl, category, description, location, areaName, city } = request.data;
    if (!imageUrl || !category || !location || !city) {
        throw new https_1.HttpsError("invalid-argument", "Image, Category, Location, and City are required.");
    }
    // Validate location shape before constructing a GeoPoint.
    if (typeof location.latitude !== "number" ||
        typeof location.longitude !== "number") {
        throw new https_1.HttpsError("invalid-argument", "location must have numeric latitude and longitude.");
    }
    const reportId = db.collection("reports").doc().id;
    const report = {
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
    const poll = {
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
    }
    catch (error) {
        console.error("Error creating community report:", error);
        throw new https_1.HttpsError("internal", "Failed to create report and poll.");
    }
});
exports.submitPollVote = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "User must be authenticated.");
    }
    const uid = request.auth.uid;
    const { pollId, vote } = request.data;
    if (vote !== "yes" && vote !== "no") {
        throw new https_1.HttpsError("invalid-argument", "vote must be 'yes' or 'no'.");
    }
    const pollRef = db.collection("polls").doc(pollId);
    try {
        await db.runTransaction(async (tx) => {
            const pollDoc = await tx.get(pollRef);
            if (!pollDoc.exists) {
                throw new https_1.HttpsError("not-found", "Poll not found.");
            }
            const pollData = pollDoc.data();
            const yesVotes = pollData.yesVotes || [];
            const noVotes = pollData.noVotes || [];
            if (yesVotes.includes(uid) || noVotes.includes(uid)) {
                throw new https_1.HttpsError("already-exists", "You have already voted on this poll.");
            }
            const field = vote === "yes" ? "yesVotes" : "noVotes";
            tx.update(pollRef, { [field]: admin.firestore.FieldValue.arrayUnion(uid) });
        });
        return { success: true };
    }
    catch (error) {
        if (error instanceof https_1.HttpsError)
            throw error;
        console.error("Error submitting poll vote:", error);
        throw new https_1.HttpsError("internal", "Failed to submit vote.");
    }
});
exports.getPersonalizedFeed = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "User must be authenticated.");
    }
    const uid = request.auth.uid;
    const userDoc = await db.collection("citizens").doc(uid).get();
    if (!userDoc.exists) {
        throw new https_1.HttpsError("not-found", "User profile not found. Please complete onboarding.");
    }
    const profile = userDoc.data();
    try {
        const snapshot = await db.collection("reports")
            .where("city", "==", profile.city)
            .orderBy("timestamp", "desc")
            // Fetch extra docs so the in-memory preference filter still returns a full page.
            .limit(60)
            .get();
        const reports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const filteredReports = reports
            .filter(report => {
            const cat = report.category;
            if (cat === "traffic" && !profile.preferences?.traffic)
                return false;
            if (cat === "weather" && !profile.preferences?.weather)
                return false;
            return true;
        })
            .slice(0, 20);
        return { reports: filteredReports };
    }
    catch (error) {
        console.error("Error fetching personalized feed:", error);
        throw new https_1.HttpsError("internal", "Failed to fetch feed.");
    }
});
exports.initializeUserProfile = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "User must be authenticated.");
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
        const initialProfile = {
            uid,
            email,
            onboardingComplete: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        await docRef.set(initialProfile);
        return { success: true, message: "User profile initialized." };
    }
    catch (error) {
        console.error("Error initializing user profile:", error);
        throw new https_1.HttpsError("internal", "Failed to initialize user profile.");
    }
});
exports.updateOnboardingData = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "User must be authenticated.");
    }
    const uid = request.auth.uid;
    const { city, district, homeLocation, workLocation, frequentAreas, onboardingComplete } = request.data;
    if (!city || !district) {
        throw new https_1.HttpsError("invalid-argument", "City and District are required.");
    }
    const updates = {
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
    }
    catch (error) {
        console.error("Error updating onboarding data:", error);
        throw new https_1.HttpsError("internal", "Failed to update onboarding data.");
    }
});
exports.setAlertPreferences = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "User must be authenticated.");
    }
    const uid = request.auth.uid;
    const { preferences } = request.data;
    // Runtime validation — reject malformed or missing preference fields.
    if (typeof preferences?.weather !== "boolean" ||
        typeof preferences?.traffic !== "boolean" ||
        typeof preferences?.highSeverityOnly !== "boolean" ||
        !["push", "email", "sms"].includes(preferences?.notificationChannel)) {
        throw new https_1.HttpsError("invalid-argument", "preferences must include weather (bool), traffic (bool), highSeverityOnly (bool), and notificationChannel ('push'|'email'|'sms').");
    }
    const validatedPreferences = {
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
    }
    catch (error) {
        console.error("Error updating preferences:", error);
        throw new https_1.HttpsError("internal", "Failed to update preferences.");
    }
});
exports.triggerSOS = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "User must be authenticated.");
    }
    const uid = request.auth.uid;
    const { location, message = "Emergency signal triggered" } = request.data;
    if (!location || typeof location.latitude !== "number" || typeof location.longitude !== "number") {
        throw new https_1.HttpsError("invalid-argument", "Valid location (lat/lng) is required for SOS.");
    }
    const sosId = db.collection("sos_signals").doc().id;
    const sosSignal = {
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
    }
    catch (error) {
        console.error("Error triggering SOS:", error);
        throw new https_1.HttpsError("internal", "Failed to send SOS signal.");
    }
});
exports.getSOSList = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "User must be authenticated.");
    }
    try {
        const snapshot = await db.collection("sos_signals")
            .where("status", "==", "pending")
            .orderBy("timestamp", "desc")
            .get();
        const signals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return { signals };
    }
    catch (error) {
        console.error("Error fetching SOS list:", error);
        throw new https_1.HttpsError("internal", "Failed to fetch SOS signals.");
    }
});
exports.sendOfficialAlert = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "User must be authenticated.");
    }
    const { title, message, city, severity } = request.data;
    if (!title || !message || !city || !severity) {
        throw new https_1.HttpsError("invalid-argument", "Title, Message, City, and Severity are required.");
    }
    const alertId = db.collection("alerts").doc().id;
    const alert = {
        alertId,
        title,
        message,
        city,
        severity: severity,
        active: true,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
    };
    try {
        await db.collection("alerts").doc(alertId).set(alert);
        return { success: true, alertId };
    }
    catch (error) {
        console.error("Error sending official alert:", error);
        throw new https_1.HttpsError("internal", "Failed to send official alert.");
    }
});
exports.resolveReport = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "User must be authenticated.");
    }
    const { reportId } = request.data;
    if (!reportId) {
        throw new https_1.HttpsError("invalid-argument", "reportId is required.");
    }
    try {
        await db.collection("reports").doc(reportId).update({
            status: "resolved",
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { success: true };
    }
    catch (error) {
        console.error("Error resolving report:", error);
        throw new https_1.HttpsError("internal", "Failed to resolve report.");
    }
});
// ============================================================================
// AGENT 5 TRIGGER (Called from Authority Dashboard)
// ============================================================================
exports.triggerImpactEvaluation = (0, https_1.onCall)(async (request) => {
    const { crisisId } = request.data;
    if (!crisisId) {
        throw new https_1.HttpsError("invalid-argument", "crisisId is required");
    }
    const crisisDoc = await db.collection("crises").doc(crisisId).get();
    if (!crisisDoc.exists) {
        throw new https_1.HttpsError("not-found", "Crisis not found");
    }
    const crisisData = crisisDoc.data();
    // Gather fresh signals (weather and community reports from the last hour for this city)
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);
    const freshSignalsSnap = await db.collection("raw_signals")
        .where("city", "==", crisisData.city)
        .where("createdAt", ">=", admin.firestore.Timestamp.fromDate(oneHourAgo))
        .get();
    const freshSignals = freshSignalsSnap.docs.map(d => d.data().text);
    // Extract actions taken from the plan
    const actionsTaken = crisisData.agent2Plan?.actionPlan?.map((item) => `${item.action} at ${item.target || item.authority}`) || [];
    // Dynamically import Agent 5 to avoid Firebase initialization race conditions
    const { evaluateImpact } = await Promise.resolve().then(() => __importStar(require("./ai/flows/evaluateImpact")));
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
    }
    catch (e) {
        console.error("Agent 5 Evaluation Failed:", e);
        throw new https_1.HttpsError("internal", "Agent 5 failed to evaluate impact");
    }
});
// ============================================================================
// AGENTIC AI PIPELINE (Genkit)
// ============================================================================
__exportStar(require("./ai/index"), exports);
// ============================================================================
// DATA COLLECTION + ORCHESTRATION (Scheduled Functions + Firestore Triggers)
// ============================================================================
__exportStar(require("./pipeline"), exports);
__exportStar(require("./verificationLoop"), exports);
//# sourceMappingURL=index.js.map