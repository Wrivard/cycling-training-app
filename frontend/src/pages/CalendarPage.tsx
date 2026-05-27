import { useTranslation } from "react-i18next";

import { Card, CardBody } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";

export function CalendarPage() {
  const { t } = useTranslation();
  return (
    <>
      <PageHeader title={t("calendar.title")} subtitle={t("calendar.subtitle")} />
      <Card>
        <CardBody>
          <p className="text-[14px] text-gray-500">{t("common.comingSoon")}</p>
        </CardBody>
      </Card>
    </>
  );
}
