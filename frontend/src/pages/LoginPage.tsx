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

export function LoginPage() {
  const { t } = useTranslation();
  const { status } = useAuth();
  const location = useLocation();
  const fromPath = (location.state as LocationState)?.from ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status === "authenticated") {
    return <Navigate to={fromPath} replace />;
  }

  async function handleEmailSignIn(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) setError(t("auth.errorGeneric"));
    } catch {
      setError(t("auth.errorGeneric"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleSignIn() {
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/` },
    });
    if (signInError) setError(t("auth.errorGeneric"));
  }

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
              {t("auth.signIn")}
            </h1>
            <p className="mt-1 text-[14px] text-gray-600">{t("app.tagline")}</p>

            <form onSubmit={(e) => void handleEmailSignIn(e)} className="mt-6 space-y-4">
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
                  autoComplete="current-password"
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
                {submitting ? t("auth.loading") : t("auth.submit")}
              </Button>
            </form>

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
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
