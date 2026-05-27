"""Routes (drawn or GPX-imported)."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, UploadFile, status

from app.core.security import CurrentUser
from app.models.schemas import Route, RouteCreate

router = APIRouter()


@router.get("", response_model=list[Route])
async def list_routes(user: CurrentUser) -> list[Route]:
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="List routes — implemented in step 6",
    )


@router.post("", response_model=Route, status_code=status.HTTP_201_CREATED)
async def create_route(payload: RouteCreate, user: CurrentUser) -> Route:
    """Persist a hand-drawn route (geojson already snapped via Mapbox Directions client-side)."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Create route — implemented in step 6",
    )


@router.post("/import-gpx", response_model=Route, status_code=status.HTTP_201_CREATED)
async def import_gpx(file: UploadFile, user: CurrentUser) -> Route:
    """Parse a `.gpx` file with gpxpy and persist the extracted polyline."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="GPX import — implemented in step 6",
    )


@router.delete("/{route_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_route(route_id: str, user: CurrentUser) -> None:
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Delete route — implemented in step 6",
    )
