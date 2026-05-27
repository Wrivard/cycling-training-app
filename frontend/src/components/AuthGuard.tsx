import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "@/hooks/useAuth";

/** Redirect to /login if anonymous; pass-through if authenticated. */
export function AuthGuard({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();
  const { t } = useTranslation();

  if (status === "loading") {
    return (
      <div className="grid min-h-screen place-items-center text-[14px] text-gray-500">
        {t("common.loading")}
      </div>
    );
  }

  if (status === "anonymous") {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
