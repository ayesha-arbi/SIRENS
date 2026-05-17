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
    weather: { name: "Met Department", contact: "met@gov.pk" },
  }
};

// ── Confidence-based action filter ───────────
function getActionsForConfidence(allActions, credibilityScore, crisisType) {
    if (credibilityScore >= 0.8) {
        // Full response — all actions
        console.log("🟢 High confidence — executing full action plan");
        return allActions;
    } else if (credibilityScore >= 0.5) {
        // Medium — no public alert yet, verification first
        console.log("🟡 Medium confidence — partial response, verification first");
        return allActions.filter(a => a.action !== "send_public_alert")
            .concat([{ priority: 99, action: "request_verification", reason: `Confidence ${credibilityScore} — needs field confirmation before public alert` }]);
    } else if (credibilityScore >= 0.3) {
        // Low — monitor only
        console.log("🔴 Low confidence — monitoring only");
        return [{ priority: 1, action: "request_verification", reason: `Low confidence ${credibilityScore} — monitoring only` }];
    } else {
        // Very low — log only
        console.log("⚫ Very low confidence — logging only, no action");
        return [];
    }
}

// ── Crisis Skills ─────────────────────────────
const CRISIS_SKILLS = {

    flood: async (crisis, route) => {
        const affectedRadius = crisis.severity === "critical" ? 5 : crisis.severity === "high" ? 3 : 1.5;
        const populationAffected = crisis.severity === "critical" ? 50000 : crisis.severity === "high" ? 20000 : 8000;
        const tankerCount = crisis.severity === "critical" ? 5 : crisis.severity === "high" ? 3 : 1;

        const allActions = [
            { priority: 1, action: "dispatch_rescue_team", target: crisis.affectedArea, resource: "RT01" },
            { priority: 2, action: "send_public_alert", message: `Flood alert in ${crisis.affectedArea}. Evacuate immediately. Avoid low-lying roads.` },
            { priority: 3, action: "reroute_traffic", alternateRoute: route?.summary || "Use alternate routes" },
            { priority: 4, action: "notify_authority", authority: RESOURCES.authorities.flood },
            { priority: 5, action: "request_water_tankers", count: tankerCount },
        ];

        return {
            impactAnalysis: {
                affectedRadiusKm: affectedRadius,
                populationAffected,
                estimatedDurationHours: crisis.severity === "critical" ? 12 : 6,
                spreadRisk: "high",
                vulnerableGroups: ["elderly", "children", "low-income areas"],
                infrastructureRisk: ["roads", "electricity", "sewage"],
            },
            actionPlan: getActionsForConfidence(allActions, crisis.credibilityScore, "flood")
        };
    },

    accident: async (crisis, route) => {
        const allActions = [
            { priority: 1, action: "dispatch_medical_unit", target: crisis.affectedArea, resource: "MU01" },
            { priority: 2, action: "notify_authority", authority: RESOURCES.authorities.accident },
            { priority: 3, action: "reroute_traffic", alternateRoute: route?.summary || "Use alternate routes" },
            { priority: 4, action: "send_public_alert", message: `Accident on ${crisis.affectedArea}. Avoid area, use alternate routes.` },
        ];

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
            actionPlan: getActionsForConfidence(allActions, crisis.credibilityScore, "accident")
        };
    },

    power_outage: async (crisis, route) => {
        // Lower threshold for power outage due to electrocution risk
        const adjustedScore = Math.min(crisis.credibilityScore + 0.2, 1.0);
        console.log(`⚡ Power outage — adjusted confidence: ${adjustedScore} (electrocution risk)`);

        const allActions = [
            { priority: 1, action: "notify_authority", authority: RESOURCES.authorities.power_outage },
            { priority: 2, action: "send_public_alert", message: `Power outage in ${crisis.affectedArea}. Avoid sparking wires. Stay away from affected streets.` },
            { priority: 3, action: "dispatch_rescue_team", target: crisis.affectedArea, resource: "RT02" },
            { priority: 4, action: "request_generators", count: 2, priority_locations: ["hospitals", "shelters"] },
        ];

        return {
            impactAnalysis: {
                affectedRadiusKm: crisis.severity === "high" ? 3 : 1,
                populationAffected: crisis.severity === "high" ? 25000 : 10000,
                estimatedDurationHours: crisis.severity === "high" ? 6 : 4,
                spreadRisk: "low",
                vulnerableGroups: ["hospitals", "elderly on medical equipment"],
                infrastructureRisk: ["electricity", "traffic signals", "businesses"],
            },
            actionPlan: getActionsForConfidence(allActions, adjustedScore, "power_outage")
        };
    },

    heatwave: async (crisis, route) => {
        const coolingCenters = crisis.severity === "critical" ? 10 : crisis.severity === "high" ? 5 : 2;

        const allActions = [
            { priority: 1, action: "open_cooling_centers", count: coolingCenters, areas: [crisis.affectedArea] },
            { priority: 2, action: "notify_authority", authority: RESOURCES.authorities.heatwave },
            { priority: 3, action: "send_public_alert", message: `Heatwave warning in ${crisis.affectedArea}. Stay indoors. Drink water. Avoid sun 11am-4pm.` },
            { priority: 4, action: "dispatch_medical_unit", target: crisis.affectedArea, resource: "MU02" },
            { priority: 5, action: "request_water_tankers", count: 3 },
        ];

        return {
            impactAnalysis: {
                affectedRadiusKm: crisis.severity === "critical" ? 15 : 10,
                populationAffected: crisis.severity === "critical" ? 200000 : 100000,
                estimatedDurationHours: crisis.severity === "critical" ? 72 : 48,
                spreadRisk: "high",
                vulnerableGroups: ["elderly", "outdoor workers", "children", "low-income residents without AC"],
                infrastructureRisk: ["power grid overload", "water supply"],
            },
            actionPlan: getActionsForConfidence(allActions, crisis.credibilityScore, "heatwave")
        };
    },

    fire: async (crisis, route) => {
        // Lower threshold for fire due to fast spread risk
        const adjustedScore = Math.min(crisis.credibilityScore + 0.2, 1.0);
        console.log(`🔥 Fire — adjusted confidence: ${adjustedScore} (fast spread risk)`);

        const allActions = [
            { priority: 1, action: "notify_authority", authority: RESOURCES.authorities.fire },
            { priority: 2, action: "dispatch_rescue_team", target: crisis.affectedArea, resource: "RT01" },
            { priority: 3, action: "send_public_alert", message: `Fire reported in ${crisis.affectedArea}. Evacuate immediately. Keep roads clear for fire brigade.` },
            { priority: 4, action: "reroute_traffic", alternateRoute: route?.summary || "Use alternate routes" },
            { priority: 5, action: "dispatch_medical_unit", target: crisis.affectedArea, resource: "MU01" },
        ];

        return {
            impactAnalysis: {
                affectedRadiusKm: crisis.severity === "critical" ? 1 : 0.5,
                populationAffected: crisis.severity === "critical" ? 10000 : 3000,
                estimatedDurationHours: crisis.severity === "critical" ? 4 : 2,
                spreadRisk: "critical",
                vulnerableGroups: ["residents in building", "nearby businesses"],
                infrastructureRisk: ["buildings", "gas lines", "electricity"],
            },
            actionPlan: getActionsForConfidence(allActions, adjustedScore, "fire")
        };
    },

    weather: async (crisis, route) => {
        // Weather API is always high credibility
        const adjustedScore = Math.max(crisis.credibilityScore, 0.9);

        const allActions = [
            { priority: 1, action: "send_public_alert", message: `Weather advisory for ${crisis.affectedArea}. ${crisis.description}` },
            { priority: 2, action: "notify_authority", authority: RESOURCES.authorities.heatwave },
        ];

        return {
            impactAnalysis: {
                affectedRadiusKm: 10,
                populationAffected: 50000,
                estimatedDurationHours: 6,
                spreadRisk: "medium",
                vulnerableGroups: ["outdoor workers", "elderly", "children"],
                infrastructureRisk: ["roads", "power lines"],
                note: "Monitor thresholds — escalate to flood skill if rainfall > 30mm/hr or heatwave if temp > 42°C"
            },
            actionPlan: getActionsForConfidence(allActions, adjustedScore, "weather")
        };
    },

    traffic: async (crisis, route) => {
        const allActions = [
            { priority: 1, action: "reroute_traffic", alternateRoute: route?.summary || "Use alternate routes" },
            { priority: 2, action: "send_public_alert", message: `Road blocked at ${crisis.affectedArea}. Use alternate routes.` },
            { priority: 3, action: "notify_authority", authority: RESOURCES.authorities.traffic },
        ];

        return {
            impactAnalysis: {
                affectedRadiusKm: 1,
                populationAffected: 3000,
                estimatedDurationHours: 1,
                spreadRisk: "low",
                vulnerableGroups: ["commuters"],
                infrastructureRisk: ["traffic flow"],
                alternateRoute: route?.summary || "No alternate route found",
            },
            actionPlan: getActionsForConfidence(allActions, crisis.credibilityScore, "traffic")
        };
    },

    unknown: async (crisis, route) => {
        return {
            impactAnalysis: {
                affectedRadiusKm: 2,
                populationAffected: 10000,
                estimatedDurationHours: 3,
                spreadRisk: "unknown",
                vulnerableGroups: ["general public"],
                infrastructureRisk: ["unknown"],
                note: "Unknown crisis type — conservative estimates, escalating to human operator",
            },
            actionPlan: [
                { priority: 1, action: "dispatch_rescue_team", target: crisis.affectedArea, resource: "RT01" },
                { priority: 2, action: "send_public_alert", message: `Incident reported in ${crisis.affectedArea}. Authorities are responding.` },
                { priority: 3, action: "request_verification", reason: "Unknown crisis type — needs human review" },
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