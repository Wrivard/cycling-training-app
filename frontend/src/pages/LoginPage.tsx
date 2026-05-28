import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useLocation } from "react-router-dom";

import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";

type LocationState = { from?: string } | null;
type Mode = "signin" | "signup";

export function LoginPage() {
  const { t } = useTranslation();
  const { status } = useAuth();
  const location = useLocation();
  const fromPath = (location.state as LocationState)?.from ?? "/";

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  if (status === "authenticated") {
    return <Navigate to={fromPath} replace />;
  }

  function toggleMode() {
    setMode((m) => (m === "signin" ? "signup" : "signin"));
    setError(null);
    setEmailSent(false);
  }

  async function handleEmailSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "signin") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) setError(t("auth.errorSignIn"));
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) {
          setError(signUpError.message);
        } else if (!data.session) {
          // Email confirmation is required in this Supabase project.
          setEmailSent(true);
        }
        // If data.session is set, onAuthStateChange will flip status and the
        // <Navigate> at the top will run on next render.
      }
    } catch {
      setError(t("auth.errorGeneric"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleSignIn() {
    setError(null);
    setSubmitting(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/` },
      });
      if (signInError) {
        setError(t("auth.errorGeneric"));
        setSubmitting(false);
      }
      // success path: Supabase performs the redirect, the page is leaving.
    } catch {
      setError(t("auth.errorGeneric"));
      setSubmitting(false);
    }
  }

  const heading = mode === "signin" ? t("auth.signIn") : t("auth.signUp");
  const cta = mode === "signin" ? t("auth.submit") : t("auth.createAccount");

  return (
    <div className="grid min-h-screen place-items-center bg-white px-6">
      <div className="w-full max-w-[380px]">
        <div className="mb-8 flex items-center justify-between">
          <span className="font-mono text-[13px] font-medium uppercase tracking-normal text-foreground">
            {t("app.name")}
          </span>
          <LanguageSwitcher />
        </div>

        <Card lift>
          <CardBody>
            <h1 className="text-[28px] font-semibold leading-tight tracking-[var(--tracking-card)] text-foreground">
              {heading}
            </h1>
            <p className="mt-1 text-[14px] text-gray-600">{t("app.tagline")}</p>

            {emailSent ? (
              <div
                className="mt-6 rounded-lg bg-gray-50 px-4 py-3 shadow-[var(--shadow-border-light)]"
                role="status"
              >
                <p className="text-[14px] text-foreground">{t("auth.emailSentTitle")}</p>
                <p className="mt-1 text-[13px] text-gray-600">{t("auth.emailSentBody")}</p>
              </div>
            ) : (
              <form onSubmit={(e) => void handleEmailSubmit(e)} className="mt-6 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">{t("auth.email")}</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={submitting}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">{t("auth.password")}</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={submitting}
                  />
                </div>

                {error ? (
                  <p className="text-[13px] text-[var(--color-rec-bad)]" role="alert">
                    {error}
                  </p>
                ) : null}

                <Button type="submit" fullWidth disabled={submitting}>
                  {submitting ? t("auth.loading") : cta}
                </Button>
              </form>
            )}

            <div className="my-5 flex items-center gap-3 text-[12px] text-gray-400">
              <div className="h-px flex-1 bg-gray-100" />
              <span className="uppercase font-mono">{t("auth.or")}</span>
              <div className="h-px flex-1 bg-gray-100" />
            </div>

            <Button
              variant="secondary"
              fullWidth
              onClick={() => void handleGoogleSignIn()}
              disabled={submitting}
            >
              {t("auth.signInWith", { provider: t("auth.googleProvider") })}
            </Button>

            <p className="mt-5 text-center text-[13px] text-gray-500">
              {mode === "signin" ? t("auth.noAccount") : t("auth.haveAccount")}{" "}
              <button
                type="button"
                onClick={toggleMode}
                className="text-link underline-offset-2 hover:underline"
              >
                {mode === "signin" ? t("auth.signUp") : t("auth.signIn")}
              </button>
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
