import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/api";

export type RouteSource = "drawn" | "gpx";

export type SavedRoute = {
  id: string;
  user_id: string;
  name: string;
  distance_km: number;
  elevation_gain_m: number;
  geojson: GeoJSON.Feature;
  source: RouteSource;
  created_at: string;
};

export type RouteCreateInput = {
  name: string;
  distance_km: number;
  elevation_gain_m: number;
  geojson: GeoJSON.Feature;
  source: RouteSource;
};

const ROUTES_KEY = ["routes"] as const;

export function useRoutes() {
  const { status } = useAuth();
  return useQuery<SavedRoute[]>({
    queryKey: ROUTES_KEY,
    queryFn: () => apiFetch<SavedRoute[]>("/api/routes"),
    enabled: status === "authenticated",
  });
}

export function useCreateRoute() {
  const queryClient = useQueryClient();
  return useMutation<SavedRoute, Error, RouteCreateInput>({
    mutationFn: (input) =>
      apiFetch<SavedRoute>("/api/routes", { method: "POST", body: input }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ROUTES_KEY });
    },
  });
}

export function useImportGpx() {
  const queryClient = useQueryClient();
  return useMutation<SavedRoute, Error, File>({
    mutationFn: (file) => {
      const form = new FormData();
      form.append("file", file);
      return apiFetch<SavedRoute>("/api/routes/import-gpx", {
        method: "POST",
        body: form,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ROUTES_KEY });
    },
  });
}

export function useDeleteRoute() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => apiFetch<void>(`/api/routes/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ROUTES_KEY });
    },
  });
}
