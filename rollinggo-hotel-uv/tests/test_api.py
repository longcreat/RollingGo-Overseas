import asyncio

import httpx
import pytest

from rollinggo_mcp.api import request_api
from rollinggo_mcp.errors import ApiRequestError
from rollinggo_mcp.settings import Settings


def test_request_api_adds_bearer_token() -> None:
    seen_headers: dict[str, str] = {}

    async def handler(request: httpx.Request) -> httpx.Response:
        seen_headers["authorization"] = request.headers["Authorization"]
        return httpx.Response(200, json={"ok": True})

    result = asyncio.run(
        request_api(
            "GET",
            "/hoteltags",
            settings=Settings(api_key="mcp_test", base_url="https://example.com"),
            transport=httpx.MockTransport(handler),
        )
    )

    assert result == {"ok": True}
    assert seen_headers["authorization"] == "Bearer mcp_test"


def test_request_api_surfaces_http_errors() -> None:
    async def handler(_: httpx.Request) -> httpx.Response:
        return httpx.Response(401, json={"message": "unauthorized"})

    with pytest.raises(ApiRequestError, match="401"):
        asyncio.run(
            request_api(
                "GET",
                "/hoteltags",
                settings=Settings(api_key="mcp_test", base_url="https://example.com"),
                transport=httpx.MockTransport(handler),
            )
        )
