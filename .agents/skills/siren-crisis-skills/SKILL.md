# SIRENS Crisis Response Skills

These are the specialized skills available to the SIRENS agent for handling different crisis types in Pakistani cities.

---

## Skill: Flood Response

**Triggers when:** crisisType == "flood"

**Confidence Rules:**
- credibilityScore >= 0.8 → Execute full plan immediately
- credibilityScore 0.5–0.79 → Dispatch verification team first, hold public alert
- credibilityScore < 0.5 → Monitor only, request more signals

**Action Plan:**
1. Dispatch rescue team to affected area
2. Send public alert (Urdu + English): "Flood alert in [area]. Evacuate immediately. Avoid low-lying roads."
3. Reroute traffic away from flooded streets via Google Directions
4. Notify NDMA (ndma@gov.pk)
5. Request water tankers (count based on severity: critical=5, high=3, medium=1)

**Impact Estimates:**
- Critical: 5km radius, 50,000 people, 12 hours
- High: 3km radius, 20,000 people, 6 hours
- Medium: 1.5km radius, 8,000 people, 3 hours

**Vulnerable Groups:** Elderly, children, low-income areas near water bodies

---

## Skill: Accident Response

**Triggers when:** crisisType == "accident"

**Confidence Rules:**
- credibilityScore >= 0.7 → Full response immediately
- credibilityScore 0.5–0.69 → Send medical unit + request verification
- credibilityScore < 0.5 → Monitor, send traffic advisory only

**Action Plan:**
1. Dispatch medical unit to scene
2. Notify Rescue 1122
3. Reroute traffic via Google Directions alternate route
4. Send public alert: "Accident on [area]. Avoid area, use alternate routes."

**Impact Estimates:**
- High: 2km radius, 5,000 people, 2 hours, 3km traffic backup
- Medium: 1km radius, 2,000 people, 1 hour

**Vulnerable Groups:** Commuters, nearby pedestrians

---

## Skill: Power Outage Response

**Triggers when:** crisisType == "power_outage"

**Confidence Rules:**
- credibilityScore >= 0.6 → Full response (lower threshold because electrocution risk)
- credibilityScore 0.4–0.59 → Notify authority + send safety alert only
- credibilityScore < 0.4 → Monitor only

**Action Plan:**
1. Notify LESCO/KESC immediately (118)
2. Send public alert: "Power outage in [area]. Avoid sparking wires. Stay away from affected streets."
3. Dispatch rescue team for safety patrol
4. Request generators for hospitals and shelters

**Impact Estimates:**
- High: 3km radius, 25,000 people, 6 hours
- Medium: 1km radius, 10,000 people, 4 hours

**Vulnerable Groups:** Hospitals, elderly on medical equipment, businesses

---

## Skill: Heatwave Response

**Triggers when:** crisisType == "heatwave" OR temperature > 42°C from weather API

**Confidence Rules:**
- Weather API confirms temp > 42°C → credibilityScore automatically 0.9
- credibilityScore >= 0.7 → Full response
- credibilityScore < 0.7 → Issue advisory only

**Action Plan:**
1. Open cooling centers (count based on severity: critical=10, high=5, medium=2)
2. Notify Health Department
3. Send public alert (Urdu + English): "Heatwave warning. Stay indoors. Drink water. Avoid sun 11am–4pm."
4. Dispatch medical units to low-income areas
5. Request water distribution tankers

**Impact Estimates:**
- Critical: 15km radius, 200,000 people, 72 hours
- High: 10km radius, 100,000 people, 48 hours

**Vulnerable Groups:** Elderly, outdoor workers, children, low-income residents without AC

---

## Skill: Fire Response

**Triggers when:** crisisType == "fire"

**Confidence Rules:**
- credibilityScore >= 0.6 → Full response immediately (fire spreads fast)
- credibilityScore < 0.6 → Dispatch verification + notify fire brigade

**Action Plan:**
1. Notify Fire Brigade (16) immediately
2. Dispatch rescue team
3. Send public alert: "Fire reported in [area]. Evacuate immediately. Keep roads clear for fire brigade."
4. Reroute traffic away from area
5. Dispatch medical unit for burn casualties

**Impact Estimates:**
- Critical: 1km radius, 10,000 people, 4 hours
- High: 0.5km radius, 3,000 people, 2 hours

**Vulnerable Groups:** Residents in building, nearby businesses

---

## Skill: Weather Advisory

**Triggers when:** crisisType == "weather" OR heavy rainfall/wind detected from Open-Meteo

**Weather Thresholds:**
- Temperature > 42°C → Trigger heatwave skill
- Rainfall > 30mm/hour → Trigger flood skill
- Wind > 60km/h → Issue wind advisory
- weathercode >= 80 (heavy rain/storm) → Issue storm advisory

**Confidence Rules:**
- Weather API data is always credibilityScore 0.9 (trusted source)
- Combine with citizen reports for higher confidence

**Action Plan:**
1. Issue weather advisory alert to all citizens in affected city
2. If thresholds exceeded → escalate to relevant skill (flood/heatwave)
3. Notify relevant authorities based on weather type

---

## Skill: Traffic/Road Block Response

**Triggers when:** crisisType == "traffic" OR crisisType == "road_block"

**Confidence Rules:**
- credibilityScore >= 0.6 → Reroute + alert
- credibilityScore < 0.6 → Advisory only

**Action Plan:**
1. Fetch alternate route via Google Directions API
2. Send traffic advisory: "Road blocked at [area]. Use [alternate route]."
3. Notify Traffic Police
4. Update congestion status in Firestore

---

## Skill: Unknown Crisis (Fallback)

**Triggers when:** crisisType is not recognized

**Action Plan:**
1. Dispatch rescue team for verification
2. Send conservative public alert: "Incident reported in [area]. Authorities are responding."
3. Request field verification
4. Escalate to human operator

---

## Confidence Score Reference

| Score | Meaning | Action |
|-------|---------|--------|
| >= 0.8 | High confidence | Full immediate response |
| 0.5–0.79 | Medium confidence | Partial response + verification |
| 0.3–0.49 | Low confidence | Monitor + request more signals |
| < 0.3 | Very low | Log only, no action |

---

## Authority Contact Reference

| Crisis | Authority | Contact |
|--------|-----------|---------|
| Flood | NDMA | ndma@gov.pk |
| Accident | Rescue 1122 | 1122 |
| Power Outage | LESCO/KESC | 118 |
| Heatwave | Health Department | health@gov.pk |
| Fire | Fire Brigade | 16 |
| Traffic | Traffic Police | traffic@police.gov.pk |