import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/api";

export type UserProfile = {
  id: string;
  email: string | null;
  display_name: string | null;
};

/** React Query wrapper around GET /api/me. Disabled until the user is signed in. */
export function useCurrentUser() {
  const { status } = useAuth();
  return useQuery<UserProfile>({
    queryKey: ["me"],
    queryFn: () => apiFetch<UserProfile>("/api/me"),
    enabled: status === "authenticated",
    staleTime: 5 * 60_000,
  });
}
