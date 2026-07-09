export type ApiError = {
  status: number;
  code: string;
  message: string;
  details?: unknown;
};

const REFRESH_URL = '/api/v1/auth/refresh';

let inFlightRefresh: Promise<boolean> | null = null;

const runRefresh = async (): Promise<boolean> => {
  if (inFlightRefresh !== null) return inFlightRefresh;
  inFlightRefresh = fetch(REFRESH_URL, {
    method: 'POST',
    credentials: 'include',
  })
    .then((res) => res.ok)
    .catch(() => false)
    .finally(() => {
      inFlightRefresh = null;
    });
  return inFlightRefresh;
};

const parseError = async (res: Response): Promise<ApiError> => {
  let body: { error?: { code?: string; message?: string; details?: unknown } } = {};
  try {
    body = (await res.json()) as typeof body;
  } catch {
    // ignore
  }
  return {
    status: res.status,
    code: body.error?.code ?? 'HTTP_ERROR',
    message: body.error?.message ?? res.statusText,
    details: body.error?.details,
  };
};

export type ApiFetchOptions = RequestInit & { retryOnUnauthorized?: boolean };

export const apiFetch = async <T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> => {
  const { retryOnUnauthorized = true, ...init } = options;
  const headers = new Headers(init.headers);
  if (init.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const res = await fetch(path, {
    ...init,
    headers,
    credentials: 'include',
  });

  if (res.status === 401 && retryOnUnauthorized && path !== REFRESH_URL) {
    const refreshed = await runRefresh();
    if (refreshed) {
      return apiFetch<T>(path, { ...options, retryOnUnauthorized: false });
    }
  }

  if (!res.ok) {
    throw await parseError(res);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
};

export const isApiError = (v: unknown): v is ApiError =>
  typeof v === 'object' && v !== null && 'status' in v && 'code' in v;
