export const BASE_URL =
  (import.meta as any).env?.VITE_API_BASE_URL ||
  // "http://localhost:5000" ||
  "https://localhost:7085";

export function getToken(): string | null {
  return (
    localStorage.getItem("accessToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("jwt") ||
    null
  );
}

export function authHeader(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function extractFileNameFromDisposition(
  disposition: string | null,
): string | null {
  if (!disposition) return null;
  const utfMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utfMatch?.[1]) {
    try {
      return decodeURIComponent(utfMatch[1]);
    } catch {
      return utfMatch[1];
    }
  }
  const match = disposition.match(/filename=\"?([^\";]+)\"?/i);
  return match?.[1] ?? null;
}

export async function fetchOrThrow(input: RequestInfo, init?: RequestInit) {
  const resp = await fetch(input, init);
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(text || `HTTP ${resp.status}`);
  }
  return resp;
}

export function buildHeaders(
  extra?: Record<string, string>,
): Record<string, string> {
  const token = getToken();
  const headers: Record<string, string> = { ...(extra || {}) };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

function normalizeErrorValue(value: unknown): string | null {
  if (value == null) return null;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;

    if (
      (trimmed.startsWith("[") && trimmed.endsWith("]")) ||
      (trimmed.startsWith("{") && trimmed.endsWith("}"))
    ) {
      try {
        const parsed = JSON.parse(trimmed);
        const normalized = normalizeErrorValue(parsed);
        if (normalized) return normalized;
      } catch {
        // Keep the original string when it is not valid JSON.
      }
    }

    return trimmed;
  }

  if (Array.isArray(value)) {
    const parts = value
      .map((item) => normalizeErrorValue(item))
      .filter((item): item is string => Boolean(item));
    if (!parts.length) return null;
    return [...new Set(parts)].join(" ");
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const directMessage =
      normalizeErrorValue(record.responseMessage) ??
      normalizeErrorValue(record.ResponseMessage) ??
      normalizeErrorValue(record.errorMessage) ??
      normalizeErrorValue(record.ErrorMessage) ??
      normalizeErrorValue(record.message) ??
      normalizeErrorValue(record.Message) ??
      normalizeErrorValue(record.error) ??
      normalizeErrorValue(record.Error);

    if (directMessage) return directMessage;

    if (record.errors && typeof record.errors === "object") {
      const nestedErrors = Object.entries(
        record.errors as Record<string, unknown>,
      )
        .map(([key, val]) => {
          const normalized = normalizeErrorValue(val);
          if (!normalized) return null;
          return /^\d+$/.test(key) ? normalized : `${key}: ${normalized}`;
        })
        .filter((item): item is string => Boolean(item));

      if (nestedErrors.length) return nestedErrors.join(" ");
    }

    const title =
      normalizeErrorValue(record.title) ?? normalizeErrorValue(record.detail);
    if (title) return title;

    const values = Object.values(record)
      .map((item) => normalizeErrorValue(item))
      .filter((item): item is string => Boolean(item));

    if (values.length) return [...new Set(values)].join(" ");
  }

  return String(value).trim() || null;
}

export async function parseError(resp: Response): Promise<string> {
  try {
    const ct = resp.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const j = await resp.json();
      return normalizeErrorValue(j) ?? `HTTP ${resp.status} ${resp.statusText}`;
    }

    const text = await resp.text();
    return (
      normalizeErrorValue(text) ?? `HTTP ${resp.status} ${resp.statusText}`
    );
  } catch {
    return `HTTP ${resp.status} ${resp.statusText}`;
  }
}

export async function apiJson<T>(
  path: string,
  init?: RequestInit & { json?: any },
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const headers: Record<string, string> = buildHeaders({
    "Content-Type": "application/json",
    ...((init?.headers as Record<string, string>) || {}),
  });

  const resp = await fetch(url, {
    ...init,
    headers,
    body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
  });

  if (!resp.ok) {
    const errorText = await parseError(resp);
    throw new Error(errorText);
  }

  if (resp.status === 204) return null as T;

  const ct = resp.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    return (await resp.text()) as unknown as T;
  }

  return (await resp.json()) as T;
}

export function unwrapApiResult<T = any>(resp: any): T {
  if (resp == null || typeof resp !== "object") return resp as T;
  if (resp.data !== undefined) return resp.data as T;
  if (resp.Data !== undefined) return resp.Data as T;
  return resp as T;
}

export async function apiForm<T>(
  path: string,
  form: FormData,
  init?: RequestInit,
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const resp = await fetch(url, {
    method: "POST",
    ...init,
    headers: buildHeaders(init?.headers as Record<string, string>),
    body: form,
  });

  if (!resp.ok) throw new Error(await parseError(resp));

  const ct = resp.headers.get("content-type") || "";
  if (ct.includes("application/json")) return (await resp.json()) as T;
  return (await resp.text()) as unknown as T;
}

export function toArray<T = any>(resp: any): T[] {
  if (Array.isArray(resp)) return resp;
  if (!resp || typeof resp !== "object") return [];

  const candidates = [
    "items",
    "data",
    "result",
    "results",
    "value",
    "values",
    "records",
    "entities",
    "content",
    "list",
  ];

  const seen = new Set<any>();
  const queue: any[] = [resp];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || typeof current !== "object" || seen.has(current)) {
      continue;
    }
    seen.add(current);

    if (Array.isArray(current)) return current as T[];

    for (const key of candidates) {
      const val = (current as any)[key];
      if (Array.isArray(val)) return val as T[];
      if (val && typeof val === "object") queue.push(val);
    }

    for (const key of Object.keys(current as Record<string, unknown>)) {
      const val = (current as any)[key];
      if (Array.isArray(val)) return val as T[];
      if (val && typeof val === "object") queue.push(val);
    }
  }

  return [];
}

export async function apiJsonWithFallback<T>(
  attempts: Array<{
    path: string;
    init?: RequestInit & { json?: any };
  }>,
): Promise<T> {
  let lastError: unknown = null;
  for (const attempt of attempts) {
    try {
      return await apiJson<T>(attempt.path, attempt.init);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error("Request failed");
}

export function ensureHHMMSS(v: string): string {
  const s = (v || "").trim();
  if (!s) return "00:00:00";
  const parts = s.split(":");
  const hh = (parts[0] || "0").padStart(2, "0");
  const mm = (parts[1] || "0").padStart(2, "0");
  const ss = (parts[2] || "0").padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}
