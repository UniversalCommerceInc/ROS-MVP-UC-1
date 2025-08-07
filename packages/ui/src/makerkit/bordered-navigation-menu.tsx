'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn, isRouteActive } from '../lib/utils';
import { Button } from '../shadcn/button';
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
  NavigationMenuContent,
  NavigationMenuLink,
} from '../shadcn/navigation-menu';
import { Trans } from './trans';

export function BorderedNavigationMenu(props: React.PropsWithChildren) {
  return (
    <NavigationMenu>
      <NavigationMenuList className={'relative h-full space-x-2'}>
        {props.children}
      </NavigationMenuList>
    </NavigationMenu>
  );
}

export function BorderedNavigationMenuItem(props: {
  path?: string;
  label: React.ReactNode | string;
  end?: boolean | ((path: string) => boolean);
  active?: boolean;
  className?: string;
  buttonClassName?: string;
  children?: Array<{
    path: string;
    label: React.ReactNode | string;
    Icon?: React.ReactNode;
  }>;
}) {
  const pathname = usePathname();

  // If this item has children, render as a dropdown
  if (props.children && props.children.length > 0) {
    return (
      <NavigationMenuItem className={props.className}>
        <NavigationMenuTrigger className={cn('text-sm', props.buttonClassName)}>
          {typeof props.label === 'string' ? (
            <Trans i18nKey={props.label} defaults={props.label} />
          ) : (
            props.label
          )}
        </NavigationMenuTrigger>
        <NavigationMenuContent>
          <div className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
            {props.children.map((child) => {
              const isChildActive = isRouteActive(child.path, pathname);
              return (
                <NavigationMenuLink key={child.path} asChild>
                  <Link
                    href={child.path}
                    className={cn(
                      'block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground',
                      {
                        'bg-accent text-accent-foreground': isChildActive,
                      }
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {child.Icon}
                      <div className="text-sm font-medium leading-none">
                        {typeof child.label === 'string' ? (
                          <Trans i18nKey={child.label} defaults={child.label} />
                        ) : (
                          child.label
                        )}
                      </div>
                    </div>
                  </Link>
                </NavigationMenuLink>
              );
            })}
          </div>
        </NavigationMenuContent>
      </NavigationMenuItem>
    );
  }

  // If no children, render as a simple link (existing behavior)
  if (!props.path) {
    throw new Error('NavigationMenuItem must have either a path or children');
  }

  const active = props.active ?? isRouteActive(props.path, pathname, props.end);

  return (
    <NavigationMenuItem className={props.className}>
      <Button
        asChild
        variant={'ghost'}
        className={cn('relative active:shadow-xs', props.buttonClassName)}
      >
        <Link
          href={props.path}
          className={cn('text-sm', {
            'text-secondary-foreground': active,
            'text-secondary-foreground/80 hover:text-secondary-foreground':
              !active,
          })}
        >
          {typeof props.label === 'string' ? (
            <Trans i18nKey={props.label} defaults={props.label} />
          ) : (
            props.label
          )}

          {active ? (
            <span
              className={cn(
                'bg-primary animate-in fade-in zoom-in-90 absolute -bottom-2.5 left-0 h-0.5 w-full',
              )}
            />
          ) : null}
        </Link>
      </Button>
    </NavigationMenuItem>
  );
}
