import { pathToFileURL } from 'node:url';

const publicRoutes = [
  '/',
  '/producto',
  '/mandatos-y-expedientes',
  '/comisiones-inmobiliarias',
  '/crm-inmobiliario-vs-soypms',
];
const publicIndexNowKey = 'soypms-indexnow-key';

export function resolveIndexNowConfig(environment = process.env) {
  const enabled =
    environment.INDEXNOW_ENABLED?.trim().toLowerCase() === 'true' &&
    environment.PUBLIC_SITE_INDEXING_ENABLED?.trim().toLowerCase() === 'true' &&
    environment.PUBLIC_SITE_CUSTOM_DOMAIN_ENABLED?.trim().toLowerCase() ===
      'true';
  const key = environment.INDEXNOW_KEY?.trim();
  const siteUrl = environment.NEXT_PUBLIC_SITE_URL?.trim();

  if (!enabled) {
    throw new Error(
      'IndexNow is gated. Enable domain, indexing and IndexNow only after the release checklist passes.',
    );
  }

  if (key !== publicIndexNowKey) {
    throw new Error(`INDEXNOW_KEY must be ${publicIndexNowKey}.`);
  }

  const url = new URL(siteUrl ?? '');
  if (url.origin !== 'https://soypms.com') {
    throw new Error('NEXT_PUBLIC_SITE_URL must be https://soypms.com.');
  }

  return { key, siteUrl: url.origin };
}

export function buildIndexNowPayload(config) {
  return {
    host: new URL(config.siteUrl).hostname,
    key: config.key,
    keyLocation: `${config.siteUrl}/${config.key}.txt`,
    urlList: publicRoutes.map((pathname) =>
      new URL(pathname, config.siteUrl).toString(),
    ),
  };
}

export async function submitIndexNow(
  environment = process.env,
  fetchImplementation = fetch,
) {
  const payload = buildIndexNowPayload(resolveIndexNowConfig(environment));
  const response = await fetchImplementation('https://api.indexnow.org/indexnow', {
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error(`IndexNow returned HTTP ${response.status}.`);
  }

  return { status: response.status, submitted: payload.urlList.length };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const result = await submitIndexNow();
  console.log(
    `IndexNow accepted ${result.submitted} public URLs (HTTP ${result.status}).`,
  );
}
