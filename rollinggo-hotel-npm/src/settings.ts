import { DEFAULT_BASE_URL } from "./constants.js";
import { ConfigurationError } from "./errors.js";

export interface Settings {
  apiKey: string;
  baseUrl: string;
}

function clean(value?: string): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

export function loadSettings(
  env: Record<string, string | undefined> = process.env,
): Settings {
  const apiKey = clean(env.ROLLINGGO_API_KEY) ?? clean(env.AIGOHOTEL_API_KEY);
  if (!apiKey) {
    throw new ConfigurationError(
      "Missing API key. Set ROLLINGGO_API_KEY or AIGOHOTEL_API_KEY.",
    );
  }

  const baseUrl = (clean(env.ROLLINGGO_BASE_URL) ?? DEFAULT_BASE_URL).replace(
    /\/+$/,
    "",
  );

  return {
    apiKey,
    baseUrl,
  };
}
