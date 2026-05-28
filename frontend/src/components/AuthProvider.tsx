import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { AuthContext, type AuthContextValue, type AuthStatus } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase";

type InternalState = Omit<AuthContextValue, "signOut">;

const INITIAL: InternalState = { session: null, user: null, status: "loading" };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<InternalState>(INITIAL);

  useEffect(() => {
    let cancelled = false;

    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setState({
        session: data.session,
        user: data.session?.user ?? null,
        status: (data.session ? "authenticated" : "anonymous") satisfies AuthStatus,
      });
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({
        session,
        user: session?.user ?? null,
        status: (session ? "authenticated" : "anonymous") satisfies AuthStatus,
      });
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, signOut }),
    [state, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
