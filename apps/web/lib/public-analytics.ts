export const publicAnalyticsEvents = [
  'demo_cta_click',
  'demo_form_view',
  'demo_form_start',
  'demo_form_submit',
  'demo_form_success',
  'demo_form_error',
  'login_click',
  'content_link_click',
  'web_vital',
] as const;

export type PublicAnalyticsEvent = (typeof publicAnalyticsEvents)[number];
export type PublicAnalyticsConsent = 'denied' | 'granted';

type AnalyticsValue = boolean | number | string;
type AnalyticsParameters = Record<string, AnalyticsValue | null | undefined>;

const consentStorageKey = 'soypms-analytics-consent-v1';
const consentChangedEvent = 'soypms:analytics-consent-changed';

const parameterAllowlist: Record<PublicAnalyticsEvent, readonly string[]> = {
  content_link_click: ['destination_path'],
  demo_cta_click: ['cta_location'],
  demo_form_error: ['error_type'],
  demo_form_start: [],
  demo_form_submit: [],
  demo_form_success: [],
  demo_form_view: [],
  login_click: ['link_location'],
  web_vital: ['delta', 'metric_id', 'metric_name', 'rating', 'value'],
};

declare global {
  interface Window {
    dataLayer?: unknown[][];
    gtag?: (...args: unknown[]) => void;
  }
}

export function isPublicAnalyticsEvent(
  value: string,
): value is PublicAnalyticsEvent {
  return publicAnalyticsEvents.includes(value as PublicAnalyticsEvent);
}

export function isValidGaMeasurementId(value?: string) {
  return /^G-[A-Z0-9]{4,20}$/i.test(value?.trim() ?? '');
}

export function sanitizeAnalyticsParameters(
  event: PublicAnalyticsEvent,
  parameters: AnalyticsParameters = {},
) {
  return Object.fromEntries(
    parameterAllowlist[event].flatMap((key) => {
      const value = parameters[key];

      if (
        value === null ||
        value === undefined ||
        !['boolean', 'number', 'string'].includes(typeof value)
      ) {
        return [];
      }

      return [
        [
          key,
          typeof value === 'string' ? value.slice(0, 100) : value,
        ] as const,
      ];
    }),
  );
}

export function readPublicAnalyticsConsent(): PublicAnalyticsConsent | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const stored = window.localStorage.getItem(consentStorageKey);
  return stored === 'granted' || stored === 'denied' ? stored : null;
}

export function writePublicAnalyticsConsent(
  consent: PublicAnalyticsConsent,
) {
  window.localStorage.setItem(consentStorageKey, consent);
  window.dispatchEvent(
    new CustomEvent<PublicAnalyticsConsent>(consentChangedEvent, {
      detail: consent,
    }),
  );
}

export function onPublicAnalyticsConsentChanged(
  listener: (consent: PublicAnalyticsConsent) => void,
) {
  const eventListener = (event: Event) => {
    listener((event as CustomEvent<PublicAnalyticsConsent>).detail);
  };

  window.addEventListener(consentChangedEvent, eventListener);
  return () => window.removeEventListener(consentChangedEvent, eventListener);
}

export function trackPublicEvent(
  event: PublicAnalyticsEvent,
  parameters?: AnalyticsParameters,
) {
  if (
    typeof window === 'undefined' ||
    readPublicAnalyticsConsent() !== 'granted' ||
    !window.gtag
  ) {
    return false;
  }

  window.gtag(
    'event',
    event,
    sanitizeAnalyticsParameters(event, parameters),
  );
  return true;
}
