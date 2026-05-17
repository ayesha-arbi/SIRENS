require("dotenv").config();
const fetch = (...args) => import("node-fetch").then(({ default: f }) => f(...args));

const GOOGLE_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

// ── Crisis Resource Database (Mock for now) ──
const RESOURCES = {
  rescueTeams: [
    { id: "RT01", name: "Alpha Team", location: "Karachi Central", available: true },
    { id: "RT02", name: "Beta Team", location: "Gulshan-e-Iqbal", available: true },
    { id: "RT03", name: "Gamma Team", location: "DHA Phase 2", available: false },
  ],
  medicalUnits: [
    { id: "MU01", name: "Ambulance 1", available: true },
    { id: "MU02", name: "Ambulance 2", available: true },
  ],
  authorities: {
    flood: { name: "NDMA", contact: "ndma@gov.pk" },
    accident: { name: "Rescue 1122", contact: "1122" },
    power_outage: { name: "LESCO/KESC", contact: "118" },
    heatwave: { name: "Health Department", contact: "health@gov.pk" },
    fire: { name: "Fire Brigade", contact: "16" },
    traffic: { name: "Traffic Police", contact: "traffic@police.gov.pk" },
  }
};

// ── Skills — one per crisis type ─────────────
const CRISIS_SKILLS = {

  flood: async (crisis, route) => {
    const affectedRadius = crisis.severity === "critical" ? 5 :
                           crisis.severity === "high" ? 3 : 1.5;
    const populationAffected = crisis.severity === "critical" ? 50000 :
                               crisis.severity === "high" ? 20000 : 8000;
    return {
      impactAnalysis: {
        affectedRadiusKm: affectedRadius,
        populationAffected,
        estimatedDurationHours: crisis.severity === "critical" ? 12 : 6,
        spreadRisk: "high",
        vulnerableGroups: ["elderly", "children", "low-income areas"],
        infrastructureRisk: ["roads", "electricity", "sewage"],
      },
      actionPlan: [
        { priority: 1, action: "dispatch_rescue_team", target: crisis.affectedArea, resource: "RT01" },
        { priority: 2, action: "send_public_alert", message: `Flood alert in ${crisis.affectedArea}. Evacuate immediately.` },
        { priority: 3, action: "reroute_traffic", alternateRoute: route?.summary || "Use alternate routes" },
        { priority: 4, action: "notify_authority", authority: RESOURCES.authorities.flood },
        { priority: 5, action: "request_water_tankers", count: 3 },
      ]
    };
  },

  accident: async (crisis, route) => {
    return {
      impactAnalysis: {
        affectedRadiusKm: 2,
        populationAffected: 5000,
        estimatedDurationHours: 2,
        spreadRisk: "medium",
        vulnerableGroups: ["commuters", "nearby pedestrians"],
        infrastructureRisk: ["roads", "traffic flow"],
        trafficBackupKm: 3,
        alternateRoute: route?.summary || "No alternate route found",
        alternateRouteDuration: route?.duration || "Unknown",
      },
      actionPlan: [
        { priority: 1, action: "dispatch_medical_unit", target: crisis.affectedArea, resource: "MU01" },
        { priority: 2, action: "notify_authority", authority: RESOURCES.authorities.accident },
        { priority: 3, action: "reroute_traffic", alternateRoute: route?.summary || "Use alternate routes" },
        { priority: 4, action: "send_public_alert", message: `Accident on ${crisis.affectedArea}. Avoid area, use alternate routes.` },
      ]
    };
  },

  power_outage: async (crisis, route) => {
    return {
      impactAnalysis: {
        affectedRadiusKm: 1,
        populationAffected: 10000,
        estimatedDurationHours: 4,
        spreadRisk: "low",
        vulnerableGroups: ["hospitals", "elderly on medical equipment"],
        infrastructureRisk: ["electricity", "traffic signals", "businesses"],
      },
      actionPlan: [
        { priority: 1, action: "notify_authority", authority: RESOURCES.authorities.power_outage },
        { priority: 2, action: "send_public_alert", message: `Power outage in ${crisis.affectedArea}. Avoid sparking wires. Stay away from affected streets.` },
        { priority: 3, action: "dispatch_rescue_team", target: crisis.affectedArea, resource: "RT02" },
        { priority: 4, action: "request_generators", count: 2, priority_locations: ["hospitals", "shelters"] },
      ]
    };
  },

  heatwave: async (crisis, route) => {
    return {
      impactAnalysis: {
        affectedRadiusKm: 10,
        populationAffected: 100000,
        estimatedDurationHours: 48,
        spreadRisk: "high",
        vulnerableGroups: ["elderly", "outdoor workers", "children", "low-income no AC"],
        infrastructureRisk: ["power grid overload", "water supply"],
      },
      actionPlan: [
        { priority: 1, action: "open_cooling_centers", count: 5, areas: [crisis.affectedArea] },
        { priority: 2, action: "notify_authority", authority: RESOURCES.authorities.heatwave },
        { priority: 3, action: "send_public_alert", message: `Heatwave warning in ${crisis.affectedArea}. Stay indoors, drink water, avoid sun 11am-4pm.` },
        { priority: 4, action: "dispatch_medical_unit", target: crisis.affectedArea, resource: "MU02" },
      ]
    };
  },

  // Default skill for unknown crisis types
  unknown: async (crisis, route) => {
    return {
      impactAnalysis: {
        affectedRadiusKm: 2,
        populationAffected: 10000,
        estimatedDurationHours: 3,
        spreadRisk: "unknown",
        vulnerableGroups: ["general public"],
        infrastructureRisk: ["unknown"],
        note: "Unknown crisis type — conservative estimates applied",
      },
      actionPlan: [
        { priority: 1, action: "dispatch_rescue_team", target: crisis.affectedArea, resource: "RT01" },
        { priority: 2, action: "send_public_alert", message: `Incident reported in ${crisis.affectedArea}. Authorities are responding.` },
        { priority: 3, action: "request_verification", reason: "Unknown crisis type needs field confirmation" },
      ]
    };
  }
};

// ── Fetch alternate route ─────────────────────
async function getAlternateRoute(area) {
  try {
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(area)}&destination=${encodeURIComponent("City Center, Karachi")}&alternatives=true&key=${GOOGLE_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.status !== "OK" || !data.routes?.length) return null;
    // Return the second route if available (alternate)
    const route = data.routes[1] || data.routes[0];
    return {
      summary: route.summary,
      duration: route.legs[0].duration.text,
      distance: route.legs[0].distance.text,
    };
  } catch (e) {
    return null;
  }
}

// ── MAIN — Agent 2 ────────────────────────────
async function runAgent2(crisis) {
  console.log(`\n🤖 AGENT 2 — Crisis Analysis + Action Plan`);
  console.log(`📍 Crisis: ${crisis.crisisType} | ${crisis.severity} | ${crisis.affectedArea}\n`);

  // Step 1 — Get alternate route from Google Directions
  console.log("🗺️  Fetching alternate routes...");
  const route = await getAlternateRoute(crisis.affectedArea);

  // Step 2 — Select the right skill for this crisis type
  const skill = CRISIS_SKILLS[crisis.crisisType] || CRISIS_SKILLS.unknown;
  console.log(`🧠 Applying skill: ${crisis.crisisType}`);

  // Step 3 — Run the skill
  const { impactAnalysis, actionPlan } = await skill(crisis, route);

  // Step 4 — Build full Agent 2 output
  const output = {
    crisisId: `crisis_${Date.now()}`,
    receivedFrom: "Agent 1",
    timestamp: new Date().toISOString(),
    input: crisis,
    impactAnalysis,
    alternateRoute: route,
    actionPlan,
    resourceAllocation: {
      assignedRescueTeam: RESOURCES.rescueTeams.find(r => r.available),
      assignedMedicalUnit: RESOURCES.medicalUnits.find(m => m.available),
      authorityToNotify: RESOURCES.authorities[crisis.crisisType] || null,
    },
    readyForAgent3: true,
  };

  console.log("\n📋 AGENT 2 OUTPUT:");
  console.log(JSON.stringify(output, null, 2));
  return output;
}

// ── Test with mock data from Agent 1 ─────────
const mockCrises = [
  {
    crisisType: "flood",
    severity: "critical",
    credibilityScore: 0.95,
    affectedArea: "Sector G-10, Islamabad",
    description: "Severe urban flooding reported. Water levels have reached 2+ feet.",
    contributingSignalIds: ["sig_community_8831", "sig_api_weather_441"]
  },
  {
    crisisType: "accident",
    severity: "high",
    credibilityScore: 0.78,
    affectedArea: "Shahrah-e-Faisal near Nursery, Karachi",
    description: "Multi-vehicle collision blocking outbound lanes.",
    contributingSignalIds: ["sig_community_9102", "sig_community_9104"]
  },
  {
    crisisType: "power_outage",
    severity: "medium",
    credibilityScore: 0.65,
    affectedArea: "DHA Phase 6, Lahore",
    description: "Localized power outage. Sparking wires near main commercial avenue.",
    contributingSignalIds: ["sig_community_334"]
  }
];

// Run Agent 2 for all mock crises
(async () => {
  for (const crisis of mockCrises) {
    await runAgent2(crisis);
    console.log("\n" + "=".repeat(60) + "\n");
  }
})();

module.exports = { runAgent2 };