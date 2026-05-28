import "mapbox-gl/dist/mapbox-gl.css";

import mapboxgl from "mapbox-gl";
import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";

import { MAPBOX_TOKEN, fetchCyclingDirections, type LngLat } from "@/lib/mapbox";

const ROUTE_SOURCE_ID = "route-line";
const ROUTE_LAYER_ID = "route-line-layer";
const DEFAULT_CENTER: LngLat = [-71.2, 46.81]; // Québec City — close enough for a Wrivard MVP

export type RouteMapHandle = {
  undoLastWaypoint: () => void;
  clear: () => void;
  getState: () => RouteMapState;
};

export type RouteMapState = {
  waypoints: LngLat[];
  geometry: GeoJSON.Feature<GeoJSON.LineString> | null;
  distance_m: number;
  duration_s: number;
};

type Props = {
  ref?: Ref<RouteMapHandle>;
  onStateChange?: (state: RouteMapState) => void;
};

const EMPTY_STATE: RouteMapState = {
  waypoints: [],
  geometry: null,
  distance_m: 0,
  duration_s: 0,
};

/**
 * Mapbox map with click-to-add-waypoint drawing. Each click triggers a
 * Directions request in cycling profile; the returned snapped LineString
 * replaces the rendered route. Markers stay on the waypoints.
 */
export function RouteMap({ ref, onStateChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const stateRef = useRef<RouteMapState>(EMPTY_STATE);
  const isFetchingRef = useRef(false);
  const [tokenMissing] = useState(!MAPBOX_TOKEN);

  // Apply current state to the map (markers + line layer).
  function applyState(next: RouteMapState) {
    stateRef.current = next;
    onStateChange?.(next);

    // Sync markers.
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = next.waypoints.map((point, idx) => {
      const el = document.createElement("div");
      el.className =
        "h-3 w-3 rounded-full bg-foreground shadow-[0_0_0_2px_white,0_0_0_3px_rgba(0,0,0,0.08)]";
      el.title = `Waypoint ${idx + 1}`;
      return new mapboxgl.Marker(el).setLngLat(point).addTo(mapRef.current!);
    });

    // Sync the route line.
    const map = mapRef.current;
    if (!map) return;
    const source = map.getSource(ROUTE_SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
    const emptyFeature: GeoJSON.Feature<GeoJSON.LineString> = {
      type: "Feature",
      geometry: { type: "LineString", coordinates: [] },
      properties: {},
    };
    if (source) {
      source.setData(next.geometry ?? emptyFeature);
    }
  }

  async function appendWaypoint(point: LngLat) {
    const previous = stateRef.current.waypoints;
    const waypoints = [...previous, point];

    if (waypoints.length < 2) {
      applyState({ ...EMPTY_STATE, waypoints });
      return;
    }

    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      const result = await fetchCyclingDirections(waypoints);
      const geometryFeature: GeoJSON.Feature<GeoJSON.LineString> = {
        type: "Feature",
        geometry: result.geometry,
        properties: {
          distance_m: result.distance_m,
          duration_s: result.duration_s,
        },
      };
      applyState({
        waypoints,
        geometry: geometryFeature,
        distance_m: result.distance_m,
        duration_s: result.duration_s,
      });
    } catch {
      // If the Directions call failed, fall back to a straight LineString so the
      // user at least sees their waypoints connected.
      const straight: GeoJSON.Feature<GeoJSON.LineString> = {
        type: "Feature",
        geometry: { type: "LineString", coordinates: waypoints },
        properties: {},
      };
      applyState({
        waypoints,
        geometry: straight,
        distance_m: 0,
        duration_s: 0,
      });
    } finally {
      isFetchingRef.current = false;
    }
  }

  useImperativeHandle(
    ref,
    () => ({
      undoLastWaypoint: () => {
        const next = stateRef.current.waypoints.slice(0, -1);
        if (next.length < 2) {
          applyState({ ...EMPTY_STATE, waypoints: next });
          return;
        }
        void (async () => {
          try {
            const result = await fetchCyclingDirections(next);
            applyState({
              waypoints: next,
              geometry: {
                type: "Feature",
                geometry: result.geometry,
                properties: {},
              },
              distance_m: result.distance_m,
              duration_s: result.duration_s,
            });
          } catch {
            applyState({
              waypoints: next,
              geometry: {
                type: "Feature",
                geometry: { type: "LineString", coordinates: next },
                properties: {},
              },
              distance_m: 0,
              duration_s: 0,
            });
          }
        })();
      },
      clear: () => applyState(EMPTY_STATE),
      getState: () => stateRef.current,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    if (!containerRef.current || tokenMissing) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: DEFAULT_CENTER,
      zoom: 10,
    });
    mapRef.current = map;
    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: false }));

    map.on("load", () => {
      map.addSource(ROUTE_SOURCE_ID, {
        type: "geojson",
        data: { type: "Feature", geometry: { type: "LineString", coordinates: [] }, properties: {} },
      });
      map.addLayer({
        id: ROUTE_LAYER_ID,
        type: "line",
        source: ROUTE_SOURCE_ID,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#0a72ef",
          "line-width": 4,
          "line-opacity": 0.85,
        },
      });
    });

    map.on("click", (e) => {
      void appendWaypoint([e.lngLat.lng, e.lngLat.lat]);
    });

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
      stateRef.current = EMPTY_STATE;
    };
    // We intentionally run this once per mount; state changes never recreate the map.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (tokenMissing) {
    return (
      <div className="flex h-full min-h-[400px] items-center justify-center rounded-lg bg-gray-50 text-center text-[14px] text-gray-500 shadow-[var(--shadow-border-light)] px-6">
        Set <code className="font-mono">VITE_MAPBOX_TOKEN</code> in your <code>.env</code> to enable the map.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-full min-h-[500px] w-full overflow-hidden rounded-lg shadow-[var(--shadow-border-light)]"
    />
  );
}
