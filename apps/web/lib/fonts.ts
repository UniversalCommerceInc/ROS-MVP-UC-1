import { Inter as SansFont } from 'next/font/google';

import { cn } from '@kit/ui/utils';

/**
 * @sans
 * @description Define here the sans font.
 * By default, it uses the Inter font from Google Fonts.
 */
const sans = SansFont({
  subsets: ['latin'],
  variable: '--font-sans',
  fallback: ['system-ui', 'Helvetica Neue', 'Helvetica', 'Arial'],
  preload: true,
  weight: ['300', '400', '500', '600', '700'],
});

/**
 * @heading
 * @description Define here the heading font.
 */
const heading = sans;

// we export these fonts into the root layout
export { sans, heading };

/**
 * @name getFontsClassName
 * @description Get the class name for the root layout.
 * Note: Theme classes are now handled by next-themes to prevent hydration mismatch
 */
export function getFontsClassName() {
  const font = [sans.variable, heading.variable].reduce<string[]>(
    (acc, curr) => {
      if (acc.includes(curr)) return acc;

      return [...acc, curr];
    },
    [],
  );

  return cn('bg-background min-h-screen antialiased', ...font);
}
