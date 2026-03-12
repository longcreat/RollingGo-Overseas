from __future__ import annotations

from typing import Any

import httpx

from .errors import ApiRequestError
from .settings import Settings, get_settings


async def request_api(
    method: str,
    endpoint: str,
    *,
    payload: dict[str, Any] | None = None,
    settings: Settings | None = None,
    transport: httpx.AsyncBaseTransport | None = None,
) -> Any:
    active_settings = settings or get_settings()
    headers = {
        "Authorization": f"Bearer {active_settings.api_key}",
        "Accept": "application/json",
    }
    if method.upper() == "POST":
        headers["Content-Type"] = "application/json"

    try:
        async with httpx.AsyncClient(
            base_url=active_settings.base_url,
            timeout=30.0,
            follow_redirects=True,
            transport=transport,
        ) as client:
            response = await client.request(method.upper(), endpoint, json=payload, headers=headers)
            response.raise_for_status()
            return response.json()
    except httpx.HTTPStatusError as exc:
        body = ""
        try:
            body = exc.response.text
        except Exception:
            body = ""
        raise ApiRequestError(
            f"HTTP request failed with status {exc.response.status_code}: {body or str(exc)}"
        ) from exc
    except httpx.HTTPError as exc:
        raise ApiRequestError(f"HTTP request failed: {exc}") from exc
