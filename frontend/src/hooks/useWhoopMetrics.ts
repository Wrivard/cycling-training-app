import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/api";

export type WhoopMetric = {
  id: string;
  user_id: string;
  date: string;
  recovery_score: number | null;
  hrv_ms: number | null;
  resting_hr: number | null;
  strain: number | null;
  sleep_performance: number | null;
  sleep_duration_min: number | null;
};

export function useWhoopMetrics(start: string, end: string) {
  const { status } = useAuth();
  return useQuery<WhoopMetric[]>({
    queryKey: ["whoop-metrics", start, end],
    queryFn: () =>
      apiFetch<WhoopMetric[]>(
        `/api/whoop/metrics?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
      ),
    enabled: status === "authenticated" && start <= end,
  });
}
