const TOKEN_KEY = 'rs.token';

/** Thrown for any non-2xx response, carrying the API's structured error. */
export class ApiError extends Error {
  constructor(status, payload) {
    const error = payload?.error ?? {};
    super(error.message || `Request failed with status ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.code = error.code ?? 'unknown';
    this.details = error.details ?? null;
  }

  /** Field-keyed messages a form can render next to the right input. */
  get fieldErrors() {
    if (!this.details || Array.isArray(this.details)) return {};
    return Object.fromEntries(
      Object.entries(this.details)
        .filter(([, messages]) => Array.isArray(messages))
        .map(([field, messages]) => [field, messages[0]])
    );
  }
}

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

/** Listeners fire when the server rejects our token, so the app can sign out. */
const unauthorizedListeners = new Set();
export function onUnauthorized(listener) {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
}

function buildUrl(path, query) {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    params.set(key, String(value));
  }
  const search = params.toString();
  return search ? `${path}?${search}` : path;
}

async function request(method, path, { body, query, signal, raw = false, headers = {} } = {}) {
  const token = tokenStore.get();

  const response = await fetch(buildUrl(path, query), {
    method,
    signal,
    headers: {
      ...(body !== undefined && !raw ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : raw ? body : JSON.stringify(body),
  });

  if (response.status === 401 && token) {
    tokenStore.clear();
    for (const listener of unauthorizedListeners) listener();
  }

  if (response.status === 204) return null;

  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { error: { code: 'bad_response', message: text.slice(0, 200) } };
    }
  }

  if (!response.ok) throw new ApiError(response.status, payload);
  return payload;
}

export const api = {
  get: (path, options) => request('GET', path, options),
  post: (path, body, options) => request('POST', path, { body, ...options }),
  patch: (path, body, options) => request('PATCH', path, { body, ...options }),
  put: (path, body, options) => request('PUT', path, { body, ...options }),
  del: (path, options) => request('DELETE', path, options),

  /** Downloads a file response and hands back a blob plus its filename. */
  async download(path, query) {
    const token = tokenStore.get();
    const response = await fetch(buildUrl(path, query), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) throw new ApiError(response.status, await response.json().catch(() => null));

    const disposition = response.headers.get('content-disposition') ?? '';
    const match = /filename="([^"]+)"/.exec(disposition);
    return { blob: await response.blob(), filename: match?.[1] ?? 'download.csv' };
  },
};
