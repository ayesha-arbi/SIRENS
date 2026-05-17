import { ai } from '../genkit';
import { SignalBatchSchema, NormalizedCrisisSchema } from '../schemas';
import * as admin from 'firebase-admin';

/**
 * AGENT 1 — Ingestion + Normalization + Classification
 *
 * Takes a batch of raw signals (community reports, weather APIs, news)
 * and produces a single NormalizedCrisis object with:
 *  - A classified crisis type
 *  - A severity level
 *  - A credibility score (0.0–1.0) based on strict rules
 *  - A clean English description
 *
 * Low confidence → only a personalized alert is sent (PATH A).
 * High confidence → continues to Agent 2 (PATH B).
 */
export const classifySignals = ai.defineFlow(
  {
    name: 'classifySignals',
    inputSchema: SignalBatchSchema,
    outputSchema: NormalizedCrisisSchema,
  },
  async (input) => {
    const response = await ai.generate({
      prompt: `You are SIRENS Agent 1, a crisis classification engine for Pakistani cities.

You will receive a batch of raw signals from ${input.city}. These signals may come from:
- Community reports (often in Roman Urdu, slang, or informal English)
- Weather APIs (structured JSON from Open-Meteo)
- News APIs (headlines from GNews)

Your job is to:
1. NORMALIZE: Translate any Roman Urdu or local slang into standard English. Standardize location names.
2. CLASSIFY: Determine the crisis type. If the signals do not indicate any coherent crisis, return crisisType "none".
3. SCORE CREDIBILITY (this is critical — follow these rules exactly):
   - If ANY signal has source "open_meteo" or "gnews", the score MUST be >= 0.85
   - If there are 5 or more community_report signals from the same area, the score MUST be >= 0.75
   - If there are 3-4 community_report signals, the score should be 0.5–0.74
   - If there are only 1-2 community_report signals with NO API confirmation, the score MUST be < 0.4
4. DESCRIBE: Write a clean, factual English description combining context from all signals.
5. SIGNAL IDS: List the "id" field of every signal that contributed to your assessment.

Signals:
${JSON.stringify(input.signals, null, 2)}`,
      output: { schema: NormalizedCrisisSchema },
    });

    const result = response.output;

    // Guard against Gemini returning null (network timeout, model error, etc.)
    if (!result) {
      console.error('[Agent 1] Gemini returned null output. Returning safe fallback.');
      return {
        crisisType: 'none' as const,
        severity: 'low' as const,
        credibilityScore: 0,
        affectedArea: input.city,
        description: 'Agent 1 failed to classify signals — no output from model.',
        contributingSignalIds: input.signals.map(s => s.id),
      };
    }

    // Log the agent's reasoning trace for hackathon grading.
    // Wrapped in try/catch so the flow works locally without Firebase.
    try {
      await admin.firestore().collection('agent_traces').add({
        agent: 'agent1_classify',
        city: input.city,
        inputSignalCount: input.signals.length,
        output: result,
        rawReasoning: response.text,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch {
      // Running locally without Firebase — skip trace logging
      console.log('[Agent 1] Trace logging skipped (no Firestore connection).');
    }

    return result;
  }
);
