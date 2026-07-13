import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import {
  AUTH_SESSION_COOKIE,
  buildLoginRedirectUrl,
  isProtectedAppPath,
} from './lib/auth-routing';
import { updateSession } from './utils/supabase/middleware';

export async function proxy(request: NextRequest) {
  if (isProtectedAppPath(request.nextUrl.pathname)) {
    const loginRedirectUrl = buildLoginRedirectUrl(request.nextUrl);

    if (!request.cookies.has(AUTH_SESSION_COOKIE)) {
      return NextResponse.redirect(loginRedirectUrl);
    }

    if (!(await hasValidSoypmsSession(request))) {
      const response = NextResponse.redirect(loginRedirectUrl);
      response.cookies.delete(AUTH_SESSION_COOKIE);

      return response;
    }
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|brands|fonts|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)',
  ],
};

async function hasValidSoypmsSession(request: NextRequest) {
  const authUrl = resolveAuthValidationUrl(request);

  if (!authUrl) {
    return false;
  }

  try {
    const response = await fetch(authUrl, {
      cache: 'no-store',
      headers: {
        cookie: request.headers.get('cookie') ?? '',
      },
    });

    return response.ok;
  } catch {
    return false;
  }
}

function resolveAuthValidationUrl(request: NextRequest) {
  const apiProxyUrl = process.env.API_PROXY_URL?.trim().replace(/\/$/, '');

  if (apiProxyUrl) {
    return `${apiProxyUrl}/api/auth/me`;
  }

  const publicApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/$/, '');

  if (publicApiUrl && publicApiUrl !== request.nextUrl.origin) {
    return `${publicApiUrl}/api/auth/me`;
  }

  if (process.env.NODE_ENV !== 'production') {
    return 'http://localhost:4000/api/auth/me';
  }

  return null;
}
