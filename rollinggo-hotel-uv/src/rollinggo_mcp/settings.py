from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache
from typing import Mapping

from dotenv import load_dotenv

from .constants import DEFAULT_BASE_URL
from .errors import ConfigurationError

load_dotenv()


@dataclass(frozen=True)
class Settings:
    api_key: str
    base_url: str = DEFAULT_BASE_URL


def _clean(value: str | None) -> str | None:
    if value is None:
        return None
    stripped = value.strip()
    return stripped or None


def load_settings(env: Mapping[str, str] | None = None) -> Settings:
    source = os.environ if env is None else env
    api_key = _clean(source.get("ROLLINGGO_API_KEY")) or _clean(source.get("AIGOHOTEL_API_KEY"))
    if not api_key:
        raise ConfigurationError("Missing API key. Set ROLLINGGO_API_KEY or AIGOHOTEL_API_KEY.")

    base_url = (_clean(source.get("ROLLINGGO_BASE_URL")) or DEFAULT_BASE_URL).rstrip("/")
    return Settings(api_key=api_key, base_url=base_url)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return load_settings()
