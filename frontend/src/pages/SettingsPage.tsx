import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { PageHeader } from "@/components/ui/PageHeader";
import { useCurrentUser, type UserProfile } from "@/hooks/useCurrentUser";
import { useUpdateProfile } from "@/hooks/useUpdateProfile";

type Connection = {
  key: "strava" | "whoop";
  label: string;
  connected: boolean;
};

export function SettingsPage() {
  const { t } = useTranslation();
  const { data: profile, isLoading } = useCurrentUser();

  // Real connection status comes from the backend in step 3.
  const connections: Connection[] = [
    { key: "strava", label: t("settings.strava"), connected: false },
    { key: "whoop", label: t("settings.whoop"), connected: false },
  ];

  return (
    <>
      <PageHeader title={t("settings.title")} subtitle={t("settings.subtitle")} />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("settings.profile")}</CardTitle>
          </CardHeader>
          <CardBody className="pt-0">
            {profile ? (
              <ProfileForm profile={profile} />
            ) : (
              <p className="text-[14px] text-gray-500">
                {isLoading ? t("common.loading") : "—"}
              </p>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("settings.connections")}</CardTitle>
          </CardHeader>
          <CardBody className="pt-0">
            <ul className="divide-y divide-gray-100">
              {connections.map((conn) => (
                <li key={conn.key} className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-3">
                    <span className="text-[15px] font-medium text-foreground">{conn.label}</span>
                    <Badge tone={conn.connected ? "good" : "neutral"}>
                      {conn.connected
                        ? t("settings.statusConnected")
                        : t("settings.statusDisconnected")}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    {conn.connected ? (
                      <>
                        <Button variant="secondary" size="sm">
                          {t("settings.syncNow")}
                        </Button>
                        <Button variant="danger" size="sm">
                          {t("settings.disconnect")}
                        </Button>
                      </>
                    ) : (
                      <Button size="sm">{t("settings.connect")}</Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>
    </>
  );
}

/** Form mounts only once the profile is loaded, so initial state can come from props. */
function ProfileForm({ profile }: { profile: UserProfile }) {
  const { t } = useTranslation();
  const updateProfile = useUpdateProfile();

  const [displayName, setDisplayName] = useState(profile.display_name ?? "");
  const [showSaved, setShowSaved] = useState(false);

  // Auto-dismiss the "Saved" confirmation after 3s.
  useEffect(() => {
    if (!showSaved) return;
    const id = window.setTimeout(() => setShowSaved(false), 3000);
    return () => window.clearTimeout(id);
  }, [showSaved]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = displayName.trim();
    if (!trimmed) return;
    try {
      await updateProfile.mutateAsync({ display_name: trimmed });
      setShowSaved(true);
    } catch {
      // mutation surfaces the error via updateProfile.isError
    }
  }

  const dirty = (profile.display_name ?? "") !== displayName.trim();

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="grid gap-4 md:max-w-md">
      <div className="space-y-1.5">
        <Label htmlFor="email">{t("auth.email")}</Label>
        <Input id="email" type="email" value={profile.email ?? ""} readOnly disabled />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="displayName">{t("settings.displayName")}</Label>
        <Input
          id="displayName"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          disabled={updateProfile.isPending}
          maxLength={200}
          required
        />
      </div>

      {updateProfile.isError ? (
        <p className="text-[13px] text-[var(--color-rec-bad)]" role="alert">
          {t("settings.profileSaveError")}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={!dirty || updateProfile.isPending}>
          {updateProfile.isPending ? t("common.loading") : t("common.save")}
        </Button>
        {showSaved && !dirty ? (
          <span className="text-[13px] text-gray-500">{t("settings.profileSaved")}</span>
        ) : null}
      </div>
    </form>
  );
}
