import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { useAuth } from "@/hooks/useAuth";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { cn } from "@/lib/cn";

export function UserMenu() {
  const { t } = useTranslation();
  const { signOut, user } = useAuth();
  const { data } = useCurrentUser();

  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (wrapRef.current.contains(e.target as Node)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const email = data?.email ?? user?.email ?? null;
  const name = data?.display_name?.trim() || email || "…";
  const initial = (name[0] || "?").toUpperCase();

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={name}
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-full bg-foreground text-[12px]",
          "font-medium text-white shadow-[var(--shadow-border-light)]",
          "transition-opacity hover:opacity-90",
        )}
      >
        {initial}
      </button>

      {open ? (
        <div
          role="menu"
          className={cn(
            "absolute right-0 mt-2 w-60 rounded-lg bg-white p-1",
            "shadow-[var(--shadow-card-lift)] z-40",
          )}
        >
          <div className="px-3 py-2 shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.06)]">
            <p className="truncate text-[13px] font-medium text-foreground">{name}</p>
            {email && email !== name ? (
              <p className="mt-0.5 truncate text-[12px] text-gray-500">{email}</p>
            ) : null}
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              void signOut();
            }}
            className="block w-full rounded px-3 py-2 text-left text-[13px] text-foreground hover:bg-gray-50"
          >
            {t("nav.signOut")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
