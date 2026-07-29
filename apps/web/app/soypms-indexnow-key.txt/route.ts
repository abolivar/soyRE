import { NextResponse } from 'next/server';

const publicIndexNowKey = 'soypms-indexnow-key';

export async function GET() {
  const enabled =
    process.env.INDEXNOW_ENABLED?.trim().toLowerCase() === 'true' &&
    process.env.PUBLIC_SITE_INDEXING_ENABLED?.trim().toLowerCase() === 'true';
  const configuredKey = process.env.INDEXNOW_KEY?.trim();

  if (
    !enabled ||
    configuredKey !== publicIndexNowKey
  ) {
    return new NextResponse('Not found', { status: 404 });
  }

  return new NextResponse(publicIndexNowKey, {
    headers: {
      'Cache-Control': 'public, max-age=3600',
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Robots-Tag': 'noindex',
    },
  });
}
