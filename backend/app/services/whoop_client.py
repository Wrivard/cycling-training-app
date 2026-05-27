"""Whoop API client (OAuth + recovery/sleep/cycle).

Notes:
- v2 API only (v1 is decommissioned).
- The ``offline`` scope is REQUIRED to receive a refresh token.
- Access tokens expire in ~1h; refresh before each call if expired.
- Recovery score (0–100), RHR, HRV and SpO2 are exposed through the Cycle
  endpoints in v2.
- All collection endpoints are paginated via a ``nextToken`` cursor.
"""

from __future__ import annotations

# Implementation lands in step 4.

WHOOP_API_BASE = "https://api.prod.whoop.com/developer"
WHOOP_OAUTH_AUTHORIZE = "https://api.prod.whoop.com/oauth/oauth2/auth"
WHOOP_OAUTH_TOKEN = "https://api.prod.whoop.com/oauth/oauth2/token"
WHOOP_SCOPES = "read:recovery read:sleep read:workout read:cycles read:profile offline"
