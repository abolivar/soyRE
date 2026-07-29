const fallbackSiteUrl = 'https://soypms-alpha.vercel.app';

export const publicSiteName = 'SoyPMS';
export const publicSiteDescription =
  'Software de operación inmobiliaria para agencias y equipos en Latinoamérica.';

type PublicSiteEnvironment = {
  [key: string]: string | undefined;
  NEXT_PUBLIC_SITE_URL?: string;
  PUBLIC_SITE_INDEXING_ENABLED?: string;
};

export type PublicSiteConfig = {
  indexingEnabled: boolean;
  url: URL;
};

export function resolvePublicSiteConfig(
  environment: PublicSiteEnvironment = process.env,
): PublicSiteConfig {
  return {
    indexingEnabled:
      environment.PUBLIC_SITE_INDEXING_ENABLED?.trim().toLowerCase() === 'true',
    url: normalizePublicSiteUrl(environment.NEXT_PUBLIC_SITE_URL),
  };
}

export function absolutePublicUrl(pathname = '/') {
  return new URL(pathname, resolvePublicSiteConfig().url).toString();
}

function normalizePublicSiteUrl(value?: string) {
  const candidate = value?.trim() || fallbackSiteUrl;

  try {
    const url = new URL(candidate);

    if (url.protocol !== 'https:' && url.hostname !== 'localhost') {
      return new URL(fallbackSiteUrl);
    }

    url.pathname = '/';
    url.search = '';
    url.hash = '';

    return url;
  } catch {
    return new URL(fallbackSiteUrl);
  }
}
