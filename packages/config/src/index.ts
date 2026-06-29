export const REQUIRED_ENVIRONMENT_VARIABLES = [
  'APP_URL',
  'API_URL',
  'NEXT_PUBLIC_API_URL',
  'DATABASE_URL',
] as const;

export type RequiredEnvironmentVariable =
  (typeof REQUIRED_ENVIRONMENT_VARIABLES)[number];
