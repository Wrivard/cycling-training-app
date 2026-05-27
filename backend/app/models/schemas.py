"""Pydantic models exposed by the API.

Note: we import `date` under the alias `Date` because Pydantic's `ModelMetaclass`
pre-binds field names in the class namespace before annotations are evaluated.
A field named `date` therefore shadows `datetime.date` and breaks
`date | None`. The alias sidesteps the conflict cleanly.
"""

from datetime import date as Date  # noqa: N812 — alias to dodge field-name shadow
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

# ---------- Users ----------


class UserProfile(BaseModel):
    id: str
    email: str | None = None


# ---------- OAuth ----------

OAuthProvider = Literal["strava", "whoop"]


class OAuthConnection(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    provider: OAuthProvider
    connected: bool
    expires_at: datetime | None = None
    scope: str | None = None
    provider_user_id: str | None = None


# ---------- Routes ----------

RouteSource = Literal["drawn", "gpx"]


class RouteBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    distance_km: float = Field(..., ge=0)
    elevation_gain_m: float = Field(default=0.0, ge=0)
    geojson: dict
    source: RouteSource


class RouteCreate(RouteBase):
    pass


class Route(RouteBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    created_at: datetime


# ---------- Planned sessions ----------

SessionType = Literal["endurance", "intervals", "recovery", "rest", "race", "other"]


class PlannedSessionBase(BaseModel):
    date: Date
    type: SessionType
    title: str = Field(..., min_length=1, max_length=200)
    description: str | None = None
    target_distance_km: float | None = Field(default=None, ge=0)
    target_duration_min: int | None = Field(default=None, ge=0)
    target_tss: int | None = Field(default=None, ge=0)
    route_id: str | None = None


class PlannedSessionCreate(PlannedSessionBase):
    pass


class PlannedSessionUpdate(BaseModel):
    date: Date | None = None
    type: SessionType | None = None
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    target_distance_km: float | None = Field(default=None, ge=0)
    target_duration_min: int | None = Field(default=None, ge=0)
    target_tss: int | None = Field(default=None, ge=0)
    route_id: str | None = None
    completed_activity_id: str | None = None


class PlannedSession(PlannedSessionBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    completed_activity_id: str | None = None
    created_at: datetime
    updated_at: datetime


# ---------- Activities (Strava) ----------


class Activity(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    strava_id: int
    name: str
    type: str
    start_date: datetime
    distance_km: float
    moving_time_s: int
    elevation_gain_m: float
    average_speed_kmh: float | None = None
    average_hr: float | None = None
    max_hr: float | None = None
    polyline: str | None = None


# ---------- Whoop metrics ----------


class WhoopMetric(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    date: Date
    recovery_score: int | None = None
    hrv_ms: float | None = None
    resting_hr: float | None = None
    strain: float | None = None
    sleep_performance: float | None = None
    sleep_duration_min: int | None = None


# ---------- Sync ----------


class SyncResult(BaseModel):
    provider: OAuthProvider
    fetched: int
    upserted: int
    started_at: datetime
    finished_at: datetime


# ---------- Comparison (planned vs actual) ----------


class SessionComparison(BaseModel):
    session: PlannedSession
    activity: Activity
    delta_distance_km: float
    delta_duration_min: float
    delta_elevation_m: float
