import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
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
    </form>
  );
}
