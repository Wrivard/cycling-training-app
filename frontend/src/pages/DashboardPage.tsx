import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";

export function DashboardPage() {
  const { t } = useTranslation();

  return (
    <>
      <PageHeader title={t("dashboard.title")} subtitle={t("dashboard.subtitle")} />

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.sectionUpcoming")}</CardTitle>
          </CardHeader>
          <CardBody className="pt-0">
            <p className="text-[14px] text-gray-500">{t("common.comingSoon")}</p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.sectionRecovery")}</CardTitle>
          </CardHeader>
          <CardBody className="pt-0 flex items-center gap-3">
            <span
              aria-hidden
              className="h-3 w-3 rounded-full bg-gray-100"
            />
            <span className="text-[14px] text-gray-500">{t("common.comingSoon")}</span>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.sectionLoad")}</CardTitle>
          </CardHeader>
          <CardBody className="pt-0">
            <p className="text-[14px] text-gray-500">{t("common.comingSoon")}</p>
          </CardBody>
        </Card>

        <Card className="md:col-span-2 xl:col-span-3">
          <CardHeader>
            <CardTitle>{t("dashboard.sectionRecent")}</CardTitle>
          </CardHeader>
          <CardBody className="pt-0 flex items-center gap-2">
            <Badge tone="blue">Strava</Badge>
            <span className="text-[14px] text-gray-500">{t("common.comingSoon")}</span>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
