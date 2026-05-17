import * as admin from 'firebase-admin';
import { onDocumentUpdated } from 'firebase-functions/v2/firestore';

// AGENT 4 (The Resolver) — Triggered by the Verification Feedback Loop
export const onVerificationUpdate = onDocumentUpdated('verification_requests/{requestId}', async (event) => {
  const db = admin.firestore();
  const before = event.data?.before.data();
  const after = event.data?.after.data();

  if (!before || !after) return;

  // We only care if yesVotes went up and hit our threshold (let's use 3 for the hackathon)
  if (after.yesVotes >= 3 && before.yesVotes < 3 && after.status === 'awaiting_citizen_input') {
    
    const crisisId = after.crisisId;
    console.log(`[Feedback Loop] Crisis ${crisisId} verified by citizens! Escalating...`);

    // 1. Mark request as verified
    await event.data?.after.ref.update({ status: 'verified' });

    // 2. Fetch the original crisis
    const crisisRef = db.collection('crises').doc(crisisId);
    const crisisDoc = await crisisRef.get();
    
    if (!crisisDoc.exists) return;
    const crisisData = crisisDoc.data() as any;

    // 3. Boost credibility to 0.95 (High Confidence)
    crisisData.credibilityScore = 0.95;

    // 4. Re-run Agent 2 (Planner)
    console.log(`[Feedback Loop] Re-running Agent 2 for ${crisisId}...`);
    const { planCrisis } = await import('./ai/flows/planCrisis');
    const actionPlan = await planCrisis(crisisData);

    await crisisRef.update({
      credibilityScore: 0.95,
      agent2Plan: actionPlan,
      status: 'planned_verified',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // 5. Re-run Agent 3 (Executor) to actually dispatch the resources
    console.log(`[Feedback Loop] Re-running Agent 3 for ${crisisId}...`);
    const { executePlan } = await import('./ai/flows/executePlan');
    await executePlan({
      crisisId: crisisId,
      crisisType: crisisData.crisisType,
      city: crisisData.city,
      affectedArea: crisisData.affectedArea,
      plan: actionPlan,
    });

    console.log(`[Feedback Loop] Escalation complete for ${crisisId}.`);
  }
});
