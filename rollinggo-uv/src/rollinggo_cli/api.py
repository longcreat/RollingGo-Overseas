import os
from typing import Any

import httpx

from .constants import DEFAULT_BASE_URL
from .errors import ApiRequestError, CliValidationError


def normalize_base_url(base_url: str | None) -> str:
    return (base_url or DEFAULT_BASE_URL).rstrip("/")


def resolve_api_key(cli_api_key: str | None) -> str:
    if cli_api_key:
        return cli_api_key

    env_api_key = os.getenv("AIGOHOTEL_API_KEY")
    if env_api_key:
        return env_api_key

    raise CliValidationError("Missing API key. Pass --api-key or set AIGOHOTEL_API_KEY.")


def request_api(
    method: str,
    endpoint: str,
    api_key: str,
    *,
    base_url: str | None = None,
    payload: dict[str, Any] | None = None,
    transport: httpx.BaseTransport | None = None,
) -> Any:
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Accept": "application/json",
    }
    if method.upper() == "POST":
        headers["Content-Type"] = "application/json"

    try:
        with httpx.Client(
            base_url=normalize_base_url(base_url),
            timeout=30.0,
            follow_redirects=True,
            transport=transport,
        ) as client:
            response = client.request(method.upper(), endpoint, json=payload, headers=headers)
            response.raise_for_status()
            return response.json()
    except httpx.HTTPStatusError as exc:
        body = ""
        try:
            body = exc.response.text
        except Exception:
            body = ""
        message = body or str(exc)
        raise ApiRequestError(
            f"HTTP request failed with status {exc.response.status_code}: {message}"
        ) from exc
    except httpx.HTTPError as exc:
        raise ApiRequestError(f"HTTP request failed: {exc}") from exc
