import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/api";
import type { PlannedSession } from "@/hooks/usePlannedSessions";

export type Activity = {
  id: string;
  user_id: string;
  strava_id: number;
  name: string;
  type: string;
  start_date: string;
  distance_km: number;
  moving_time_s: number;
  elevation_gain_m: number;
  average_speed_kmh: number | null;
  average_hr: number | null;
  max_hr: number | null;
  polyline: string | null;
};

export type SessionComparison = {
  session: PlannedSession;
  activity: Activity;
  delta_distance_km: number | null;
  delta_duration_min: number | null;
  delta_elevation_m: number | null;
};

export function useActivities(start: string, end: string) {
  const { status } = useAuth();
  return useQuery<Activity[]>({
    queryKey: ["activities", start, end],
    queryFn: () =>
      apiFetch<Activity[]>(
        `/api/activities?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
      ),
    enabled: status === "authenticated" && start <= end,
  });
}

export function useMatchSession() {
  const queryClient = useQueryClient();
  return useMutation<
    SessionComparison,
    Error,
    { sessionId: string; activityId: string }
  >({
    mutationFn: ({ sessionId, activityId }) =>
      apiFetch<SessionComparison>(
        `/api/sessions/${sessionId}/match/${activityId}`,
        { method: "POST" },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["planned-sessions"] });
    },
  });
}
