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

// ── 4. REROUTE TRAFFIC TOOL (GOOGLE MAPS INTEGRATION) ──────────────────────────
export const rerouteTrafficTool = ai.defineTool(
  {
    name: 'rerouteTraffic',
    description: 'Marks an area as a danger zone and generates a real alternate route using Google Maps Directions API.',
    inputSchema: z.object({
      crisisId: z.string(),
      dangerAreaName: z.string(),
      detourOrigin: z.string().describe('Safe starting point for the detour (e.g., "F-8 Markaz, Islamabad")'),
      detourDestination: z.string().describe('Safe ending point for the detour (e.g., "G-11 Markaz, Islamabad")'),
    }),
  },
  async (input) => {
    let mapData = {
      distance: 'N/A',
      duration: 'N/A',
      polyline: '',
      status: 'Maps API Skipped (No Key)'
    };

    const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY;

    if (apiKey) {
      try {
        const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(input.detourOrigin)}&destination=${encodeURIComponent(input.detourDestination)}&key=${apiKey}`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.status === 'OK' && data.routes.length > 0) {
          const route = data.routes[0];
          const leg = route.legs[0];
          
          mapData = {
            distance: leg.distance.text,
            duration: leg.duration.text,
            polyline: route.overview_polyline.points, // Encoded polyline for the frontend to draw
            status: 'OK'
          };
          console.log(`[Google Maps] Generated route: ${mapData.distance} (${mapData.duration})`);
        } else {
          console.warn('[Google Maps] Directions API failed to find a route:', data.status);
          mapData.status = data.status;
        }
      } catch (e) {
        console.error('[Google Maps] API Request Failed:', e);
        mapData.status = 'Fetch Error';
      }
    }

    // Save danger zone and real routing data for the Live Crisis Map
    await db.collection('danger_zones').add({
      crisisId: input.crisisId,
      dangerAreaName: input.dangerAreaName,
      detourOrigin: input.detourOrigin,
      detourDestination: input.detourDestination,
      routeDistance: mapData.distance,
      routeDuration: mapData.duration,
      routePolyline: mapData.polyline,
      apiStatus: mapData.status,
      active: true,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { 
      success: true, 
      message: `Traffic rerouted around ${input.dangerAreaName}. Alternate route generated: ${mapData.distance}, ETA: ${mapData.duration}.` 
    };
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
      yesVotes: [],
      noVotes: [],
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { success: true, message: `Verification request broadcasted to citizens in ${input.areaName}.` };
  }
);

// ── 6. UPDATE MAP TOOL ───────────────────────────────────────────────────────
export const updateMapTool = ai.defineTool(
  {
    name: 'updateMap',
    description: 'Shrinks or clears a danger zone on the live map after crisis resolution.',
    inputSchema: z.object({
      crisisId: z.string(),
      action: z.enum(['shrink_danger_zone', 'clear_danger_zone']),
      targetArea: z.string(),
      newRadiusKm: z.number(),
    }),
  },
  async (input) => {
    const snap = await db.collection('danger_zones')
      .where('crisisId', '==', input.crisisId)
      .get();

    const batch = db.batch();
    snap.docs.forEach(doc => {
      if (input.action === 'clear_danger_zone') {
        batch.update(doc.ref, { active: false });
      } else {
        batch.update(doc.ref, { newRadiusKm: input.newRadiusKm });
      }
    });
    await batch.commit();

    return { success: true, message: `Danger zone ${input.action} for ${input.targetArea}.` };
  }
);

// ── 7. RESOLVE CRISIS TOOL ───────────────────────────────────────────────────
export const resolveCrisisTool = ai.defineTool(
  {
    name: 'resolveCrisis',
    description: 'Marks a crisis as resolved and frees up all assigned resources.',
    inputSchema: z.object({
      crisisId: z.string(),
      effectivenessScore: z.number(),
      impactSummary: z.string(),
    }),
  },
  async (input) => {
    // Mark crisis resolved
    await db.collection('crises').doc(input.crisisId).set({
      status: 'resolved',
      effectivenessScore: input.effectivenessScore,
      impactSummary: input.impactSummary,
      resolvedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    // Free up all resources assigned to this crisis
    const resourcesSnap = await db.collection('resources')
      .where('currentAssignment', '==', input.crisisId)
      .get();

    const batch = db.batch();
    resourcesSnap.docs.forEach(doc => {
      batch.update(doc.ref, {
        available: true,
        currentAssignment: null,
        destination: null,
      });
    });
    await batch.commit();

    return { success: true, message: `Crisis ${input.crisisId} resolved. Resources freed.` };
  }
);

// ── 8. SEND UPDATE ALERT TOOL ────────────────────────────────────────────────
export const sendUpdateAlertTool = ai.defineTool(
  {
    name: 'sendUpdateAlert',
    description: 'Sends a resolution notification to citizens letting them know the crisis is handled.',
    inputSchema: z.object({
      crisisId: z.string(),
      city: z.string(),
      affectedArea: z.string(),
      publicUpdate: z.string(),
    }),
  },
  async (input) => {
    await db.collection('alerts').add({
      type: 'resolution',
      crisisId: input.crisisId,
      city: input.city,
      affectedArea: input.affectedArea,
      title: `✅ Situation Update — ${input.affectedArea}`,
      message: input.publicUpdate,
      active: true,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true, message: `Resolution alert sent for ${input.affectedArea}.` };
  }
);
