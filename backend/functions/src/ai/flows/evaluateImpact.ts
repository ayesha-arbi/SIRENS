import { ai } from '../genkit';
import * as admin from 'firebase-admin';
import { Agent5InputSchema, Agent5OutputSchema } from '../schemas';
import { updateMapTool, resolveCrisisTool, sendUpdateAlertTool } from '../tools';

/**
 * AGENT 5 — Impact & Evaluation Agent (The Watcher)
 *
 * Measures Before vs After impact of crisis response.
 * Updates live maps, frees resources, notifies public.
 */
export const evaluateImpact = ai.defineFlow(
  {
    name: 'evaluateImpact',
    inputSchema: Agent5InputSchema,
    outputSchema: Agent5OutputSchema,
  },
  async (input) => {

    const prompt = `
You are SIRENS Agent 5 (The Watcher).
Your job is to evaluate the effectiveness of the crisis response and determine if the situation is resolved.

ORIGINAL CRISIS:
- Crisis ID: ${input.crisisId}
- Area: ${input.originalAffectedArea}, ${input.city}
- Original Severity: ${input.originalSeverity}

ACTIONS TAKEN BY RESPONSE TEAMS:
${input.actionsTaken.map((a, i) => `${i + 1}. ${a}`).join('\n')}

FRESH SIGNALS (Last 30 minutes):
${input.freshSignals.map((s, i) => `${i + 1}. ${s}`).join('\n')}

EVALUATION RULES:
- If fresh signals confirm situation improved → crisisStatus = "resolved", effectivenessScore > 0.7
- If fresh signals show no improvement → crisisStatus = "requires_more_action", effectivenessScore < 0.5
- If mixed signals → crisisStatus = "requires_more_action", effectivenessScore 0.5-0.7

INSTRUCTIONS:
1. Evaluate the before vs after state.
2. Call updateMap tool to shrink or clear the danger zone.
3. If resolved → call resolveCrisis tool to free up resources.
4. Call sendUpdateAlert tool to notify citizens.
5. Return your structured evaluation.
    `;

    const response = await ai.generate({
      prompt,
      tools: [updateMapTool, resolveCrisisTool, sendUpdateAlertTool],
      output: { schema: Agent5OutputSchema },
    });

    const result = response.output;
    if (!result) throw new Error('[Agent 5] Failed to evaluate impact.');

    // Log Agent 5 trace
    await admin.firestore().collection('agent_traces').add({
      agent: 'agent5_evaluate',
      crisisId: input.crisisId,
      output: result,
      rawReasoning: response.text,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    return result;
  }
);