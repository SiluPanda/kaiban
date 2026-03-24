import { loadConfig } from './config';

interface ApiOptions {
  method?: string;
  body?: unknown;
  params?: Record<string, string>;
}

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const config = loadConfig();
  const { method = 'GET', body, params } = options;

  let url = `${config.apiUrl}${path}`;
  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '') {
        searchParams.set(key, value);
      }
    }
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (config.apiKey) {
    headers['Authorization'] = `Bearer ${config.apiKey}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30000),
  });

  let json: any;
  try {
    json = await res.json();
  } catch {
    throw new ApiError(res.status, 'PARSE_ERROR', `HTTP ${res.status}: non-JSON response`);
  }

  if (!res.ok) {
    const errMsg = json?.errors?.message || json?.message || `HTTP ${res.status}`;
    const errCode = json?.errors?.code || 'UNKNOWN';
    throw new ApiError(res.status, errCode, errMsg);
  }

  return json;
}
