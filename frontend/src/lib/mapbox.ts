export const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN ?? "";

export type LngLat = [number, number]; // GeoJSON order: lon, lat

export type DirectionsResult = {
  /** GeoJSON LineString geometry — full, snapped to road. */
  geometry: { type: "LineString"; coordinates: LngLat[] };
  /** Total distance in meters. */
  distance_m: number;
  /** Total estimated duration in seconds (cycling). */
  duration_s: number;
};

/**
 * Mapbox Directions API in cycling profile. We pass every waypoint in one
 * request so the API smooths the whole route at once.
 *
 * The cycling profile does NOT return elevation — for drawn routes we record
 * elevation_gain_m = 0 and document the trade-off in the UI. GPX imports
 * still carry real elevation (gpxpy extracts it).
 */
export async function fetchCyclingDirections(
  waypoints: LngLat[],
): Promise<DirectionsResult> {
  if (waypoints.length < 2) {
    throw new Error("Need at least 2 waypoints");
  }
  if (!MAPBOX_TOKEN) {
    throw new Error("Missing VITE_MAPBOX_TOKEN");
  }
  const coords = waypoints.map(([lon, lat]) => `${lon},${lat}`).join(";");
  const url =
    `https://api.mapbox.com/directions/v5/mapbox/cycling/${coords}` +
    `?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Mapbox Directions failed: ${response.status}`);
  }
  const data = (await response.json()) as {
    routes?: Array<{
      geometry: { type: "LineString"; coordinates: LngLat[] };
      distance: number;
      duration: number;
    }>;
    code?: string;
  };
  const route = data.routes?.[0];
  if (!route) {
    throw new Error(`Mapbox Directions returned no route (${data.code ?? "unknown"})`);
  }
  return {
    geometry: route.geometry,
    distance_m: route.distance,
    duration_s: route.duration,
  };
}
