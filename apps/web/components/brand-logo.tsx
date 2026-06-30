type BrandLogoVariant = 'lockup' | 'seal';

type BrandLogoProps = {
  className?: string;
  decorative?: boolean;
  variant?: BrandLogoVariant;
};

const brandAssets: Record<
  BrandLogoVariant,
  { height: number; src: string; width: number }
> = {
  lockup: {
    height: 44,
    src: '/brands/soypms/logo-teal.svg',
    width: 176,
  },
  seal: {
    height: 40,
    src: '/brands/soypms/seal-teal.svg',
    width: 40,
  },
};

export function BrandLogo({
  className,
  decorative = false,
  variant = 'lockup',
}: BrandLogoProps) {
  const asset = brandAssets[variant];
  const classes = ['brand-logo', `brand-logo-${variant}`, className]
    .filter(Boolean)
    .join(' ');

  return (
    <img
      alt={decorative ? '' : 'SoyPMS'}
      aria-hidden={decorative ? true : undefined}
      className={classes}
      height={asset.height}
      src={asset.src}
      width={asset.width}
    />
  );
}
