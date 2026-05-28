import { lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AppShell } from "@/components/AppShell";
import { AuthGuard } from "@/components/AuthGuard";
import { CalendarPage } from "@/pages/CalendarPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { LoginPage } from "@/pages/LoginPage";
import { SettingsPage } from "@/pages/SettingsPage";

// Code-split the route planner — mapbox-gl is ~600 kB gzipped and the
// other pages don't need it.
const RoutePlannerPage = lazy(() =>
  import("@/pages/RoutePlannerPage").then((m) => ({ default: m.RoutePlannerPage })),
);

function PageFallback() {
  const { t } = useTranslation();
  return (
    <div className="grid min-h-[50vh] place-items-center text-[14px] text-gray-500">
      {t("common.loading")}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          element={
            <AuthGuard>
              <AppShell />
            </AuthGuard>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route
            path="/routes"
            element={
              <Suspense fallback={<PageFallback />}>
                <RoutePlannerPage />
              </Suspense>
            }
          />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
