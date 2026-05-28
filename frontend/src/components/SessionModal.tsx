import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";

import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import {
  useActivities,
  useMatchSession,
  type Activity,
} from "@/hooks/useActivities";
import {
  useCreateSession,
  useDeleteSession,
  useUpdateSession,
  type PlannedSession,
  type PlannedSessionCreate,
  type SessionType,
} from "@/hooks/usePlannedSessions";

const SESSION_TYPES: SessionType[] = [
  "endurance",
  "intervals",
  "recovery",
  "rest",
  "race",
  "other",
];

type Props = {
  open: boolean;
  onClose: () => void;
  /** When set, the modal opens in edit mode. */
  existing?: PlannedSession | null;
  /** When set (and `existing` is null), modal opens in create mode for this date. */
  date?: string;
};

type FormState = {
  date: string;
  type: SessionType;
  title: string;
  description: string;
  target_distance_km: string;
  target_duration_min: string;
};

function fromExisting(existing: PlannedSession): FormState {
  return {
    date: existing.date,
    type: existing.type,
    title: existing.title,
    description: existing.description ?? "",
    target_distance_km:
      existing.target_distance_km != null ? String(existing.target_distance_km) : "",
    target_duration_min:
      existing.target_duration_min != null ? String(existing.target_duration_min) : "",
  };
}

function blankForm(date: string): FormState {
  return {
    date,
    type: "endurance",
    title: "",
    description: "",
    target_distance_km: "",
    target_duration_min: "",
  };
}

function toPayload(form: FormState): PlannedSessionCreate {
  const num = (s: string): number | null => {
    if (!s.trim()) return null;
    const n = Number(s);
    return Number.isFinite(n) && n >= 0 ? n : null;
  };
  return {
    date: form.date,
    type: form.type,
    title: form.title.trim(),
    description: form.description.trim() || null,
    target_distance_km: num(form.target_distance_km),
    target_duration_min: num(form.target_duration_min),
  };
}

export function SessionModal({ open, onClose, existing, date }: Props) {
  // Force a fresh form per "open target" via key on a subcomponent. Avoids the
  // derived-state-in-effect anti-pattern: each new edit/create instantiates a
  // new form with its initial state correctly populated.
  const formKey = existing?.id ?? date ?? "_blank";
  return (
    <Modal open={open} onClose={onClose}>
      {open ? (
        <SessionForm key={formKey} existing={existing} date={date} onClose={onClose} />
      ) : null}
    </Modal>
  );
}

function SessionForm({
  existing,
  date,
  onClose,
}: {
  existing: PlannedSession | null | undefined;
  date: string | undefined;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const createSession = useCreateSession();
  const updateSession = useUpdateSession();
  const deleteSession = useDeleteSession();

  const [form, setForm] = useState<FormState>(() =>
    existing
      ? fromExisting(existing)
      : blankForm(date ?? new Date().toISOString().slice(0, 10)),
  );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const payload = toPayload(form);
    if (!payload.title) return;
    try {
      if (existing) {
        await updateSession.mutateAsync({ id: existing.id, patch: payload });
      } else {
        await createSession.mutateAsync(payload);
      }
      onClose();
    } catch {
      // surfaced via *.isError
    }
  }

  async function onDelete() {
    if (!existing) return;
    if (!window.confirm(t("calendar.confirmDelete"))) return;
    try {
      await deleteSession.mutateAsync(existing.id);
      onClose();
    } catch {
      // surfaced via isError
    }
  }

  const pending =
    createSession.isPending || updateSession.isPending || deleteSession.isPending;
  const submitError =
    createSession.isError || updateSession.isError || deleteSession.isError;

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="px-6 py-5 space-y-4">
      <h2 className="text-[20px] font-semibold leading-tight tracking-[var(--tracking-card)] text-foreground">
        {existing ? t("calendar.editSession") : t("calendar.newSession")}
      </h2>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="date">{t("calendar.date")}</Label>
          <Input
            id="date"
            type="date"
            required
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="type">{t("calendar.type")}</Label>
          <select
            id="type"
            value={form.type}
            onChange={(e) =>
              setForm((f) => ({ ...f, type: e.target.value as SessionType }))
            }
            className="h-9 w-full rounded-md bg-white px-3 text-[14px] text-foreground shadow-[var(--shadow-border-light)] hover:shadow-[var(--shadow-border)] focus:outline-none focus:shadow-[0_0_0_1px_var(--color-focus)]"
          >
            {SESSION_TYPES.map((type) => (
              <option key={type} value={type}>
                {t(`calendar.types.${type}`)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="title">{t("calendar.title")}</Label>
        <Input
          id="title"
          required
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          placeholder={t("calendar.titlePlaceholder")}
          maxLength={200}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="distance">{t("calendar.targetDistance")}</Label>
          <Input
            id="distance"
            type="number"
            min={0}
            step="0.1"
            value={form.target_distance_km}
            onChange={(e) =>
              setForm((f) => ({ ...f, target_distance_km: e.target.value }))
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="duration">{t("calendar.targetDuration")}</Label>
          <Input
            id="duration"
            type="number"
            min={0}
            step="1"
            value={form.target_duration_min}
            onChange={(e) =>
              setForm((f) => ({ ...f, target_duration_min: e.target.value }))
            }
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">{t("calendar.description")}</Label>
        <textarea
          id="description"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          rows={3}
          className="w-full rounded-md bg-white px-3 py-2 text-[14px] text-foreground shadow-[var(--shadow-border-light)] hover:shadow-[var(--shadow-border)] focus:outline-none focus:shadow-[0_0_0_1px_var(--color-focus)] resize-y"
        />
      </div>

      {submitError ? (
        <p className="text-[13px] text-[var(--color-rec-bad)]" role="alert">
          {t("calendar.saveError")}
        </p>
      ) : null}

      <div className="flex items-center justify-between pt-2">
        <div>
          {existing ? (
            <Button
              type="button"
              variant="danger"
              size="sm"
              disabled={pending}
              onClick={() => void onDelete()}
            >
              {t("common.delete")}
            </Button>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={pending}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={pending || !form.title.trim()}>
            {pending ? t("common.loading") : t("common.save")}
          </Button>
        </div>
      </div>

      {existing ? <MatchingSection session={existing} /> : null}
    </form>
  );
}

/** Planned-vs-actual section. Pulls Strava activities for the session's date. */
function MatchingSection({ session }: { session: PlannedSession }) {
  const { t } = useTranslation();
  const activities = useActivities(session.date, session.date);
  const matchMutation = useMatchSession();
  const updateMutation = useUpdateSession();

  const matched =
    session.completed_activity_id != null
      ? activities.data?.find((a) => a.id === session.completed_activity_id)
      : undefined;
  const candidates = (activities.data ?? []).filter(
    (a) => a.id !== session.completed_activity_id,
  );

  const busy = matchMutation.isPending || updateMutation.isPending;

  function onUnmatch() {
    updateMutation.mutate({
      id: session.id,
      patch: { completed_activity_id: null },
    });
  }

  return (
    <div className="mt-2 border-t border-gray-100 pt-4 space-y-3">
      <h3 className="text-[13px] font-medium tracking-[var(--tracking-snug)] text-foreground">
        {t("calendar.matching")}
      </h3>

      {activities.isLoading ? (
        <p className="text-[13px] text-gray-500">{t("common.loading")}</p>
      ) : null}

      {matched ? (
        <ComparisonView session={session} activity={matched} onUnmatch={onUnmatch} busy={busy} />
      ) : (
        <>
          {candidates.length === 0 && !activities.isLoading ? (
            <p className="text-[13px] text-gray-500">{t("calendar.noActivityToMatch")}</p>
          ) : null}
          {candidates.length > 0 ? (
            <ul className="space-y-1.5">
              {candidates.map((activity) => (
                <li
                  key={activity.id}
                  className="flex items-center justify-between gap-3 rounded-md bg-gray-50 px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-medium text-foreground">
                      {activity.name}
                    </div>
                    <div className="mt-0.5 text-[12px] text-gray-500 font-mono tabular-nums">
                      {activity.distance_km.toFixed(1)} km ·{" "}
                      {Math.round(activity.moving_time_s / 60)} min
                      {activity.elevation_gain_m > 0
                        ? ` · +${Math.round(activity.elevation_gain_m)} m`
                        : ""}
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={busy}
                    onClick={() =>
                      matchMutation.mutate({
                        sessionId: session.id,
                        activityId: activity.id,
                      })
                    }
                  >
                    {matchMutation.isPending &&
                    matchMutation.variables?.activityId === activity.id
                      ? t("common.loading")
                      : t("calendar.matchButton")}
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      )}
    </div>
  );
}

function ComparisonView({
  session,
  activity,
  onUnmatch,
  busy,
}: {
  session: PlannedSession;
  activity: Activity;
  onUnmatch: () => void;
  busy: boolean;
}) {
  const { t } = useTranslation();

  const actualMinutes = activity.moving_time_s / 60;
  const distanceDelta =
    session.target_distance_km != null
      ? activity.distance_km - session.target_distance_km
      : null;
  const durationDelta =
    session.target_duration_min != null
      ? actualMinutes - session.target_duration_min
      : null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Badge tone="blue">Strava</Badge>
            <span className="truncate text-[13px] font-medium text-foreground">
              {activity.name}
            </span>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={busy}
          onClick={onUnmatch}
        >
          {busy ? t("common.loading") : t("calendar.unmatch")}
        </Button>
      </div>

      <dl className="grid grid-cols-3 gap-3 rounded-md bg-gray-50 px-3 py-2 text-[12px]">
        <Metric
          label={t("calendar.metricDistance")}
          actual={`${activity.distance_km.toFixed(1)} km`}
          target={
            session.target_distance_km != null
              ? `${session.target_distance_km.toFixed(1)} km`
              : null
          }
          delta={distanceDelta != null ? `${distanceDelta >= 0 ? "+" : ""}${distanceDelta.toFixed(1)} km` : null}
          deltaTone={distanceDelta == null ? "neutral" : distanceDelta >= 0 ? "good" : "bad"}
        />
        <Metric
          label={t("calendar.metricDuration")}
          actual={`${Math.round(actualMinutes)} min`}
          target={
            session.target_duration_min != null
              ? `${session.target_duration_min} min`
              : null
          }
          delta={
            durationDelta != null
              ? `${durationDelta >= 0 ? "+" : ""}${Math.round(durationDelta)} min`
              : null
          }
          deltaTone={durationDelta == null ? "neutral" : durationDelta >= 0 ? "good" : "bad"}
        />
        <Metric
          label={t("calendar.metricElevation")}
          actual={`${Math.round(activity.elevation_gain_m)} m`}
          target={null}
          delta={null}
          deltaTone="neutral"
        />
      </dl>
    </div>
  );
}

function Metric({
  label,
  actual,
  target,
  delta,
  deltaTone,
}: {
  label: string;
  actual: string;
  target: string | null;
  delta: string | null;
  deltaTone: "good" | "bad" | "neutral";
}) {
  return (
    <div>
      <dt className="font-mono uppercase text-[10px] text-gray-500">{label}</dt>
      <dd className="mt-0.5 text-[13px] font-medium tabular-nums text-foreground">{actual}</dd>
      {target ? (
        <dd className="text-[11px] text-gray-500 tabular-nums">↳ {target}</dd>
      ) : null}
      {delta ? (
        <dd
          className={
            "mt-0.5 text-[11px] tabular-nums " +
            (deltaTone === "good"
              ? "text-[var(--color-rec-good)]"
              : deltaTone === "bad"
                ? "text-[var(--color-rec-bad)]"
                : "text-gray-500")
          }
        >
          {delta}
        </dd>
      ) : null}
    </div>
  );
}
