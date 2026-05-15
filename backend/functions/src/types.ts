import { Timestamp, FieldValue, GeoPoint } from "firebase-admin/firestore";

// Re-export GeoPoint from firebase-admin so the rest of the backend uses the real Firestore type
// instead of a plain JS object. This ensures Firestore geo-queries work correctly and the
// Firestore console displays values as GeoPoints, not generic Maps.
export { GeoPoint };

/**
 * Interface for the Citizen's personalized profile in the 'citizens' collection.
 */
export interface CitizenProfile {
  uid: string;
  email: string;
  city: string;
  district: string;
  homeLocation: LocationDetails;
  workLocation: LocationDetails;
  frequentAreas: LocationDetails[];
  preferences: AlertPreferences;
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
  description: string;
  location: GeoPoint;
  areaName: string;
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
