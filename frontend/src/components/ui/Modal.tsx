import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/cn";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Disable closing on backdrop click. Escape still works. */
  staticBackdrop?: boolean;
};

/**
 * Lightweight modal — portal + backdrop + escape close. Scroll-locks the body
 * while open. Focus management is intentionally minimal: the rendering form is
 * already a controlled component and forms auto-focus their first input.
 */
export function Modal({ open, onClose, children, staticBackdrop }: ModalProps) {
  // Escape to close.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Scroll-lock body.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm px-4"
      onClick={staticBackdrop ? undefined : onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={cn(
          "w-full max-w-[480px] rounded-xl bg-white shadow-[var(--shadow-card-lift)]",
          "max-h-[90vh] overflow-auto",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
