# 📱 SIRENS Frontend Integration Guide

This guide provides the technical specifications for integrating the SIRENS backend. All backend functions are **HTTPS Callables** and require a valid Firebase Auth session.

---

## 1. Citizen Mobile App Features

### 🚨 SOS Emergency Trigger
A high-priority "Panic Button" for immediate distress.
- **Function:** `triggerSOS`
- **Arguments:** 
  ```typescript
  { 
    location: { latitude: number, longitude: number }, 
    message?: string 
  }
  ```
- **Returns:** `{ success: true, sosId: string }`
- **UX Requirement:** Implement a long-press or countdown (e.g., 3 seconds) to prevent accidental triggers.

### 📰 Personalized Feed
Displays reports filtered by the user's city and preferences.
- **Function:** `getPersonalizedFeed`
- **Arguments:** None
- **Returns:** `{ reports: Report[] }`
- **UX Requirement:** Show a loading skeleton while fetching. If the feed is empty, show: *"No reports matching your preferences in [City]."*

### ⚠️ System Alerts (Real-time)
Official alerts broadcasted by authorities.
- **Implementation:** Use a Firestore `onSnapshot` listener on the `alerts` collection.
- **Query:** `.where("city", "==", userCity).where("active", "==", true)`
- **UX Requirement:** When a new alert is detected, slide in a high-visibility banner at the top of the screen.

---

## 2. Authority Web Dashboard Features

### 🆘 SOS Monitor
A real-time queue of citizens in distress.
- **Function:** `getSOSList`
- **Arguments:** None
- **Returns:** `{ signals: SOSSignal[] }`
- **UX Requirement:** Display as a list or on a map. Highlight the most recent signals.

### 📢 Official Alert Publisher
Broadcasting critical information to the public.
- **Function:** `sendOfficialAlert`
- **Arguments:** 
  ```typescript
  { 
    title: string, 
    message: string, 
    city: string, 
    severity: 'low' | 'medium' | 'high' 
  }
  ```
- **Returns:** `{ success: true, alertId: string }`

### 🛠 Incident Management
Resolving community reports to clean up the map.
- **Function:** `resolveReport`
- **Arguments:** `{ reportId: string }`
- **Returns:** `{ success: true }`
- **UX Requirement:** On the authority map, clicking an active report should show a "Mark as Resolved" button.

---

## 3. Community Reporting (Recap)

### 📸 Image Upload Flow
1. **Request URL**: Call `getUploadUrl({ fileType: "image/jpeg" })`.
2. **Binary Upload**: `PUT` the image to the returned `uploadUrl`.
3. **Submit Data**: Call `createCommunityReport` using the `filePath` from step 1.

### ✅ Report Validation
- **Function:** `submitPollVote`
- **Arguments:** `{ pollId: string, vote: 'yes' | 'no' }`
- **Returns:** `{ success: true }`

---

## 🛠 Data Models Reference

### Report
`{ reportId, userId, imageUrl, category, description, location (GeoPoint), areaName, city, timestamp, status ('active'|'resolved') }`

### SOS Signal
`{ sosId, userId, location (GeoPoint), message, status ('pending'|'dispatched'|'resolved'), timestamp }`

### Official Alert
`{ alertId, title, message, city, severity ('low'|'medium'|'high'), active, timestamp }`
