"""GPX parsing — extract polyline + summary metrics from a .gpx file."""

from __future__ import annotations

from dataclasses import dataclass

import gpxpy


@dataclass(slots=True)
class ParsedGpx:
    """Outcome of parsing a GPX file: the polyline plus summary metrics."""

    name: str | None
    coordinates: list[tuple[float, float]]  # [(lon, lat), ...] in GeoJSON order
    distance_km: float
    elevation_gain_m: float

    @property
    def geojson(self) -> dict:
        return {
            "type": "Feature",
            "geometry": {
                "type": "LineString",
                "coordinates": [[lon, lat] for lon, lat in self.coordinates],
            },
            "properties": {
                "distance_km": self.distance_km,
                "elevation_gain_m": self.elevation_gain_m,
            },
        }


def parse_gpx(content: bytes | str) -> ParsedGpx:
    """Parse the GPX payload and aggregate every track segment into one polyline."""
    text = content.decode("utf-8") if isinstance(content, bytes) else content
    gpx = gpxpy.parse(text)

    coordinates: list[tuple[float, float]] = []
    total_distance_m = 0.0
    total_elevation_gain_m = 0.0
    name: str | None = None

    for track in gpx.tracks:
        if name is None and track.name:
            name = track.name
        for segment in track.segments:
            for point in segment.points:
                coordinates.append((point.longitude, point.latitude))
            total_distance_m += segment.length_2d() or 0.0
            uphill, _downhill = segment.get_uphill_downhill()
            total_elevation_gain_m += uphill or 0.0

    if not coordinates:
        raise ValueError("GPX file contains no track points")

    return ParsedGpx(
        name=name or gpx.name,
        coordinates=coordinates,
        distance_km=round(total_distance_m / 1000.0, 3),
        elevation_gain_m=round(total_elevation_gain_m, 1),
    )
