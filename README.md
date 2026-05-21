# 🚨 SIRENS — Smart Incident Response & Emergency Notification System

> **An Agentic AI System for Real-Time Urban Crisis Detection, Planning, and Response**
> Built for Pakistan's metropolitan cities using Google Antigravity (Genkit), Firebase, and Google Maps.

---

## 🔗 Live Links

| Platform | Link |
|---|---|
| **Android App (APK)** | _Link coming soon_ |
| **Web Dashboard (Vercel)** | _Link coming soon_ |

## 🎥 Demo Video

[![SIRENS Demo](https://img.shields.io/badge/Watch-Demo%20Video-red?style=for-the-badge&logo=youtube)](YOUR_YOUTUBE_LINK_HERE)

> 3-5 minute walkthrough showing: multi-source signal ingestion → Agent 1 crisis classification → Agent 2 action planning → Agent 3 execution → Agent 4 verification loop → Agent 5 impact evaluation.
---

## 📌 Table of Contents

1. [Problem Statement](#-problem-statement)
2. [Solution Overview](#-solution-overview)
3. [System Architecture](#-system-architecture)
4. [Multi-Agent Pipeline](#-multi-agent-pipeline)
5. [Tech Stack](#-tech-stack)
6. [APIs & External Integrations](#-apis--external-integrations)
7. [Firestore Data Schema](#-firestore-data-schema)
8. [Backend Functions Reference](#-backend-functions-reference)
9. [Mobile App (Citizen Portal)](#-mobile-app-citizen-portal)
10. [Web Dashboard (Authority Command Center)](#-web-dashboard-authority-command-center)
11. [Setup & Installation](#-setup--installation)
12. [Environment Variables](#-environment-variables)
13. [Deployment](#-deployment)
14. [Team](#-team)

---

## 🔥 Problem Statement

Pakistan's metropolitan cities face frequent localized crises — urban flooding, heatwaves, road blockages, accidents, and infrastructure failures. However, response systems are:

- **Fragmented** — no single source of truth across agencies
- **Reactive** — response happens after significant damage is done
- **Slow to coordinate** — manual bottlenecks delay ambulance dispatch and traffic rerouting

Critical signals exist (social media, maps, weather APIs, citizen reports) but are never synthesized into actionable, coordinated decisions in real time.

---

## ✅ Solution Overview

SIRENS is a **fully autonomous, event-driven, multi-agent AI system** that:

1. **Ingests** live signals from weather APIs, news APIs, and citizen mobile reports (including Roman Urdu)
2. **Detects** emerging crises using a Genkit AI classification agent
3. **Plans** coordinated response actions using a dedicated planning agent
4. **Simulates** the execution of those actions (dispatching ambulances, rerouting traffic via Google Maps, sending alerts)
5. **Evaluates** the before vs. after impact of the response
6. **Notifies** both citizens (mobile app) and authorities (web dashboard) in real time

---

## 🏗 System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        DATA INGESTION LAYER                          │
│   Open-Meteo API ──┐                                                │
│   GNews API ───────┼──► raw_signals (Firestore Collection)          │
│   Citizen Reports ─┘   (every 60 min via Cloud Functions)            │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼ (every 15 min via crisisDetectionLoop)
┌─────────────────────────────────────────────────────────────────────┐
│                        AGENTIC AI PIPELINE                           │
│                        (Google Genkit + Gemini)                      │
│                                                                      │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────────┐  │
│  │ AGENT 1  │───►│ AGENT 2  │───►│ AGENT 3  │    │   AGENT 4    │  │
│  │Classifier│    │ Planner  │    │ Executor │    │Verification  │  │
│  └──────────┘    └──────────┘    └──────────┘    │    Loop      │  │
│       │               │               │           └──────────────┘  │
│       └───────────────┴───────────────┴──────────────────┐          │
│                                                           │          │
│                                                  ┌──────────────┐  │
│                                                  │   AGENT 5    │  │
│                                                  │   Impact     │  │
│                                                  │  Evaluator   │  │
│                                                  └──────────────┘  │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
          ┌──────────────────────┼───────────────────────┐
          ▼                      ▼                        ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐
│  crises          │  │  danger_zones    │  │  alerts              │
│  resources       │  │  agent_traces    │  │  verification_       │
│  (Firestore)     │  │  (Firestore)     │  │  requests            │
└──────────────────┘  └──────────────────┘  └──────────────────────┘
          │                      │                        │
          ▼                      ▼                        ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐
│  Web Dashboard   │  │   Google Maps    │  │   Mobile App         │
│  (Authority)     │  │   Red + Green    │  │   (Citizens)         │
│  React/Next.js   │  │   Polygons       │  │   Expo React Native  │
└──────────────────┘  └──────────────────┘  └──────────────────────┘
```

---

## 🤖 Multi-Agent Pipeline

### Agent 1 — Classifier (Ingestion & Normalization)
**File:** `backend/functions/src/ai/flows/classifySignals.ts`

- **Input:** A batch of raw signals from a city (weather JSON, news headlines, citizen text in Roman Urdu)
- **Responsibility:** Translates Roman Urdu/slang into English, classifies the crisis type, assigns a credibility score (0.0–1.0), and generates a clean factual description
- **Routing Logic:**
  - `credibilityScore < 0.5` → **PATH A only**: Send personalized alert to nearby citizens
  - `credibilityScore >= 0.5` → **PATH A + PATH B**: Proceed to Agent 2 for action planning
- **Supported Crisis Types:** `flood`, `heatwave`, `accident`, `road_block`, `power_outage`, `infrastructure`, `fire`
- **Logs to:** `agent_traces` collection

---

### Agent 2 — Planner (Situation Analysis & Action Planning)
**File:** `backend/functions/src/ai/flows/planCrisis.ts`

- **Input:** High-confidence normalized crisis from Agent 1
- **Responsibility:** Queries Firestore for available `resources` and `authorities`, fetches a live alternate route via Google Maps Directions API, then generates a prioritized action plan
- **Output includes:**
  - `impactAnalysis` — affected radius, estimated population, spread risk, infrastructure at risk
  - `actionPlan` — prioritized list of actions (dispatch, reroute, notify authority, send alert)
  - `assignedRescueTeam`, `assignedMedicalUnit`, `authorityToNotify`
- **Logs to:** `agent_traces` collection

---

### Agent 3 — Executor (Simulated Action Engine)
**File:** `backend/functions/src/ai/flows/executePlan.ts`

- **Input:** Crisis details + Agent 2's action plan
- **Responsibility:** Equips Gemini with 5 Genkit Tools and lets it autonomously call them to execute the plan
- **Tools available:**
  | Tool | Action |
  |---|---|
  | `sendAlert` | Creates an alert document for citizen mobile app |
  | `notifyAuthority` | Creates entry in `authority_notifications` for web dashboard |
  | `dispatchResource` | Marks ambulances/rescue teams as `available: false` in Firestore |
  | `rerouteTraffic` | Calls **Google Maps Directions API** for real alternate route + saves polyline to `danger_zones` |
  | `requestVerification` | Creates entry in `verification_requests` to trigger citizen voting (Agent 4) |
- **Logs to:** `agent_traces` collection

---

### Agent 4 — Verification Loop (Human-in-the-Loop)
**File:** `backend/functions/src/verificationLoop.ts`

- **Trigger:** Firestore document update trigger on `verification_requests/{requestId}`
- **Responsibility:** Watches the `verification_requests` collection. When 3 unique citizens click "YES" on a verification poll, Agent 4 automatically:
  1. Boosts the credibility score to 0.95 (High Confidence)
  2. Re-runs Agent 2 (Planner) with the escalated confidence
  3. Re-runs Agent 3 (Executor) to actually dispatch emergency resources
- **Purpose:** Prevents false positives. Low-confidence crises are only escalated to full response if real humans on the ground confirm them.

---

### Agent 5 — Impact Evaluator (Before vs. After)
**File:** `backend/functions/src/ai/flows/evaluateImpact.ts`

- **Trigger:** Manual call from Authority Dashboard (via `triggerImpactEvaluation` callable function)
- **Responsibility:** Evaluates whether the response was effective using fresh signals and then:
  1. Calls `updateMap` tool → shrinks or clears the red danger zone on the map
  2. Calls `resolveCrisis` tool → marks crisis as resolved, frees all dispatched ambulances
  3. Calls `sendUpdateAlert` tool → pushes "Situation Resolved" notification to citizens
- **Output:** `effectivenessScore`, `impactSummary`, `crisisStatus` ('resolved' | 'requires_more_action')
- **Logs to:** `agent_traces` collection

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **AI Orchestration** | Google Genkit (Antigravity) |
| **AI Model** | Google Gemini (via Genkit) |
| **Backend Runtime** | Node.js 20 (Firebase Cloud Functions Gen 2) |
| **Database** | Cloud Firestore |
| **File Storage** | Firebase Storage |
| **Scheduled Jobs** | Firebase Cloud Scheduler |
| **Realtime Triggers** | Firestore Document Triggers |
| **Mobile App** | Expo (React Native) |
| **Web Dashboard** | React / Next.js |
| **Maps** | Google Maps (Directions API, Maps JS API) |

---

## 🔌 APIs & External Integrations

| API | Purpose | Used By |
|---|---|---|
| **Open-Meteo API** | Free real-time weather data (rainfall, temperature) | `ingestWeather` Cloud Function (every 60 min) |
| **GNews API** | Real-time Pakistani news headlines for crisis detection | `ingestNews` Cloud Function (every 60 min) |
| **Google Maps Directions API** | Generates real alternate routes with polylines, distance, and ETA | Agent 2 (planning) + Agent 3 `rerouteTrafficTool` |
| **Google Maps JS/Native API** | Renders interactive map on web and mobile | Web Dashboard + Mobile App |
| **Firebase Cloud Messaging** | Push notifications to citizen mobile devices | `alerts` collection listener |
| **Google Gemini (via Genkit)** | All AI reasoning, classification, planning, and evaluation | All 5 AI Agents |

---

## 🗄 Firestore Data Schema

### `raw_signals`
```json
{
  "source": "open_meteo | gnews | community_report",
  "text": "Raw content (Roman Urdu supported)",
  "city": "Karachi",
  "areaName": "G-10",
  "location": { "lat": 33.68, "lng": 73.04 },
  "processed": false,
  "processAfter": "Timestamp",
  "createdAt": "Timestamp"
}
```

### `crises`
```json
{
  "crisisType": "flood",
  "severity": "high",
  "credibilityScore": 0.92,
  "affectedArea": "G-10, Islamabad",
  "description": "Severe urban flooding...",
  "status": "planned | executing | resolved",
  "agent2Plan": { "impactAnalysis": {}, "actionPlan": [] },
  "effectivenessScore": 0.85,
  "resolvedAt": "Timestamp"
}
```

### `danger_zones`
```json
{
  "crisisId": "...",
  "dangerAreaName": "G-10",
  "routeDistance": "5.2 km",
  "routeDuration": "12 mins",
  "routePolyline": "encoded_polyline_string",
  "active": true
}
```

### `resources`
```json
{
  "type": "medical_unit | rescue_team",
  "available": false,
  "currentAssignment": "crisisId",
  "destination": "G-10"
}
```

### `alerts`
```json
{
  "alertType": "public | personalized",
  "title": "Flood Alert: G-10",
  "message": "Heavy flooding reported. Avoid the area.",
  "city": "Islamabad",
  "affectedArea": "G-10",
  "read": false
}
```

### `verification_requests`
```json
{
  "crisisId": "...",
  "crisisType": "flood",
  "areaName": "G-10",
  "status": "awaiting_citizen_input | verified",
  "yesVotes": ["userId1", "userId2", "userId3"],
  "noVotes": []
}
```

### `agent_traces`
```json
{
  "agent": "agent1_classify | agent2_plan | agent3_execute | agent5_evaluate",
  "crisisId": "...",
  "rawReasoning": "Full Gemini model thought process...",
  "output": {},
  "timestamp": "Timestamp"
}
```

---

## 📡 Backend Functions Reference

### Citizen Mobile App Functions

| Function | Method | Description |
|---|---|---|
| `initializeUserProfile` | Callable | Creates a base Firestore user profile on first login |
| `updateOnboardingData` | Callable | Saves city, district, home/work location |
| `setAlertPreferences` | Callable | Updates weather/traffic notification preferences |
| `getUploadUrl` | Callable | Returns a signed URL to upload incident photos to Storage |
| `createCommunityReport` | Callable | Submits a citizen incident report — **primary AI trigger** |
| `submitPollVote` | Callable | Casts a YES/NO vote on a verification request or poll |
| `getPersonalizedFeed` | Callable | Fetches city-specific reports filtered by user preferences |

### Automated Background Functions

| Function | Trigger | Description |
|---|---|---|
| `ingestWeather` | Cron: every 60 min | Fetches Open-Meteo data for monitored cities |
| `ingestNews` | Cron: every 60 min | Fetches GNews headlines for Pakistani cities |
| `crisisDetectionLoop` | Cron: every 15 min | Runs Agents 1, 2, and 3 on all unprocessed signals |
| `onCommunityReport` | Firestore Trigger | Queues a new citizen report for AI processing |
| `onVerificationUpdate` | Firestore Trigger | **Agent 4** — escalates crisis when 3 citizens verify |
| `evaluateCrisisImpact` | Cron: every 60 min | **Agent 5** — auto-evaluates all executing crises |

---

## 📱 Mobile App (Citizen Portal)

**Framework:** Expo (React Native)

| Screen | Backend Connection |
|---|---|
| **Home / Live Map** | `onSnapshot` on `danger_zones` + `alerts` |
| **Report Incident** | `getUploadUrl` → upload photo → `createCommunityReport` |
| **Live Alert Feed** | `onSnapshot` on `alerts` collection |
| **Verification Pop-up** | `onSnapshot` on `verification_requests` → `submitPollVote` |
| **Settings** | `setAlertPreferences` |
| **Onboarding** | `initializeUserProfile` → `updateOnboardingData` |

---

## 🖥 Web Dashboard (Authority Command Center)

**Framework:** React / Next.js

| Component | Backend Connection |
|---|---|
| **Central Live Map** | `onSnapshot` on `danger_zones` + `resources` |
| **Active Crises Feed** | `onSnapshot` on `crises` |
| **AI Reasoning Terminal** | `onSnapshot` on `agent_traces` |
| **Evaluate & Resolve Button** | `triggerImpactEvaluation` callable |

---

## 🚀 Setup & Installation

### Prerequisites
- Node.js 20+
- Firebase CLI (`npm install -g firebase-tools`)
- Expo CLI (`npm install -g expo-cli`)
- An active Firebase project

### 1. Clone the Repository
```bash
git clone https://github.com/your-team/SIRENS.git
cd SIRENS
```

### 2. Install Mobile App Dependencies
```bash
npm install
```

### 3. Install Backend Dependencies
```bash
cd backend/functions
npm install
```

### 4. Start the Mobile App (Development)
```bash
npx expo start
```

Scan the QR code with the **Expo Go** app on your Android or iOS device.

### 5. Build Android APK (Production)
```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo account
eas login

# Build Android APK
eas build --platform android --profile preview
```

The APK download link will be provided by EAS Build once complete.

### 6. Deploy Backend Functions
```bash
cd backend/functions
firebase deploy --only functions
```

### 7. Deploy Web Dashboard (Vercel)
```bash
npm install -g vercel
cd web-dashboard
vercel deploy --prod
```

---

## 🔑 Environment Variables

**Backend secrets (Firebase Secret Manager):**
```bash
firebase functions:secrets:set GOOGLE_GENAI_API_KEY
firebase functions:secrets:set GNEWS_API_KEY
firebase functions:secrets:set REACT_APP_GOOGLE_MAPS_API_KEY
```

**Mobile app `.env` file:**
```
EXPO_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=sirens-451958.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=sirens-451958
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

---

## ☁️ Deployment

### Backend (Firebase Cloud Functions)
All backend services run on **Firebase Cloud Functions (Gen 2)** in `us-central1`, with community report triggers in `asia-south1` for lower latency in Pakistan.

```bash
# Deploy all functions
firebase deploy --only functions

# Deploy Firestore indexes
firebase deploy --only firestore:indexes
```

### Mobile App (Android)
Built using **Expo EAS Build** and distributed as an APK.

```bash
# Preview APK (shareable download link)
eas build --platform android --profile preview

# Production AAB (Google Play Store)
eas build --platform android --profile production
```

**Download Link:** _Coming soon_

To install on Android:
1. Download the APK from the link above
2. Enable "Install from unknown sources" in Android settings
3. Open the APK file to install

### Web Dashboard (Vercel)
```bash
vercel deploy --prod
```

**Live URL:** _Coming soon_

---

## 👥 Team

**SIRENS** — Built for the **Agentic AI Hackathon** using **Google Antigravity** (Genkit).

| Name | Role |
|---|---|
| **Ayesha Zahid** | Full Stack Engineer & Designer |
| **Ayesha Noman** | Full Stack AI Engineer |
| **Maham Faisal** | Frontend Developer |
| **Maria Kousar** | Full Stack AI Engineer |

> SIRENS demonstrates a complete end-to-end agentic workflow: multi-source ingestion → AI classification → coordinated action planning → simulated execution → impact evaluation — all running autonomously in real time.