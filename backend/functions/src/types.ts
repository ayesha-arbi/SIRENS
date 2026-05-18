import { Timestamp, FieldValue } from "firebase-admin/firestore";


/**
 * Interface for the Citizen's personalized profile in the 'citizens' collection.
 */
export interface CitizenProfile {
  uid: string;
  email: string;
  // Set during onboarding — optional until onboardingComplete is true.
  city?: string;
  district?: string;
  homeLocation?: LocationDetails;
  workLocation?: LocationDetails;
  frequentAreas?: LocationDetails[];
  preferences?: AlertPreferences;
  onboardingComplete: boolean;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
}

export interface LocationDetails {
  area: string;
  coords: {
    latitude: number;
    longitude: number;
  };
}

export interface AlertPreferences {
  weather: boolean;
  traffic: boolean;
  highSeverityOnly: boolean;
  notificationChannel: 'push' | 'email' | 'sms';
}

export interface Report {
  reportId: string;
  userId: string;
  imageUrl: string;
  category: 'accident' | 'fire' | 'weather' | 'traffic' | 'other';
  description?: string;   // optional — not always provided by the citizen
  location: FirebaseFirestore.GeoPoint;
  areaName?: string;      // optional — may be reverse-geocoded later
  city: string;
  timestamp: Timestamp | FieldValue;
  status: 'active' | 'expired' | 'resolved';
}

export interface Poll {
  pollId: string;
  reportId: string;
  question: string;
  yesVotes: string[]; // Array of UIDs
  noVotes: string[]; // Array of UIDs
  createdAt: Timestamp | FieldValue;
}

export interface SOSSignal {
  sosId: string;
  userId: string;
  location: FirebaseFirestore.GeoPoint;
  message: string;
  status: 'pending' | 'dispatched' | 'resolved';
  timestamp: Timestamp | FieldValue;
}

export interface OfficialAlert {
  alertId: string;
  title: string;
  message: string;
  city: string;
  severity: 'low' | 'medium' | 'high';
  active: boolean;
  timestamp: Timestamp | FieldValue;
}
