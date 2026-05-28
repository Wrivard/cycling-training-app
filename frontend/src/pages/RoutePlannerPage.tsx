import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useTranslation } from "react-i18next";

import { RouteMap, type RouteMapHandle, type RouteMapState } from "@/components/RouteMap";
import { RoutesList } from "@/components/RoutesList";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { useCreateRoute, useImportGpx } from "@/hooks/useRoutes";

const EMPTY_STATE: RouteMapState = {
  waypoints: [],
  geometry: null,
  distance_m: 0,
  duration_s: 0,
};

export function RoutePlannerPage() {
  const { t } = useTranslation();
  const mapRef = useRef<RouteMapHandle>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [mapState, setMapState] = useState<RouteMapState>(EMPTY_STATE);

  const createRoute = useCreateRoute();
  const importGpx = useImportGpx();

  const canSave = mapState.geometry !== null && name.trim().length > 0;

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!canSave || !mapState.geometry) return;
    try {
      await createRoute.mutateAsync({
        name: name.trim(),
        distance_km: Number((mapState.distance_m / 1000).toFixed(3)),
        // Drawn routes — Mapbox cycling Directions doesn't return elevation.
        // GPX-imported routes carry real elevation (gpxpy).
        elevation_gain_m: 0,
        geojson: mapState.geometry,
        source: "drawn",
      });
      mapRef.current?.clear();
      setName("");
    } catch {
      // surfaced via createRoute.isError
    }
  }

  function onImportClick() {
    fileRef.current?.click();
  }

  async function onFileChosen(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await importGpx.mutateAsync(file);
    } catch {
      // surfaced via importGpx.isError
    } finally {
      // Reset so the same file can be re-selected.
      e.target.value = "";
    }
  }

  return (
    <>
      <PageHeader
        title={t("routes.title")}
        subtitle={t("routes.subtitle")}
        actions={
          <>
            <input
              ref={fileRef}
              type="file"
              accept=".gpx,application/gpx+xml,text/xml"
              className="hidden"
              onChange={(e) => void onFileChosen(e)}
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={onImportClick}
              disabled={importGpx.isPending}
            >
              {importGpx.isPending ? t("common.loading") : t("routes.importGpx")}
            </Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <CardTitle>{t("routes.draw")}</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={mapState.waypoints.length === 0}
                  onClick={() => mapRef.current?.undoLastWaypoint()}
                >
                  {t("routes.undo")}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={mapState.waypoints.length === 0}
                  onClick={() => mapRef.current?.clear()}
                >
                  {t("routes.clear")}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardBody className="pt-0 space-y-3">
            <div className="h-[520px]">
              <RouteMap ref={mapRef} onStateChange={setMapState} />
            </div>

            <p className="text-[12px] text-gray-500">
              {t("routes.hint")}
            </p>

            <form
              onSubmit={(e) => void onSave(e)}
              className="flex flex-col gap-3 md:flex-row md:items-center"
            >
              <Input
                placeholder={t("routes.namePlaceholder")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={200}
                className="md:flex-1"
              />
              <div className="flex items-center gap-3">
                <span className="font-mono text-[13px] tabular-nums text-gray-600">
                  {(mapState.distance_m / 1000).toFixed(1)} km
                </span>
                <Button type="submit" disabled={!canSave || createRoute.isPending}>
                  {createRoute.isPending ? t("common.loading") : t("routes.saveRoute")}
                </Button>
              </div>
            </form>

            {(createRoute.isError || importGpx.isError) && (
              <p className="text-[13px] text-[var(--color-rec-bad)]" role="alert">
                {t("routes.saveError")}
              </p>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("routes.savedRoutes")}</CardTitle>
          </CardHeader>
          <CardBody className="pt-0">
            <RoutesList />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
