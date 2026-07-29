'use client';

import { Button } from '@soyre/ui';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BrandLogo } from './brand-logo';

type PublicLandingNavigationProps = {
  demoHref: string;
};

export function PublicLandingNavigation({
  demoHref,
}: PublicLandingNavigationProps) {
  const [navUsesCoral, setNavUsesCoral] = useState(true);

  useEffect(() => {
    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    const revealElements = Array.from(
      document.querySelectorAll<HTMLElement>('[data-landing-reveal]'),
    );

    if (!reduceMotion && 'IntersectionObserver' in window) {
      revealElements.forEach((element) => {
        element.classList.add('landing-reveal-pending');
      });

      const revealObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) {
              return;
            }

            entry.target.classList.add('landing-revealed');
            revealObserver.unobserve(entry.target);
          });
        },
        {
          rootMargin: '0px 0px -8% 0px',
          threshold: 0.12,
        },
      );

      revealElements.forEach((element) => {
        revealObserver.observe(element);
      });

      return () => {
        revealObserver.disconnect();
      };
    }

    return undefined;
  }, []);

  useEffect(() => {
    if (!('IntersectionObserver' in window)) {
      return undefined;
    }

    const inPageCallsToAction = Array.from(
      document.querySelectorAll<HTMLElement>('[data-demo-cta]'),
    );
    const visibleCallsToAction = new Set<Element>();
    const callToActionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            visibleCallsToAction.add(entry.target);
          } else {
            visibleCallsToAction.delete(entry.target);
          }
        });

        setNavUsesCoral(visibleCallsToAction.size === 0);
      },
      { threshold: 0.35 },
    );

    inPageCallsToAction.forEach((element) => {
      callToActionObserver.observe(element);
    });

    return () => {
      callToActionObserver.disconnect();
    };
  }, []);

  return (
    <nav className="public-landing-nav" aria-label="Navegación pública">
      <div className="public-landing-container public-landing-nav-inner">
        <Link className="brand-link" href="/" aria-label="SoyPMS inicio">
          <BrandLogo />
        </Link>

        <div className="public-landing-nav-links">
          <Link href="/producto">Producto</Link>
          <Link href="/#como-funciona">Cómo funciona</Link>
          <Link href="/#alcance">Alcance</Link>
        </div>

        <div className="public-landing-nav-actions">
          <Link
            className="public-landing-login-link"
            data-analytics-event="login_click"
            data-analytics-location="navigation"
            href="/login"
          >
            Ingresar
          </Link>
          <Button
            asChild
            className={[
              'landing-demo-cta',
              navUsesCoral ? 'landing-demo-cta-coral' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            variant={navUsesCoral ? 'primary' : 'secondary'}
          >
            <a
              data-analytics-event="demo_cta_click"
              data-analytics-location="navigation"
              href={demoHref}
            >
              Ver una demo
            </a>
          </Button>
        </div>
      </div>
    </nav>
  );
}
