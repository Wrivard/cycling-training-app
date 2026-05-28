import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/api";

export type ProviderKey = "strava" | "whoop";

export type ConnectionStatus = {
  provider: ProviderKey;
  connected: boolean;
  expires_at: string | null;
  scope: string | null;
  provider_user_id: string | null;
};

export type ConnectionsResponse = {
  strava: ConnectionStatus;
  whoop: ConnectionStatus;
};

const CONNECTIONS_KEY = ["oauth-connections"] as const;

export function useConnections() {
  const { status } = useAuth();
  return useQuery<ConnectionsResponse>({
    queryKey: CONNECTIONS_KEY,
    queryFn: () => apiFetch<ConnectionsResponse>("/api/oauth/connections"),
    enabled: status === "authenticated",
    staleTime: 30_000,
  });
}

/** Starts the OAuth flow by fetching the authorize URL and redirecting the browser. */
export function useStartOAuth() {
  return useMutation<void, Error, ProviderKey>({
    mutationFn: async (provider) => {
      const path = `/api/oauth/${provider}/start?redirect_to=${encodeURIComponent("/settings")}`;
      const { authorize_url } = await apiFetch<{ authorize_url: string }>(path);
      // Hard navigation — Supabase auth + page state will resume after the round trip.
      window.location.href = authorize_url;
    },
  });
}

export function useDisconnectOAuth() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, ProviderKey>({
    mutationFn: (provider) =>
      apiFetch<void>(`/api/oauth/${provider}/disconnect`, { method: "POST" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CONNECTIONS_KEY });
    },
  });
}

export { CONNECTIONS_KEY };
