// ============================================================
//  API Integrations: Open-Meteo, GNews, Google Maps, Google Directions
//  Framework: React + TypeScript
// ============================================================

// ─── ENV KEYS (add to your .env file) ───────────────────────
// REACT_APP_GNEWS_API_KEY=your_gnews_key
// REACT_APP_GOOGLE_MAPS_API_KEY=your_google_maps_key
// Open-Meteo is completely free — no key needed!

const GNEWS_API_KEY = process.env.REACT_APP_GNEWS_API_KEY!;
const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY!;


// ============================================================
// 1. OPEN-METEO — Weather API (no API key required)
// ============================================================

export interface WeatherData {
  temperature: number;
  windspeed: number;
  weathercode: number;
  time: string;
}

export interface OpenMeteoResponse {
  current_weather: WeatherData;
  latitude: number;
  longitude: number;
}

/**
 * Fetch current weather for a given lat/lon.
 * @example const weather = await getWeather(24.8607, 67.0011); // Karachi
 */
export async function getWeather(
  latitude: number,
  longitude: number
): Promise<OpenMeteoResponse> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set("current_weather", "true");
  url.searchParams.set("windspeed_unit", "kmh");

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Open-Meteo error: ${response.statusText}`);
  }
  return response.json() as Promise<OpenMeteoResponse>;
}

// React hook example:
//
// import { useState, useEffect } from "react";
//
// export function useWeather(lat: number, lon: number) {
//   const [weather, setWeather] = useState<OpenMeteoResponse | null>(null);
//   const [error, setError]     = useState<string | null>(null);
//   const [loading, setLoading] = useState(true);
//
//   useEffect(() => {
//     getWeather(lat, lon)
//       .then(setWeather)
//       .catch((e) => setError(e.message))
//       .finally(() => setLoading(false));
//   }, [lat, lon]);
//
//   return { weather, error, loading };
// }


// ============================================================
// 2. GNEWS API — News headlines
// ============================================================

export interface GNewsArticle {
  title: string;
  description: string;
  content: string;
  url: string;
  image: string;
  publishedAt: string;
  source: { name: string; url: string };
}

export interface GNewsResponse {
  totalArticles: number;
  articles: GNewsArticle[];
}

export type GNewsCategory =
  | "general" | "world" | "nation" | "business"
  | "technology" | "entertainment" | "sports" | "science" | "health";

export interface GNewsParams {
  query?: string;         // search keyword
  category?: GNewsCategory;
  language?: string;      // e.g. "en"
  country?: string;       // e.g. "us"
  max?: number;           // max articles (1–10 on free tier)
}

/**
 * Fetch top headlines or search articles from GNews.
 * @example const news = await getNews({ query: "AI", language: "en", max: 5 });
 */
export async function getNews(params: GNewsParams = {}): Promise<GNewsResponse> {
  const { query, category, language = "en", country, max = 10 } = params;

  // Use /search if a query is provided, otherwise /top-headlines
  const endpoint = query ? "search" : "top-headlines";
  const url = new URL(`https://gnews.io/api/v4/${endpoint}`);

  url.searchParams.set("apikey", GNEWS_API_KEY);
  url.searchParams.set("lang", language);
  url.searchParams.set("max", String(max));
  if (query)    url.searchParams.set("q", query);
  if (category) url.searchParams.set("category", category);
  if (country)  url.searchParams.set("country", country);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`GNews error: ${response.statusText}`);
  }
  return response.json() as Promise<GNewsResponse>;
}

// React hook example:
//
// export function useNews(params: GNewsParams = {}) {
//   const [articles, setArticles] = useState<GNewsArticle[]>([]);
//   const [loading, setLoading]   = useState(true);
//   const [error, setError]       = useState<string | null>(null);
//
//   useEffect(() => {
//     getNews(params)
//       .then((data) => setArticles(data.articles))
//       .catch((e)   => setError(e.message))
//       .finally(()  => setLoading(false));
//   }, []);
//
//   return { articles, loading, error };
// }


// ============================================================
// 3. GOOGLE MAPS — Geocoding (address → coordinates)
// ============================================================

export interface GeocodeResult {
  formatted_address: string;
  geometry: {
    location: { lat: number; lng: number };
  };
  place_id: string;
}

export interface GeocodeResponse {
  results: GeocodeResult[];
  status: string;
}

/**
 * Convert a human-readable address into lat/lng coordinates.
 * NOTE: Call this from your backend or a proxy to keep your API key secret.
 * @example const geo = await geocodeAddress("Karachi, Pakistan");
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult[]> {
  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", address);
  url.searchParams.set("key", GOOGLE_MAPS_API_KEY);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Google Maps Geocode error: ${response.statusText}`);
  }
  const data = (await response.json()) as GeocodeResponse;
  if (data.status !== "OK") {
    throw new Error(`Geocode failed with status: ${data.status}`);
  }
  return data.results;
}

// Load the Google Maps JS SDK into React:
//
// useEffect(() => {
//   const script = document.createElement("script");
//   script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}`;
//   script.async = true;
//   document.head.appendChild(script);
//   script.onload = () => {
//     const map = new window.google.maps.Map(document.getElementById("map")!, {
//       center: { lat: 24.8607, lng: 67.0011 },
//       zoom: 12,
//     });
//   };
// }, []);


// ============================================================
// 4. GOOGLE DIRECTIONS API — Route between two points
// ============================================================

export type TravelMode = "DRIVING" | "WALKING" | "BICYCLING" | "TRANSIT";

export interface DirectionsLeg {
  distance: { text: string; value: number };
  duration: { text: string; value: number };
  start_address: string;
  end_address: string;
}

export interface DirectionsRoute {
  summary: string;
  legs: DirectionsLeg[];
  copyrights: string;
}

export interface DirectionsResponse {
  routes: DirectionsRoute[];
  status: string;
}

export interface DirectionsParams {
  origin: string;       // address or "lat,lng"
  destination: string;  // address or "lat,lng"
  mode?: TravelMode;
  waypoints?: string[]; // intermediate stops
}

/**
 * Get directions between two locations.
 * NOTE: Call from your backend or a proxy — never expose your API key on the client.
 * @example
 * const route = await getDirections({
 *   origin: "Karachi Airport",
 *   destination: "Clifton, Karachi",
 *   mode: "DRIVING",
 * });
 */
export async function getDirections(
  params: DirectionsParams
): Promise<DirectionsRoute[]> {
  const { origin, destination, mode = "DRIVING", waypoints = [] } = params;

  const url = new URL("https://maps.googleapis.com/maps/api/directions/json");
  url.searchParams.set("origin", origin);
  url.searchParams.set("destination", destination);
  url.searchParams.set("mode", mode);
  url.searchParams.set("key", GOOGLE_MAPS_API_KEY);
  if (waypoints.length > 0) {
    url.searchParams.set("waypoints", waypoints.join("|"));
  }

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Google Directions error: ${response.statusText}`);
  }
  const data = (await response.json()) as DirectionsResponse;
  if (data.status !== "OK") {
    throw new Error(`Directions failed with status: ${data.status}`);
  }
  return data.routes;
}

// Using the Directions API with the Maps JS SDK in React:
//
// const directionsService = new window.google.maps.DirectionsService();
// const directionsRenderer = new window.google.maps.DirectionsRenderer();
// directionsRenderer.setMap(map);
//
// directionsService.route(
//   {
//     origin: "Karachi Airport",
//     destination: "Clifton, Karachi",
//     travelMode: window.google.maps.TravelMode.DRIVING,
//   },
//   (result, status) => {
//     if (status === "OK" && result) {
//       directionsRenderer.setDirections(result);
//     }
//   }
// );
