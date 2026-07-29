'use client';

import { Button } from '@soyre/ui';
import { usePathname } from 'next/navigation';
import { useReportWebVitals } from 'next/web-vitals';
import { useCallback, useEffect, useState } from 'react';
import {
  isPublicAnalyticsEvent,
  isValidGaMeasurementId,
  onPublicAnalyticsConsentChanged,
  type PublicAnalyticsConsent,
  readPublicAnalyticsConsent,
  trackPublicEvent,
  writePublicAnalyticsConsent,
} from '../lib/public-analytics';

const analyticsScriptId = 'soypms-ga4';

export function PublicAnalytics({
  enabled,
  measurementId,
}: {
  enabled: boolean;
  measurementId?: string;
}) {
  const pathname = usePathname();
  const configured =
    enabled &&
    isValidGaMeasurementId(measurementId) &&
    isPublicAnalyticsPath(pathname);
  const [consent, setConsent] = useState<PublicAnalyticsConsent | null>(null);

  const applyConsent = useCallback(
    (nextConsent: PublicAnalyticsConsent, persist = true) => {
      if (!configured || !measurementId) {
        return;
      }

      initializeDataLayer();
      window.gtag?.('consent', 'update', {
        analytics_storage: nextConsent,
      });

      if (persist) {
        writePublicAnalyticsConsent(nextConsent);
      }

      setConsent(nextConsent);

      if (nextConsent === 'granted') {
        loadAnalytics(measurementId);
      }
    },
    [configured, measurementId],
  );

  useEffect(() => {
    if (!configured || !measurementId) {
      return undefined;
    }

    initializeDataLayer();
    const storedConsent = readPublicAnalyticsConsent();
    setConsent(storedConsent);

    if (storedConsent) {
      applyConsent(storedConsent, false);
    }

    return onPublicAnalyticsConsentChanged((nextConsent) => {
      setConsent(nextConsent);
    });
  }, [applyConsent, configured, measurementId]);

  useEffect(() => {
    if (!configured) {
      return undefined;
    }

    const trackClick = (event: MouseEvent) => {
      const target = event.target;
      const anchor =
        target instanceof Element ? target.closest<HTMLAnchorElement>('a') : null;

      if (!anchor) {
        return;
      }

      const explicitEvent = anchor.dataset.analyticsEvent;
      if (explicitEvent && isPublicAnalyticsEvent(explicitEvent)) {
        trackPublicEvent(explicitEvent, {
          cta_location: anchor.dataset.analyticsLocation,
          link_location: anchor.dataset.analyticsLocation,
        });
        return;
      }

      const destination = new URL(anchor.href, window.location.href);
      if (
        destination.origin === window.location.origin &&
        isPublicContentPath(destination.pathname) &&
        destination.pathname !== window.location.pathname
      ) {
        trackPublicEvent('content_link_click', {
          destination_path: destination.pathname,
        });
      }
    };

    document.addEventListener('click', trackClick);
    return () => document.removeEventListener('click', trackClick);
  }, [configured]);

  useReportWebVitals((metric) => {
    if (!configured) {
      return;
    }

    trackPublicEvent('web_vital', {
      delta: Math.round(metric.delta),
      metric_id: metric.id,
      metric_name: metric.name,
      rating: metric.rating,
      value: Math.round(metric.value),
    });
  });

  if (!configured) {
    return null;
  }

  if (consent === null) {
    return (
      <aside
        aria-label="Preferencias de medición"
        className="public-consent-banner"
      >
        <div>
          <strong>Medición opcional</strong>
          <p>
            Usamos analítica únicamente si la aceptas. No enviamos los datos
            del formulario ni información personal a GA4.
          </p>
        </div>
        <div className="public-consent-actions">
          <Button
            onClick={() => applyConsent('denied')}
            type="button"
            variant="secondary"
          >
            Rechazar
          </Button>
          <Button
            className="public-consent-accept"
            onClick={() => applyConsent('granted')}
            type="button"
            variant="primary"
          >
            Aceptar medición
          </Button>
        </div>
      </aside>
    );
  }

  return (
    <button
      className="public-consent-preferences"
      onClick={() => {
        window.gtag?.('consent', 'update', {
          analytics_storage: 'denied',
        });
        window.localStorage.removeItem('soypms-analytics-consent-v1');
        setConsent(null);
      }}
      type="button"
    >
      Preferencias de cookies
    </button>
  );
}

function initializeDataLayer() {
  window.dataLayer = window.dataLayer ?? [];
  window.gtag =
    window.gtag ??
    ((...args: unknown[]) => {
      window.dataLayer?.push(args);
    });

  if (!window.dataLayer.some((entry) => entry[0] === 'consent')) {
    window.gtag('consent', 'default', {
      ad_personalization: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      analytics_storage: 'denied',
      wait_for_update: 500,
    });
    window.gtag('set', 'ads_data_redaction', true);
    window.gtag('set', 'url_passthrough', false);
  }
}

function loadAnalytics(measurementId: string) {
  if (document.getElementById(analyticsScriptId)) {
    return;
  }

  const script = document.createElement('script');
  script.async = true;
  script.id = analyticsScriptId;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(
    measurementId,
  )}`;
  script.addEventListener('load', () => {
    window.gtag?.('js', new Date());
    window.gtag?.('config', measurementId, {
      page_location: `${window.location.origin}${window.location.pathname}`,
      send_page_view: true,
    });
  });
  document.head.appendChild(script);
}

function isPublicContentPath(pathname: string) {
  return [
    '/producto',
    '/mandatos-y-expedientes',
    '/comisiones-inmobiliarias',
    '/crm-inmobiliario-vs-soypms',
  ].includes(pathname);
}

function isPublicAnalyticsPath(pathname: string) {
  return pathname === '/' || isPublicContentPath(pathname);
}
