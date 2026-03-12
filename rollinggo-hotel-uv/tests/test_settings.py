import pytest

from rollinggo_mcp.constants import DEFAULT_BASE_URL
from rollinggo_mcp.errors import ConfigurationError
from rollinggo_mcp.settings import load_settings


def test_load_settings_prefers_rollinggo_key() -> None:
    settings = load_settings(
        {
            "ROLLINGGO_API_KEY": "mcp_primary",
            "AIGOHOTEL_API_KEY": "mcp_fallback",
            "ROLLINGGO_BASE_URL": "https://example.com///",
        }
    )

    assert settings.api_key == "mcp_primary"
    assert settings.base_url == "https://example.com"


def test_load_settings_falls_back_to_aigohotel_key() -> None:
    settings = load_settings({"AIGOHOTEL_API_KEY": "mcp_fallback"})
    assert settings.api_key == "mcp_fallback"
    assert settings.base_url == DEFAULT_BASE_URL


def test_load_settings_requires_api_key() -> None:
    with pytest.raises(ConfigurationError, match="Missing API key"):
        load_settings({})
