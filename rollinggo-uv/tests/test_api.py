import httpx
import pytest

from rollinggo_cli.api import request_api, resolve_api_key
from rollinggo_cli.errors import ApiRequestError, CliValidationError


def test_resolve_api_key_prefers_cli_arg(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AIGOHOTEL_API_KEY", "env-key")
    assert resolve_api_key("cli-key") == "cli-key"


def test_resolve_api_key_raises_when_missing(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("AIGOHOTEL_API_KEY", raising=False)
    with pytest.raises(CliValidationError):
        resolve_api_key(None)


def test_request_api_uses_expected_http_shape() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.method == "POST"
        assert str(request.url) == "https://example.com/hotelsearch"
        assert request.headers["Authorization"] == "Bearer cli-key"
        assert request.headers["Content-Type"] == "application/json"
        assert request.read() == b'{"place":"Tokyo"}'
        return httpx.Response(
            200,
            json={"items": [{"hotelId": 1, "bookingUrl": "secret"}]},
        )

    response = request_api(
        "POST",
        "/hotelsearch",
        "cli-key",
        base_url="https://example.com/",
        payload={"place": "Tokyo"},
        transport=httpx.MockTransport(handler),
    )

    assert response == {"items": [{"hotelId": 1, "bookingUrl": "secret"}]}


def test_request_api_wraps_http_errors() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(500, text="server down")

    with pytest.raises(ApiRequestError, match="status 500"):
        request_api(
            "GET",
            "/hoteltags",
            "cli-key",
            base_url="https://example.com",
            transport=httpx.MockTransport(handler),
        )
