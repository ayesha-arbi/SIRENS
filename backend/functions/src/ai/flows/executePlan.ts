import { ai } from '../genkit';
import { z } from 'zod';
import * as admin from 'firebase-admin';
import { Agent2OutputSchema } from '../schemas';
import { 
  sendAlertTool, 
  notifyAuthorityTool, 
  dispatchResourceTool, 
  rerouteTrafficTool, 
  requestVerificationTool 
} from '../tools';

const db = admin.firestore();

const Agent3InputSchema = z.object({
  crisisId: z.string(),
  crisisType: z.string(),
  city: z.string(),
  affectedArea: z.string(),
  plan: Agent2OutputSchema,
});

/**
 * AGENT 3 — The Executor
 *
 * Takes the finalized Action Plan from Agent 2.
 * Equips Gemini with the 5 System Tools and instructs it to autonomously 
 * trigger those tools to execute the plan in the real world.
 */
export const executePlan = ai.defineFlow(
  {
    name: 'executePlan',
    inputSchema: Agent3InputSchema,
    outputSchema: z.object({
      success: z.boolean(),
      executionLog: z.string(),
    }),
  },
  async (input) => {
    
    // The prompt for Agent 3
    const prompt = `
You are SIRENS Agent 3 (The Executor).
Your job is to read the Action Plan and trigger the appropriate tools to execute it.

CRISIS DETAILS:
ID: ${input.crisisId}
Type: ${input.crisisType}
Location: ${input.affectedArea}, ${input.city}

ACTION PLAN TO EXECUTE:
${JSON.stringify(input.plan, null, 2)}

INSTRUCTIONS:
1. Review the 'actions' array in the plan.
2. Call the correct tools to fulfill each action.
3. If the plan says 'request_verification', call the requestVerification tool.
4. If the plan includes 'dispatch_rescue_team' or 'dispatch_medical_unit', call the dispatchResource tool for EACH resource listed in 'assignedResources'.
5. Once all tools have been successfully called, provide a short summary of what you executed.
    `;

    // We pass the 5 tools directly to Gemini so it can call them autonomously
    const response = await ai.generate({
      prompt: prompt,
      tools: [
        sendAlertTool,
        notifyAuthorityTool,
        dispatchResourceTool,
        rerouteTrafficTool,
        requestVerificationTool
      ],
      // Genkit will automatically call the tools and return the final text
    });

    // Mark the crisis as "executing" in Firestore
    try {
      await db.collection('crises').doc(input.crisisId).set({
        status: 'executing',
        executionLog: response.text,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    } catch (e) {
      console.warn('[Agent 3] Could not update crisis status:', e);
    }

    return {
      success: true,
      executionLog: response.text,
    };
  }
);
