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
  createdAt: Date;
  updatedAt: Date;
}

export interface LocationDetails {
  area: string;
  coords: GeoPoint; // Firestore GeoPoint
}

export interface AlertPreferences {
  weather: boolean;
  traffic: boolean;
  highSeverityOnly: boolean;
  notificationChannel: 'push' | 'email' | 'sms';
}

// Simple mock for GeoPoint since this is a TS definition file
// and not yet running in the full firebase-admin environment
export interface GeoPoint {
  latitude: number;
  longitude: number;
}
