import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { UserProfile } from "@/hooks/useCurrentUser";
import { apiFetch } from "@/lib/api";

export type UpdateProfileInput = { display_name: string };

/** Mutation: PATCH /api/me/profile. Updates the `me` cache in place on success. */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation<UserProfile, Error, UpdateProfileInput>({
    mutationFn: (input) =>
      apiFetch<UserProfile>("/api/me/profile", {
        method: "PATCH",
        body: input,
      }),
    onSuccess: (data) => {
      queryClient.setQueryData<UserProfile>(["me"], data);
    },
  });
}
