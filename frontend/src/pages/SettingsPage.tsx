import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  CONNECTIONS_KEY,
  useConnections,
  useDisconnectOAuth,
  useStartOAuth,
  useSyncProvider,
  type ConnectionStatus,
  type ProviderKey,
  type SyncResult,
} from "@/hooks/useConnections";
import { ApiError } from "@/lib/api";
import { useCurrentUser, type UserProfile } from "@/hooks/useCurrentUser";
import { useUpdateProfile } from "@/hooks/useUpdateProfile";

export function SettingsPage() {
  const { t } = useTranslation();
  const { data: profile, isLoading: profileLoading } = useCurrentUser();
  const connections = useConnections();

  // After an OAuth round-trip, the backend sends us back here with a query
  // param. Capture it ONCE in the useState initializer (so we don't derive
  // state inside an effect) and then clean the URL.
  const [, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState<
    { tone: "good" | "bad"; provider: string } | null
  >(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("oauth_connected");
    const errored = params.get("oauth_error");
    if (connected) return { tone: "good", provider: connected };
    if (errored) return { tone: "bad", provider: errored };
    return null;
  });

  // If we landed with an oauth_* param, refresh connections and strip the
  // params from the URL. Runs once on mount.
  useEffect(() => {
    if (!notice) return;
    void queryClient.invalidateQueries({ queryKey: CONNECTIONS_KEY });
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("oauth_connected");
        next.delete("oauth_error");
        return next;
      },
      { replace: true },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-dismiss the notice after a few seconds.
  useEffect(() => {
    if (!notice) return;
    const id = window.setTimeout(() => setNotice(null), 5000);
    return () => window.clearTimeout(id);
  }, [notice]);

  const items = useMemo(
    () =>
      (["strava", "whoop"] as const).map((key) => ({
        key,
        label: t(`settings.${key}`),
        row: connections.data?.[key],
      })),
    [connections.data, t],
  );

  return (
    <>
      <PageHeader title={t("settings.title")} subtitle={t("settings.subtitle")} />

      {notice ? (
        <div
          role="status"
          className={
            "mb-6 rounded-lg bg-white px-4 py-3 shadow-[var(--shadow-border-light)] text-[14px] " +
            (notice.tone === "good" ? "text-foreground" : "text-[var(--color-rec-bad)]")
          }
        >
          {notice.tone === "good"
            ? t("settings.connectedNotice", { provider: notice.provider })
            : t("settings.errorNotice", { error: notice.provider })}
        </div>
      ) : null}

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
                {profileLoading ? t("common.loading") : "—"}
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
              {items.map((item) => (
                <ConnectionRow
                  key={item.key}
                  providerKey={item.key}
                  label={item.label}
                  row={item.row}
                />
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>
    </>
  );
}

function ConnectionRow({
  providerKey,
  label,
  row,
}: {
  providerKey: ProviderKey;
  label: string;
  row: ConnectionStatus | undefined;
}) {
  const { t } = useTranslation();
  const start = useStartOAuth();
  const disconnect = useDisconnectOAuth();
  const sync = useSyncProvider();

  const connected = row?.connected === true;
  const busy = start.isPending || disconnect.isPending || sync.isPending;

  const lastResult = sync.data && sync.variables === providerKey ? sync.data : null;
  const lastError =
    sync.error && sync.variables === providerKey ? formatSyncError(sync.error, t) : null;

  return (
    <li className="py-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-[15px] font-medium text-foreground">{label}</span>
          <Badge tone={connected ? "good" : "neutral"}>
            {connected ? t("settings.statusConnected") : t("settings.statusDisconnected")}
          </Badge>
        </div>
        <div className="flex gap-2">
          {connected ? (
            <>
              <Button
                variant="secondary"
                size="sm"
                disabled={busy}
                onClick={() => sync.mutate(providerKey)}
              >
                {sync.isPending && sync.variables === providerKey
                  ? t("common.loading")
                  : t("settings.syncNow")}
              </Button>
              <Button
                variant="danger"
                size="sm"
                disabled={busy}
                onClick={() => disconnect.mutate(providerKey)}
              >
                {disconnect.isPending && disconnect.variables === providerKey
                  ? t("common.loading")
                  : t("settings.disconnect")}
              </Button>
            </>
          ) : (
            <Button size="sm" disabled={busy} onClick={() => start.mutate(providerKey)}>
              {start.isPending && start.variables === providerKey
                ? t("common.loading")
                : t("settings.connect")}
            </Button>
          )}
        </div>
      </div>

      {(lastResult || lastError) && (
        <p
          className={
            "mt-2 text-[12px] " +
            (lastError ? "text-[var(--color-rec-bad)]" : "text-gray-500")
          }
          role={lastError ? "alert" : "status"}
        >
          {lastError ?? renderSyncSummary(lastResult, t)}
        </p>
      )}
    </li>
  );
}

function renderSyncSummary(result: SyncResult | null, t: ReturnType<typeof useTranslation>["t"]): string {
  if (!result) return "";
  return t("settings.syncSummary", {
    fetched: result.fetched,
    upserted: result.upserted,
  });
}

function formatSyncError(
  error: Error,
  t: ReturnType<typeof useTranslation>["t"],
): string {
  if (error instanceof ApiError) {
    if (error.status === 429) return t("settings.syncRateLimited");
    if (error.status === 409) return t("settings.syncNotConnected");
    if (error.status === 502) return t("settings.syncUpstream");
  }
  return t("settings.syncFailed");
}

function ProfileForm({ profile }: { profile: UserProfile }) {
  const { t } = useTranslation();
  const updateProfile = useUpdateProfile();

  const [displayName, setDisplayName] = useState(profile.display_name ?? "");
  const [showSaved, setShowSaved] = useState(false);

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
      // surfaced via updateProfile.isError
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
