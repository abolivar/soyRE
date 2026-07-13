export const AUTH_SESSION_COOKIE = 'soyre_session';

const AUTHENTICATED_PATH_PREFIXES = [
  '/agents',
  '/audit',
  '/businesses',
  '/clients',
  '/commissions',
  '/dashboard',
  '/documents',
  '/listings',
  '/mandates',
  '/offers',
  '/pipeline',
  '/platform',
  '/properties',
  '/receivables',
  '/reports',
  '/settings',
  '/settlements',
  '/showings',
  '/tasks',
  '/users',
] as const;

export function isProtectedAppPath(pathname: string) {
  return AUTHENTICATED_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function buildLoginRedirectUrl(requestUrl: URL) {
  const loginUrl = new URL('/login', requestUrl);
  const nextPath = `${requestUrl.pathname}${requestUrl.search}`;

  loginUrl.searchParams.set('next', nextPath);

  return loginUrl;
}

export function resolveLoginRedirectTarget(
  rawNext: string | string[] | null | undefined,
  fallback = '/dashboard',
) {
  const next = Array.isArray(rawNext) ? rawNext[0] : rawNext;

  if (!next || !next.startsWith('/') || next.startsWith('//')) {
    return fallback;
  }

  if (next === '/login' || next.startsWith('/login?')) {
    return fallback;
  }

  return next;
}
