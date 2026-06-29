export const AUTH_COOKIE_NAME = 'soyre_session';

export const ACCESS_TOKEN_EXPIRES_IN = '1d';

export function getJwtAccessSecret() {
  const secret = process.env.JWT_ACCESS_SECRET;

  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_ACCESS_SECRET is required in production.');
  }

  return 'development-only-change-me';
}
