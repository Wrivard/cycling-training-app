import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useDeleteRoute, useRoutes, type SavedRoute } from "@/hooks/useRoutes";

export function RoutesList() {
  const { t } = useTranslation();
  const routes = useRoutes();
  const deleteRoute = useDeleteRoute();

  if (routes.isLoading) {
    return <p className="text-[14px] text-gray-500">{t("common.loading")}</p>;
  }

  const items = routes.data ?? [];
  if (items.length === 0) {
    return <p className="text-[14px] text-gray-500">{t("routes.emptyList")}</p>;
  }

  return (
    <ul className="divide-y divide-gray-100">
      {items.map((route) => (
        <RouteRow
          key={route.id}
          route={route}
          onDelete={() => {
            if (window.confirm(t("routes.confirmDelete", { name: route.name }))) {
              deleteRoute.mutate(route.id);
            }
          }}
          isDeleting={
            deleteRoute.isPending && deleteRoute.variables === route.id
          }
        />
      ))}
    </ul>
  );
}

function RouteRow({
  route,
  onDelete,
  isDeleting,
}: {
  route: SavedRoute;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const { t } = useTranslation();
  return (
    <li className="py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-[14px] font-medium text-foreground">{route.name}</div>
          <div className="mt-1 flex items-center gap-2 text-[12px] text-gray-500">
            <Badge tone={route.source === "drawn" ? "blue" : "endurance"}>
              {t(`routes.source.${route.source}`)}
            </Badge>
            <span>
              {route.distance_km.toFixed(1)} km
              {route.elevation_gain_m > 0
                ? ` · +${Math.round(route.elevation_gain_m)} m`
                : ""}
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          disabled={isDeleting}
          onClick={onDelete}
        >
          {isDeleting ? t("common.loading") : t("common.delete")}
        </Button>
      </div>
    </li>
  );
}
