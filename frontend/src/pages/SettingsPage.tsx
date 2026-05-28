import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";

type Connection = {
  key: "strava" | "whoop";
  label: string;
  connected: boolean;
};

export function SettingsPage() {
  const { t } = useTranslation();

  // The real connection status comes from the backend (`/api/oauth/.../status`)
  // in step 3. For now we render the disconnected shape.
  const connections: Connection[] = [
    { key: "strava", label: t("settings.strava"), connected: false },
    { key: "whoop", label: t("settings.whoop"), connected: false },
  ];

  return (
    <>
      <PageHeader title={t("settings.title")} subtitle={t("settings.subtitle")} />

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.connections")}</CardTitle>
        </CardHeader>
        <CardBody className="pt-0">
          <ul className="divide-y divide-gray-100">
            {connections.map((conn) => (
              <li key={conn.key} className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <span className="text-[15px] font-medium text-foreground">{conn.label}</span>
                  <Badge tone={conn.connected ? "good" : "neutral"}>
                    {conn.connected ? t("settings.statusConnected") : t("settings.statusDisconnected")}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  {conn.connected ? (
                    <>
                      <Button variant="secondary" size="sm">
                        {t("settings.syncNow")}
                      </Button>
                      <Button variant="danger" size="sm">
                        {t("settings.disconnect")}
                      </Button>
                    </>
                  ) : (
                    <Button size="sm">{t("settings.connect")}</Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </>
  );
}
