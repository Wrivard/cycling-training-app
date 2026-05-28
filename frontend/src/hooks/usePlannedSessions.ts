import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";

import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/api";

export type SessionType =
  | "endurance"
  | "intervals"
  | "recovery"
  | "rest"
  | "race"
  | "other";

export type PlannedSession = {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  type: SessionType;
  title: string;
  description: string | null;
  target_distance_km: number | null;
  target_duration_min: number | null;
  target_tss: number | null;
  route_id: string | null;
  completed_activity_id: string | null;
  created_at: string;
  updated_at: string;
};

export type PlannedSessionCreate = {
  date: string;
  type: SessionType;
  title: string;
  description?: string | null;
  target_distance_km?: number | null;
  target_duration_min?: number | null;
  target_tss?: number | null;
  route_id?: string | null;
};

export type PlannedSessionUpdate = Partial<PlannedSessionCreate> & {
  completed_activity_id?: string | null;
};

export const sessionsKey = (start: string, end: string): QueryKey => [
  "planned-sessions",
  start,
  end,
];

export function usePlannedSessions(start: string, end: string) {
  const { status } = useAuth();
  return useQuery<PlannedSession[]>({
    queryKey: sessionsKey(start, end),
    queryFn: () =>
      apiFetch<PlannedSession[]>(
        `/api/sessions?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
      ),
    enabled: status === "authenticated" && start <= end,
  });
}

export function useCreateSession() {
  const queryClient = useQueryClient();
  return useMutation<PlannedSession, Error, PlannedSessionCreate>({
    mutationFn: (input) =>
      apiFetch<PlannedSession>("/api/sessions", { method: "POST", body: input }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["planned-sessions"] });
    },
  });
}

export function useUpdateSession() {
  const queryClient = useQueryClient();
  return useMutation<
    PlannedSession,
    Error,
    { id: string; patch: PlannedSessionUpdate }
  >({
    mutationFn: ({ id, patch }) =>
      apiFetch<PlannedSession>(`/api/sessions/${id}`, {
        method: "PATCH",
        body: patch,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["planned-sessions"] });
    },
  });
}

export function useDeleteSession() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) =>
      apiFetch<void>(`/api/sessions/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["planned-sessions"] });
    },
  });
}
