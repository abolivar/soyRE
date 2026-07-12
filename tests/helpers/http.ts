import assert from 'node:assert/strict';

export type ApiResponse<T> = {
  body: T;
  headers: Headers;
  status: number;
  text: string;
};

export async function requestJson<T>(
  baseUrl: string,
  path: string,
  options: {
    body?: unknown;
    cookie?: string;
    headers?: Record<string, string>;
    method?: string;
  } = {},
): Promise<ApiResponse<T>> {
  const headers = new Headers(options.headers);

  if (options.body !== undefined) {
    headers.set('content-type', 'application/json');
  }

  if (options.cookie) {
    headers.set('cookie', options.cookie);
  }

  const response = await fetch(`${baseUrl}${path}`, {
    body:
      options.body === undefined ? undefined : JSON.stringify(options.body),
    headers,
    method: options.method ?? 'GET',
  });
  const text = await response.text();
  const body = text ? (JSON.parse(text) as T) : ({} as T);

  return {
    body,
    headers: response.headers,
    status: response.status,
    text,
  };
}

export function assertStatus<T>(
  response: ApiResponse<T>,
  expectedStatus: number,
) {
  assert.equal(
    response.status,
    expectedStatus,
    `Expected HTTP ${expectedStatus}, received ${response.status}: ${response.text}`,
  );
}

export function extractSessionCookie(headers: Headers) {
  const setCookie = headers.get('set-cookie');

  assert.ok(setCookie, 'Expected API response to set a session cookie.');

  const cookie = setCookie
    .split(',')
    .map((item) => item.trim())
    .find((item) => item.startsWith('soyre_session='));

  assert.ok(cookie, 'Expected soyre_session cookie.');

  return cookie.split(';')[0] ?? cookie;
}
