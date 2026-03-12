import { ApiRequestError } from "./errors.js";
import type { Settings } from "./settings.js";

export function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

export async function requestApi(
  method: string,
  endpoint: string,
  settings: Settings,
  options: {
    payload?: unknown;
    fetchImpl?: typeof fetch;
  } = {},
): Promise<unknown> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${settings.apiKey}`,
    Accept: "application/json",
  };

  if (method.toUpperCase() === "POST") {
    headers["Content-Type"] = "application/json";
  }

  let response: Response;
  try {
    response = await fetchImpl(`${normalizeBaseUrl(settings.baseUrl)}${endpoint}`, {
      method: method.toUpperCase(),
      headers,
      body: options.payload ? JSON.stringify(options.payload) : undefined,
    });
  } catch (error) {
    throw new ApiRequestError(`HTTP request failed: ${String(error)}`);
  }

  if (!response.ok) {
    const body = await response.text();
    throw new ApiRequestError(
      `HTTP request failed with status ${response.status}: ${body || response.statusText}`,
    );
  }

  return response.json();
}
