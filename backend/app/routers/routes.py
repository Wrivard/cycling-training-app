"""Routes (drawn or GPX-imported)."""

from __future__ import annotations

import asyncio

from fastapi import APIRouter, HTTPException, Response, UploadFile, status

from app.core.security import CurrentUser
from app.models.schemas import Route, RouteCreate
from app.services import routes_repo
from app.services.gpx_parser import parse_gpx

router = APIRouter()

# Hard cap on a GPX upload (bytes). 10 MB is plenty for several-hundred-km
# tracks even at high sample rates.
MAX_GPX_UPLOAD_BYTES = 10 * 1024 * 1024


@router.get("", response_model=list[Route])
async def list_routes(user: CurrentUser) -> list[Route]:
    rows = await asyncio.to_thread(routes_repo.list_for_user, user.id)
    return [Route.model_validate(row) for row in rows]


@router.post("", response_model=Route, status_code=status.HTTP_201_CREATED)
async def create_route(payload: RouteCreate, user: CurrentUser) -> Route:
    body = payload.model_dump(mode="json")
    row = await asyncio.to_thread(routes_repo.create, user.id, body)
    return Route.model_validate(row)


@router.post("/import-gpx", response_model=Route, status_code=status.HTTP_201_CREATED)
async def import_gpx(file: UploadFile, user: CurrentUser) -> Route:
    """Parse a `.gpx` file with gpxpy and persist the extracted polyline."""
    if file.size is not None and file.size > MAX_GPX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="gpx_too_large",
        )

    content = await file.read()
    if len(content) > MAX_GPX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="gpx_too_large",
        )

    try:
        parsed = await asyncio.to_thread(parse_gpx, content)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover — gpxpy raises a variety of XML errors
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="gpx_parse_error",
        ) from exc

    name = parsed.name or (file.filename.rsplit(".", 1)[0] if file.filename else "Imported route")
    body = {
        "name": name,
        "distance_km": parsed.distance_km,
        "elevation_gain_m": parsed.elevation_gain_m,
        "geojson": parsed.geojson,
        "source": "gpx",
    }
    row = await asyncio.to_thread(routes_repo.create, user.id, body)
    return Route.model_validate(row)


@router.delete("/{route_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_route(route_id: str, user: CurrentUser) -> Response:
    await asyncio.to_thread(routes_repo.delete, user.id, route_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
