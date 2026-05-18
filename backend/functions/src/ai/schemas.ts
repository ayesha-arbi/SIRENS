import { z } from './genkit';

// ─── Input: A single raw signal from any source ───────────────────────────────
export const RawSignalSchema = z.object({
  id: z.string().describe('Unique ID of this signal document in Firestore'),
  source: z.enum(['community_report', 'open_meteo', 'gnews'])
    .describe('Where this signal came from'),
  text: z.string().describe('The raw content — may be in Roman Urdu, English, or noisy informal text'),
  location: z.object({
    lat: z.number(),
    lng: z.number(),
  }).optional().describe('GPS coordinates if available'),
  areaName: z.string().optional().describe('Human-readable area name like "G-10" or "Shahrah-e-Faisal"'),
  city: z.string().optional().describe('City name like "Karachi", "Islamabad"'),
  timestamp: z.string().describe('ISO timestamp of when this signal was recorded'),
});

// ─── Input: A batch of signals to classify ────────────────────────────────────
export const SignalBatchSchema = z.object({
  city: z.string().describe('The city these signals belong to'),
  signals: z.array(RawSignalSchema).describe('Array of raw signals to analyze'),
});

// ─── Output: Agent 1's normalized crisis assessment ───────────────────────────
export const NormalizedCrisisSchema = z.object({
  crisisType: z.enum([
    'flood', 'heatwave', 'accident', 'road_block',
    'power_outage', 'infrastructure', 'fire', 'none',
  ]).describe('The classified crisis type, or "none" if no crisis detected'),
  severity: z.enum(['low', 'medium', 'high', 'critical'])
    .describe('Estimated severity based on signals'),
  credibilityScore: z.number().min(0).max(1)
    .describe('Confidence score: 0.0 = unreliable, 1.0 = fully verified'),
  affectedArea: z.string()
    .describe('Normalized name of the affected area'),
  description: z.string()
    .describe('Clean English summary combining all signal context'),
  contributingSignalIds: z.array(z.string())
    .describe('IDs of the raw signals that contributed to this assessment'),
});

// ─── Agent 2 Output: The Action Plan ──────────────────────────────────────────

export const ImpactAnalysisSchema = z.object({
  affectedRadiusKm: z.number().describe('Estimated radius of impact in kilometers'),
  populationAffected: z.number().describe('Estimated number of people affected'),
  estimatedDurationHours: z.number().describe('Estimated duration of the crisis in hours'),
  spreadRisk: z.enum(['low', 'medium', 'high', 'critical', 'unknown']),
  vulnerableGroups: z.array(z.string()).describe('List of vulnerable demographics'),
  infrastructureRisk: z.array(z.string()).describe('Infrastructure at risk (roads, power grid, etc)'),
});

export const ActionItemSchema = z.object({
  priority: z.number().describe('Execution priority (1 is highest)'),
  action: z.enum([
    'dispatch_rescue_team', 'dispatch_medical_unit', 'send_public_alert',
    'reroute_traffic', 'notify_authority', 'request_water_tankers',
    'open_cooling_centers', 'request_generators', 'request_verification'
  ]).describe('The specific action to take'),
  target: z.string().optional().describe('Target location or area'),
  resource: z.string().optional().describe('Resource ID (e.g., RT01, MU02)'),
  message: z.string().optional().describe('Message content for public alerts'),
  authority: z.string().optional().describe('Authority name to notify'),
  count: z.number().optional().describe('Number of resources requested'),
  reason: z.string().optional().describe('Reason for this action (for verification requests)'),
});

export const Agent2OutputSchema = z.object({
  impactAnalysis: ImpactAnalysisSchema,
  actionPlan: z.array(ActionItemSchema).describe('The filtered list of actions to take based on confidence'),
  assignedRescueTeam: z.string().nullable().describe('Name of rescue team assigned, if any'),
  assignedMedicalUnit: z.string().nullable().describe('Name of medical unit assigned, if any'),
  authorityToNotify: z.string().nullable().describe('Name of authority to notify, if any'),
});


// ─── Agent 5 Input/Output ─────────────────────────────────────────────────────
export const Agent5InputSchema = z.object({
  crisisId: z.string(),
  originalSeverity: z.enum(['low', 'medium', 'high', 'critical']),
  originalAffectedArea: z.string(),
  city: z.string(),
  actionsTaken: z.array(z.string()),
  freshSignals: z.array(z.string()),
});

export const Agent5OutputSchema = z.object({
  effectivenessScore: z.number().min(0).max(1),
  impactSummary: z.string(),
  mapUpdates: z.array(z.object({
    action: z.enum(['shrink_danger_zone', 'clear_danger_zone']),
    targetArea: z.string(),
    newRadiusKm: z.number(),
  })),
  publicUpdate: z.string(),
  crisisStatus: z.enum(['resolved', 'requires_more_action']),
});