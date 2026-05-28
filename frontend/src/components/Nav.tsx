import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";

import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { UserMenu } from "@/components/UserMenu";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/cn";

function navLinkClass(isActive: boolean) {
  return cn(
    "text-[14px] font-medium tracking-normal transition-colors",
    isActive ? "text-foreground" : "text-gray-500 hover:text-foreground",
  );
}

export function Nav() {
  const { t } = useTranslation();
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.08)]">
      <nav className="mx-auto flex h-14 max-w-[1200px] items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <NavLink
            to="/"
            className="font-mono text-[13px] font-medium uppercase tracking-normal text-foreground"
          >
            {t("app.name")}
          </NavLink>
          <ul className="hidden items-center gap-6 md:flex">
            <li>
              <NavLink to="/" end className={({ isActive }) => navLinkClass(isActive)}>
                {t("nav.dashboard")}
              </NavLink>
            </li>
            <li>
              <NavLink to="/calendar" className={({ isActive }) => navLinkClass(isActive)}>
                {t("nav.calendar")}
              </NavLink>
            </li>
            <li>
              <NavLink to="/routes" className={({ isActive }) => navLinkClass(isActive)}>
                {t("nav.routes")}
              </NavLink>
            </li>
            <li>
              <NavLink to="/settings" className={({ isActive }) => navLinkClass(isActive)}>
                {t("nav.settings")}
              </NavLink>
            </li>
          </ul>
        </div>

        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          {user ? <UserMenu /> : null}
        </div>
      </nav>
    </header>
  );
}
