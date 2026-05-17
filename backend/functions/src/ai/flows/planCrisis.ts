import { ai } from '../genkit';
import { NormalizedCrisisSchema, Agent2OutputSchema } from '../schemas';
import * as admin from 'firebase-admin';

import { AGENT2_BASE_PROMPT, CRISIS_SKILLS } from '../prompts/agent2Rules';

const db = admin.firestore();

/**
 * AGENT 2 — Crisis Analysis & Action Planner
 *
 * Takes the high-confidence NormalizedCrisis from Agent 1.
 * Uses Gemini to evaluate the specific crisis against the SIRENS Skill Rules.
 * Outputs a strict Impact Analysis and a prioritized Action Plan.
 */
export const planCrisis = ai.defineFlow(
  {
    name: 'planCrisis',
    inputSchema: NormalizedCrisisSchema,
    outputSchema: Agent2OutputSchema,
  },
  async (crisis) => {
    
    // ── 1. Fetch Dynamic Resources from Firestore ──
    // Instead of hardcoding, we query the DB for currently available units.
    const [rescueSnap, medicalSnap, authSnap] = await Promise.all([
      db.collection('resources').where('type', '==', 'rescue_team').where('available', '==', true).get(),
      db.collection('resources').where('type', '==', 'medical_unit').where('available', '==', true).get(),
      db.collection('authorities').get()
    ]);

    const availableRescueTeams = rescueSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const availableMedicalUnits = medicalSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    
    // Convert authorities docs into a map: { "flood": "NDMA", etc }
    const authoritiesMap: Record<string, string> = {};
    authSnap.docs.forEach(d => {
      const data = d.data();
      authoritiesMap[data.crisisType] = data.name;
    });

    // ── 2. Select the specific skill rule for this crisis type ──
    const specificSkillRule = CRISIS_SKILLS[crisis.crisisType] || CRISIS_SKILLS['none'];

    const dynamicContext = `
SPECIFIC CRISIS SKILL RULE TO APPLY:
${specificSkillRule}

AVAILABLE RESOURCES:
Rescue Teams: ${JSON.stringify(availableRescueTeams.length ? availableRescueTeams : 'None currently available')}
Medical Units: ${JSON.stringify(availableMedicalUnits.length ? availableMedicalUnits : 'None currently available')}
Authorities: ${JSON.stringify(authoritiesMap)}
    `;

    // Fetch alternate route from Google Maps Directions API
    const googleKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
    let alternateRoute = null;

    if (googleKey && crisis.affectedArea) {
      try {
        const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(crisis.affectedArea)}&destination=${encodeURIComponent('City Center, Pakistan')}&alternatives=true&key=${googleKey}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.status === 'OK' && data.routes?.length > 0) {
          const route = data.routes[1] || data.routes[0];
          alternateRoute = {
            summary: route.summary,
            duration: route.legs[0].duration.text,
            distance: route.legs[0].distance.text,
          };
        }
      } catch (e) {
        console.warn('[Agent 2] Failed to fetch alternate route:', e);
      }
    }

    const response = await ai.generate({
      prompt: `
${AGENT2_BASE_PROMPT}

${dynamicContext}

---
CRISIS TO ANALYZE:
${JSON.stringify(crisis, null, 2)}

ALTERNATE ROUTE (From Google Maps):
${alternateRoute ? JSON.stringify(alternateRoute, null, 2) : "No alternate route found. Rely on manual rerouting."}
      `,
      output: { schema: Agent2OutputSchema },
    });

    const result = response.output;

    if (!result) {
      throw new Error('[Agent 2] Failed to generate action plan.');
    }

    // Log the reasoning trace
    try {
      await admin.firestore().collection('agent_traces').add({
        agent: 'agent2_plan',
        affectedArea: crisis.affectedArea,
        output: result,
        rawReasoning: response.text,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch {
      console.log('[Agent 2] Trace logging skipped (no Firestore connection).');
    }

    return result;
  }
);
