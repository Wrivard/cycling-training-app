import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";

export function RoutePlannerPage() {
  const { t } = useTranslation();
  return (
    <>
      <PageHeader
        title={t("routes.title")}
        subtitle={t("routes.subtitle")}
        actions={
          <>
            <Button variant="secondary">{t("routes.importGpx")}</Button>
            <Button>{t("routes.newRoute")}</Button>
          </>
        }
      />
      <Card>
        <CardBody>
          <p className="text-[14px] text-gray-500">{t("common.comingSoon")}</p>
        </CardBody>
      </Card>
    </>
  );
}
