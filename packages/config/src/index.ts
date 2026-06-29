export const REQUIRED_ENVIRONMENT_VARIABLES = [
  'APP_URL',
  'API_URL',
  'NEXT_PUBLIC_API_URL',
] as const;

export type RequiredEnvironmentVariable =
  (typeof REQUIRED_ENVIRONMENT_VARIABLES)[number];

export const RUNTIME_DATABASE_ENVIRONMENT_VARIABLES = [
  'DATABASE_URL',
  'DIRECT_URL',
] as const;

export type RuntimeDatabaseEnvironmentVariable =
  (typeof RUNTIME_DATABASE_ENVIRONMENT_VARIABLES)[number];
