import { useTranslation } from "react-i18next";

import { cn } from "@/lib/cn";
import { SUPPORTED_LANGS, type SupportedLang } from "@/lib/i18n";

export function LanguageSwitcher({ className }: { className?: string }) {
  const { i18n } = useTranslation();
  const current = (i18n.resolvedLanguage as SupportedLang) ?? "en";

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full bg-white p-0.5 shadow-[var(--shadow-border-light)]",
        className,
      )}
      role="group"
      aria-label="Language"
    >
      {SUPPORTED_LANGS.map((lang) => {
        const active = current === lang;
        return (
          <button
            key={lang}
            type="button"
            onClick={() => void i18n.changeLanguage(lang)}
            aria-pressed={active}
            className={cn(
              "h-6 px-2.5 rounded-full text-[12px] font-medium uppercase font-mono",
              active
                ? "bg-foreground text-white"
                : "text-gray-500 hover:text-foreground",
            )}
          >
            {lang}
          </button>
        );
      })}
    </div>
  );
}
