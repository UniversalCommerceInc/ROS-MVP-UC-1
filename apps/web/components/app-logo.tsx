import Link from 'next/link';

import { cn } from '@kit/ui/utils';

function LogoImage({
  className,
  width = 105,
}: {
  className?: string;
  width?: number;
}) {
  return (
    <svg
      width={width}
      className={cn('h-auto', className)}
      viewBox="0 0 733 140"
      xmlns="http://www.w3.org/2000/svg"
    >
      <text
        x="0"
        y="105"
        fontFamily="Monument, sans-serif"
        fontSize="120"
        fontWeight="700"
        className={"fill-primary dark:fill-white"}
      >
        VELLORA.AI
      </text>
    </svg>
  );
}

export function AppLogo({
  href,
  label,
  className,
}: {
  href?: string | null;
  className?: string;
  label?: string;
}) {
  if (href === null) {
    return <LogoImage className={className} />;
  }

  return (
    <Link aria-label={label ?? 'Home Page'} href={href ?? '/'} prefetch={true}>
      <LogoImage className={className} />
    </Link>
  );
}
