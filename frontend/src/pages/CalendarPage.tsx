import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { SessionModal } from "@/components/SessionModal";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  usePlannedSessions,
  type PlannedSession,
  type SessionType,
} from "@/hooks/usePlannedSessions";
import { useActivities } from "@/hooks/useActivities";
import { useWhoopMetrics } from "@/hooks/useWhoopMetrics";
import { cn } from "@/lib/cn";

/** Format a Date as YYYY-MM-DD (no timezone conversion — we compare to DB date strings). */
function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

/** 6-row × 7-column grid spanning the month, padded with adjacent-month dates. Monday-first. */
function buildMonthGrid(viewMonth: Date): Date[][] {
  const first = startOfMonth(viewMonth);
  // ISO week — Monday=0..Sunday=6
  const dayOfWeek = (first.getDay() + 6) % 7;
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - dayOfWeek);

  const weeks: Date[][] = [];
  for (let w = 0; w < 6; w++) {
    const row: Date[] = [];
    for (let d = 0; d < 7; d++) {
      const cell = new Date(gridStart);
      cell.setDate(gridStart.getDate() + w * 7 + d);
      row.push(cell);
    }
    weeks.push(row);
  }
  return weeks;
}

function recoveryToneClass(score: number | null): string {
  if (score == null) return "bg-gray-100";
  if (score > 66) return "bg-[var(--color-rec-good)]";
  if (score >= 34) return "bg-[var(--color-rec-ok)]";
  return "bg-[var(--color-rec-bad)]";
}

function badgeClassForType(type: SessionType): string {
  switch (type) {
    case "endurance":
      return "bg-[color-mix(in_srgb,var(--color-endurance)_14%,white)] text-[var(--color-endurance)]";
    case "intervals":
      return "bg-[color-mix(in_srgb,var(--color-intervals)_14%,white)] text-[var(--color-intervals)]";
    case "race":
      return "bg-[color-mix(in_srgb,var(--color-race)_14%,white)] text-[var(--color-race)]";
    case "recovery":
      return "bg-gray-50 text-gray-600";
    case "rest":
      return "bg-white text-gray-500 shadow-[var(--shadow-border-light)]";
    case "other":
    default:
      return "bg-gray-50 text-foreground";
  }
}

const WEEKDAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

export function CalendarPage() {
  const { t, i18n } = useTranslation();
  const [viewMonth, setViewMonth] = useState<Date>(() => startOfMonth(new Date()));
  const [modalState, setModalState] = useState<
    | { kind: "create"; date: string }
    | { kind: "edit"; session: PlannedSession }
    | null
  >(null);

  const weeks = useMemo(() => buildMonthGrid(viewMonth), [viewMonth]);
  // Pull a wider range than the visible month so spillover cells render data too.
  const rangeStart = weeks[0][0];
  const rangeEnd = weeks[weeks.length - 1][6];
  const startKey = ymd(rangeStart);
  const endKey = ymd(rangeEnd);

  const sessionsQuery = usePlannedSessions(startKey, endKey);
  const whoopQuery = useWhoopMetrics(startKey, endKey);
  const activitiesQuery = useActivities(startKey, endKey);

  // Index sessions and whoop metrics by YYYY-MM-DD for O(1) lookup per cell.
  const sessionsByDate = useMemo(() => {
    const map = new Map<string, PlannedSession[]>();
    for (const s of sessionsQuery.data ?? []) {
      const list = map.get(s.date) ?? [];
      list.push(s);
      map.set(s.date, list);
    }
    return map;
  }, [sessionsQuery.data]);

  const recoveryByDate = useMemo(() => {
    const map = new Map<string, number | null>();
    for (const m of whoopQuery.data ?? []) {
      map.set(m.date, m.recovery_score);
    }
    return map;
  }, [whoopQuery.data]);

  const activityCountByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of activitiesQuery.data ?? []) {
      const key = a.start_date.slice(0, 10); // YYYY-MM-DD from ISO
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [activitiesQuery.data]);

  const monthLabel = viewMonth.toLocaleDateString(i18n.resolvedLanguage ?? "en", {
    month: "long",
    year: "numeric",
  });

  const todayKey = ymd(new Date());

  return (
    <>
      <PageHeader
        title={t("calendar.title")}
        subtitle={t("calendar.subtitle")}
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setViewMonth(addMonths(viewMonth, -1))}
              aria-label={t("calendar.prevMonth")}
            >
              ←
            </Button>
            <span className="text-[14px] font-medium tracking-[var(--tracking-snug)] capitalize min-w-[160px] text-center">
              {monthLabel}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setViewMonth(addMonths(viewMonth, 1))}
              aria-label={t("calendar.nextMonth")}
            >
              →
            </Button>
            <Button
              size="sm"
              onClick={() => setViewMonth(startOfMonth(new Date()))}
            >
              {t("calendar.today")}
            </Button>
          </>
        }
      />

      <Card>
        <div className="grid grid-cols-7 shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.08)]">
          {WEEKDAY_KEYS.map((key) => (
            <div
              key={key}
              className="px-3 py-2 text-[11px] font-mono uppercase tracking-normal text-gray-500"
            >
              {t(`calendar.weekdays.${key}`)}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {weeks.flat().map((cellDate) => {
            const cellKey = ymd(cellDate);
            const inMonth = cellDate.getMonth() === viewMonth.getMonth();
            const isToday = cellKey === todayKey;
            const sessions = sessionsByDate.get(cellKey) ?? [];
            const recovery = recoveryByDate.get(cellKey);
            const activityCount = activityCountByDate.get(cellKey) ?? 0;

            return (
              <button
                type="button"
                key={cellKey}
                onClick={() => setModalState({ kind: "create", date: cellKey })}
                className={cn(
                  "min-h-[110px] text-left px-2 py-2",
                  "shadow-[inset_-1px_-1px_0_0_rgba(0,0,0,0.06)]",
                  "transition-colors hover:bg-gray-50",
                  inMonth ? "bg-white" : "bg-gray-50/60",
                )}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[12px] tabular-nums",
                      isToday
                        ? "bg-foreground text-white"
                        : inMonth
                          ? "text-foreground"
                          : "text-gray-400",
                    )}
                  >
                    {cellDate.getDate()}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {activityCount > 0 ? (
                      <span
                        className="inline-flex h-[14px] items-center rounded-full bg-[var(--color-badge-blue-bg)] px-1.5 text-[10px] font-mono font-medium uppercase text-[var(--color-badge-blue-text)]"
                        title={t("calendar.activitiesCount", { count: activityCount })}
                      >
                        S{activityCount > 1 ? activityCount : ""}
                      </span>
                    ) : null}
                    {recovery !== undefined ? (
                      <span
                        className={cn(
                          "h-2.5 w-2.5 rounded-full",
                          recoveryToneClass(recovery ?? null),
                        )}
                        aria-label={t("calendar.recoveryAria", {
                          score: recovery ?? "?",
                        })}
                        title={
                          recovery != null
                            ? `Recovery ${recovery}%`
                            : t("calendar.noRecovery")
                        }
                      />
                    ) : null}
                  </div>
                </div>

                {sessions.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {sessions.slice(0, 3).map((s) => (
                      <li
                        key={s.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setModalState({ kind: "edit", session: s });
                        }}
                        className={cn(
                          "truncate rounded px-2 py-0.5 text-[12px] font-medium",
                          badgeClassForType(s.type),
                        )}
                      >
                        {s.title}
                      </li>
                    ))}
                    {sessions.length > 3 && (
                      <li className="px-2 text-[11px] text-gray-500">
                        +{sessions.length - 3}
                      </li>
                    )}
                  </ul>
                )}
              </button>
            );
          })}
        </div>
      </Card>

      <SessionModal
        open={modalState !== null}
        onClose={() => setModalState(null)}
        existing={modalState?.kind === "edit" ? modalState.session : null}
        date={modalState?.kind === "create" ? modalState.date : undefined}
      />
    </>
  );
}
