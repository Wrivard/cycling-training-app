import type { Session, User } from "@supabase/supabase-js";
import { createContext } from "react";

export type AuthStatus = "loading" | "authenticated" | "anonymous";

export type AuthContextValue = {
  session: Session | null;
  user: User | null;
  status: AuthStatus;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
