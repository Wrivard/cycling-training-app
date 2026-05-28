import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { useActivities } from "@/hooks/useActivities";
import { usePlannedSessions, type PlannedSession } from "@/hooks/usePlannedSessions";
import { useWhoopMetrics, type WhoopMetric } from "@/hooks/useWhoopMetrics";
import { cn } from "@/lib/cn";

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfIsoWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const monday = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - monday);
  return d;
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

function recoveryToneClass(score: number | null | undefined): string {
  if (score == null) return "bg-gray-100";
  if (score > 66) return "bg-[var(--color-rec-good)]";
  if (score >= 34) return "bg-[var(--color-rec-ok)]";
  return "bg-[var(--color-rec-bad)]";
}

export function DashboardPage() {
  const { t, i18n } = useTranslation();

  const today = new Date();
  const todayKey = ymd(today);
  const weekStart = startOfIsoWeek(today);
  const weekEnd = addDays(weekStart, 6);
  const weekStartKey = ymd(weekStart);
  const weekEndKey = ymd(weekEnd);

  const recentStart = ymd(addDays(today, -7));

  const sessionsQuery = usePlannedSessions(weekStartKey, weekEndKey);
  const whoopQuery = useWhoopMetrics(todayKey, todayKey);
  const activitiesQuery = useActivities(recentStart, todayKey);

  const upcoming = useMemo(() => {
    return (sessionsQuery.data ?? [])
      .filter((s) => s.date >= todayKey)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 5);
  }, [sessionsQuery.data, todayKey]);

  const todayRecovery: WhoopMetric | undefined = whoopQuery.data?.[0];

  const recentActivities = useMemo(() => {
    return (activitiesQuery.data ?? []).slice(0, 5);
  }, [activitiesQuery.data]);

  const weeklyLoad = useMemo(() => {
    const plannedMinutes = (sessionsQuery.data ?? []).reduce(
      (sum, s) => sum + (s.target_duration_min ?? 0),
      0,
    );
    const actualMinutes = (activitiesQuery.data ?? [])
      .filter((a) => {
        const d = a.start_date.slice(0, 10);
        return d >= weekStartKey && d <= weekEndKey;
      })
      .reduce((sum, a) => sum + a.moving_time_s / 60, 0);
    return {
      plannedMinutes,
      actualMinutes: Math.round(actualMinutes),
    };
  }, [sessionsQuery.data, activitiesQuery.data, weekStartKey, weekEndKey]);

  const weekRangeLabel = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(i18n.resolvedLanguage ?? "en", {
      day: "numeric",
      month: "short",
    });
    return `${fmt.format(weekStart)} – ${fmt.format(weekEnd)}`;
  }, [weekStart, weekEnd, i18n.resolvedLanguage]);

  return (
    <>
      <PageHeader title={t("dashboard.title")} subtitle={t("dashboard.subtitle")} />

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.sectionUpcoming")}</CardTitle>
            <p className="mt-1 font-mono text-[12px] uppercase text-gray-500">
              {weekRangeLabel}
            </p>
          </CardHeader>
          <CardBody className="pt-0">
            {sessionsQuery.isLoading ? (
              <p className="text-[14px] text-gray-500">{t("common.loading")}</p>
            ) : upcoming.length === 0 ? (
              <p className="text-[14px] text-gray-500">{t("dashboard.upcomingEmpty")}</p>
            ) : (
              <ul className="space-y-2">
                {upcoming.map((s) => (
                  <SessionRow key={s.id} session={s} />
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.sectionRecovery")}</CardTitle>
          </CardHeader>
          <CardBody className="pt-0">
            <div className="flex items-baseline gap-3">
              <span
                className={cn(
                  "h-3 w-3 rounded-full",
                  recoveryToneClass(todayRecovery?.recovery_score),
                )}
                aria-hidden
              />
              <span className="font-semibold text-[40px] leading-none tracking-[var(--tracking-section)] text-foreground">
                {todayRecovery?.recovery_score != null
                  ? `${todayRecovery.recovery_score}%`
                  : "—"}
              </span>
            </div>
            {todayRecovery ? (
              <dl className="mt-4 grid grid-cols-2 gap-3 text-[12px]">
                {todayRecovery.hrv_ms != null ? (
                  <MetricMini
                    label="HRV"
                    value={`${todayRecovery.hrv_ms.toFixed(0)} ms`}
                  />
                ) : null}
                {todayRecovery.resting_hr != null ? (
                  <MetricMini
                    label="RHR"
                    value={`${todayRecovery.resting_hr.toFixed(0)} bpm`}
                  />
                ) : null}
                {todayRecovery.sleep_duration_min != null ? (
                  <MetricMini
                    label={t("dashboard.metricSleep")}
                    value={`${(todayRecovery.sleep_duration_min / 60).toFixed(1)} h`}
                  />
                ) : null}
                {todayRecovery.strain != null ? (
                  <MetricMini
                    label={t("dashboard.metricStrain")}
                    value={todayRecovery.strain.toFixed(1)}
                  />
                ) : null}
              </dl>
            ) : (
              <p className="mt-3 text-[14px] text-gray-500">
                {t("dashboard.noWhoopToday")}
              </p>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.sectionLoad")}</CardTitle>
            <p className="mt-1 font-mono text-[12px] uppercase text-gray-500">
              {weekRangeLabel}
            </p>
          </CardHeader>
          <CardBody className="pt-0 space-y-3">
            <LoadRow
              label={t("dashboard.loadPlanned")}
              minutes={weeklyLoad.plannedMinutes}
            />
            <LoadRow
              label={t("dashboard.loadActual")}
              minutes={weeklyLoad.actualMinutes}
            />
          </CardBody>
        </Card>

        <Card className="md:col-span-2 xl:col-span-3">
          <CardHeader>
            <CardTitle>{t("dashboard.sectionRecent")}</CardTitle>
          </CardHeader>
          <CardBody className="pt-0">
            {activitiesQuery.isLoading ? (
              <p className="text-[14px] text-gray-500">{t("common.loading")}</p>
            ) : recentActivities.length === 0 ? (
              <p className="text-[14px] text-gray-500">{t("dashboard.recentEmpty")}</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {recentActivities.map((a) => (
                  <li key={a.id} className="flex items-center justify-between py-2">
                    <div className="min-w-0 flex items-center gap-2">
                      <Badge tone="blue">Strava</Badge>
                      <span className="truncate text-[14px] font-medium text-foreground">
                        {a.name}
                      </span>
                    </div>
                    <div className="font-mono text-[12px] tabular-nums text-gray-600">
                      {a.distance_km.toFixed(1)} km ·{" "}
                      {Math.round(a.moving_time_s / 60)} min
                      {a.elevation_gain_m > 0
                        ? ` · +${Math.round(a.elevation_gain_m)} m`
                        : ""}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}

function SessionRow({ session }: { session: PlannedSession }) {
  const { t, i18n } = useTranslation();
  const date = new Date(`${session.date}T00:00:00`);
  const formatted = new Intl.DateTimeFormat(i18n.resolvedLanguage ?? "en", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(date);

  return (
    <li className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <Link
          to="/calendar"
          className="text-[14px] font-medium text-foreground hover:underline truncate block"
        >
          {session.title}
        </Link>
        <p className="font-mono text-[11px] uppercase text-gray-500 capitalize">
          {formatted}
        </p>
      </div>
      <Badge tone={typeToTone(session.type)}>
        {t(`calendar.types.${session.type}`)}
      </Badge>
    </li>
  );
}

function MetricMini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono uppercase text-[10px] text-gray-500">{label}</dt>
      <dd className="mt-0.5 text-[13px] font-medium tabular-nums text-foreground">
        {value}
      </dd>
    </div>
  );
}

function LoadRow({ label, minutes }: { label: string; minutes: number }) {
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  const display = minutes >= 60 ? `${hours}h ${mins}m` : `${minutes} min`;
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-[13px] text-gray-600">{label}</span>
      <span className="font-mono text-[20px] tabular-nums tracking-[var(--tracking-card)] font-semibold text-foreground">
        {display}
      </span>
    </div>
  );
}

function typeToTone(
  type: PlannedSession["type"],
):
  | "endurance"
  | "intervals"
  | "recovery"
  | "rest"
  | "race"
  | "other" {
  return type;
}
