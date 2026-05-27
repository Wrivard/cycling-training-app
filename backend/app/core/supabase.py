"""Supabase clients — one anon client and one service-role admin client."""

from __future__ import annotations

from functools import lru_cache

from supabase import Client, create_client

from app.core.config import get_settings


@lru_cache(maxsize=1)
def get_admin_client() -> Client:
    """Service-role client. Bypasses RLS — use only in trusted server contexts."""
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


@lru_cache(maxsize=1)
def get_anon_client() -> Client:
    """Anon client. Subject to RLS — pass a user JWT via postgrest_client headers if needed."""
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_anon_key)
