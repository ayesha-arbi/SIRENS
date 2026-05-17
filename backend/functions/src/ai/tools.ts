import { ai } from './genkit';
import { z } from 'zod';
import * as admin from 'firebase-admin';

const db = admin.firestore();

// ── 1. SEND ALERT TOOL ───────────────────────────────────────────────────────
export const sendAlertTool = ai.defineTool(
  {
    name: 'sendAlert',
    description: 'Sends a personalized or public push notification alert to citizens.',
    inputSchema: z.object({
      alertType: z.enum(['public', 'personalized']),
      title: z.string(),
      message: z.string(),
      city: z.string(),
      affectedArea: z.string(),
    }),
  },
  async (input) => {
    // In production, this would trigger FCM (Firebase Cloud Messaging)
    // Here we save it to the 'alerts' collection for the Citizen Mobile App
    const alertRef = await db.collection('alerts').add({
      ...input,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      read: false
    });
    return { success: true, alertId: alertRef.id, message: `Alert sent to ${input.city}` };
  }
);

// ── 2. NOTIFY AUTHORITY TOOL ─────────────────────────────────────────────────
export const notifyAuthorityTool = ai.defineTool(
  {
    name: 'notifyAuthority',
    description: 'Routes the crisis to a specific authority dashboard (e.g., NDMA, Rescue 1122).',
    inputSchema: z.object({
      authorityName: z.string(),
      crisisId: z.string(),
      priority: z.enum(['high', 'critical', 'medium', 'low']),
      message: z.string(),
    }),
  },
  async (input) => {
    // Save to the Authority Command Center web interface queue
    await db.collection('authority_notifications').add({
      ...input,
      status: 'pending_review',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { success: true, message: `Authority ${input.authorityName} notified.` };
  }
);

// ── 3. DISPATCH RESOURCE TOOL ────────────────────────────────────────────────
export const dispatchResourceTool = ai.defineTool(
  {
    name: 'dispatchResource',
    description: 'Dispatches an available rescue team or medical unit and marks them as busy.',
    inputSchema: z.object({
      resourceId: z.string(),
      resourceName: z.string(),
      crisisId: z.string(),
      destinationArea: z.string(),
    }),
  },
  async (input) => {
    // Update resource availability (using set with merge so it creates mock data if missing)
    await db.collection('resources').doc(input.resourceId).set({
      available: false,
      currentAssignment: input.crisisId,
      destination: input.destinationArea
    }, { merge: true });
    return { success: true, message: `${input.resourceName} dispatched to ${input.destinationArea}.` };
  }
);

// ── 4. REROUTE TRAFFIC TOOL ──────────────────────────────────────────────────
export const rerouteTrafficTool = ai.defineTool(
  {
    name: 'rerouteTraffic',
    description: 'Marks an area as a danger zone to reroute traffic in the Citizen App.',
    inputSchema: z.object({
      crisisId: z.string(),
      dangerAreaName: z.string(),
      alternateRouteSummary: z.string().optional(),
    }),
  },
  async (input) => {
    // Save danger zone for the Live Crisis Map
    await db.collection('danger_zones').add({
      ...input,
      active: true,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { success: true, message: `Traffic rerouted around ${input.dangerAreaName}.` };
  }
);

// ── 5. REQUEST VERIFICATION TOOL (FEEDBACK LOOP) ─────────────────────────────
export const requestVerificationTool = ai.defineTool(
  {
    name: 'requestVerification',
    description: 'Asks nearby citizens on the mobile app to visually confirm a low-confidence crisis.',
    inputSchema: z.object({
      crisisId: z.string(),
      areaName: z.string(),
      crisisType: z.string(),
    }),
  },
  async (input) => {
    // Push a verification prompt to the Citizen App Verification Hub
    await db.collection('verification_requests').add({
      ...input,
      status: 'awaiting_citizen_input',
      yesVotes: 0,
      noVotes: 0,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { success: true, message: `Verification request broadcasted to citizens in ${input.areaName}.` };
  }
);
