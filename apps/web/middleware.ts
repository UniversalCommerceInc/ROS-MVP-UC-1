/*
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║                        VELLORA.AI PROPRIETARY SOFTWARE                           ║
 * ║                              STRICTLY CONFIDENTIAL                               ║
 * ║                          COPYRIGHT © 2024 VELLORA.AI                            ║
 * ║                            ALL RIGHTS RESERVED                                   ║
 * ║                                                                                  ║
 * ║  🚨 UNAUTHORIZED ACCESS, USE, OR DISTRIBUTION IS A FEDERAL CRIME 🚨              ║
 * ║                                                                                  ║
 * ║  This file contains proprietary trade secrets and confidential information      ║
 * ║  of VELLORA.AI. Any unauthorized access, copying, distribution, or use         ║
 * ║  constitutes theft of trade secrets and will be prosecuted to the fullest      ║
 * ║  extent of criminal and civil law.                                              ║
 * ║                                                                                  ║
 * ║  Protected under: US Copyright Law, DMCA, Computer Fraud and Abuse Act,        ║
 * ║  Economic Espionage Act, and international intellectual property treaties       ║
 * ║                                                                                  ║
 * ║  ALL ACCESS IS MONITORED AND LOGGED WITH FORENSIC CAPABILITIES                 ║
 * ║  VIOLATIONS WILL RESULT IN IMMEDIATE CRIMINAL PROSECUTION                       ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 */

// --- Team Accounts Only Middleware Additions ---
import type { NextRequest } from 'next/server';
import { NextResponse, URLPattern } from 'next/server';

import { CsrfError, createCsrfProtect } from '@edge-csrf/nextjs';

import { isSuperAdmin } from '@kit/admin';
import { checkRequiresMultiFactorAuthentication } from '@kit/supabase/check-requires-mfa';
import { createMiddlewareClient } from '@kit/supabase/middleware-client';

import appConfig from '~/config/app.config';
import pathsConfig from '~/config/paths.config';

const createTeamCookie = (userId: string) => `${userId}-selected-team-slug`;

function handleTeamAccountsOnly(request: NextRequest, userId: string) {
  // always allow access to the teams page
  if (request.nextUrl.pathname === '/home/teams') {
    return NextResponse.next();
  }

  // Allow access to personal dashboard (/home) to see pending invitations
  if (request.nextUrl.pathname === '/home') {
    return NextResponse.next();
  }

  if (isTeamAccountRoute(request) && !isUserRoute(request)) {
    return storeTeamSlug(request, userId);
  }

  // Don't redirect user routes - let them access personal dashboard
  if (isUserRoute(request)) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

function isUserRoute(request: NextRequest) {
  const pathName = request.nextUrl.pathname;
  return ['settings', 'billing', 'members'].includes(pathName.split('/')[2]!);
}

function isTeamAccountRoute(request: NextRequest) {
  const pathName = request.nextUrl.pathname;
  return pathName.startsWith('/home/');
}

function storeTeamSlug(request: NextRequest, userId: string): NextResponse {
  const accountSlug = request.nextUrl.pathname.split('/')[2];
  const response = NextResponse.next();

  if (accountSlug) {
    const cookieName = createTeamCookie(userId);
    response.cookies.set({
      name: cookieName,
      value: accountSlug,
      path: '/',
    });
  }

  return response;
}

function redirectToTeam(request: NextRequest, userId: string): NextResponse {
  const cookieName = createTeamCookie(userId);
  const lastTeamSlug = request.cookies.get(cookieName);
  const origin = request.nextUrl.origin;

  if (lastTeamSlug) {
    const redirectUrl = new URL(`/home/${lastTeamSlug.value}`, origin);
    
    console.log('🔄 Redirect to team:', { 
      lastTeamSlug: lastTeamSlug.value, 
      origin, 
      redirectUrl: redirectUrl.href 
    });
    
    return NextResponse.redirect(redirectUrl.href);
  }

  const teamsUrl = new URL('/home/teams', origin);
  console.log('🔄 Redirect to teams page:', { origin, teamsUrl: teamsUrl.href });
  
  return NextResponse.redirect(teamsUrl.href);
}


const CSRF_SECRET_COOKIE = 'csrfSecret';
const NEXT_ACTION_HEADER = 'next-action';

export const config = {
  matcher: ['/((?!_next/static|_next/image|images|locales|assets|api/*).*)'],
};

const getUser = (request: NextRequest, response: NextResponse) => {
  const supabase = createMiddlewareClient(request, response);

  return supabase.auth.getUser();
};

export async function middleware(request: NextRequest) {
  const secureHeaders = await createResponseWithSecureHeaders();
  const response = NextResponse.next(secureHeaders);

  // set a unique request ID for each request
  // this helps us log and trace requests
  setRequestId(request);

  // apply CSRF protection for mutating requests
  const csrfResponse = await withCsrfMiddleware(request, response);

  // handle patterns for specific routes
  const handlePattern = matchUrlPattern(request.url);

  // --- Team Accounts Only: Add handler for /home/* ---
  if (request.nextUrl.pathname.startsWith('/home')) {
    // get user for this request
    const {
      data: { user },
    } = await getUser(request, response);
    const origin = request.nextUrl.origin;
    const next = request.nextUrl.pathname;

    // If user is not logged in, redirect to sign in page.
    if (!user) {
      const signIn = pathsConfig.auth.signIn;
      const redirectPath = `${signIn}?next=${encodeURIComponent(next)}`;
      
      console.log('🔄 Middleware /home handler redirect:', { 
        next, 
        signIn, 
        redirectPath, 
        origin,
        finalUrl: new URL(redirectPath, origin).href
      });
      
      return NextResponse.redirect(new URL(redirectPath, origin).href);
    }

    const supabase = createMiddlewareClient(request, response);
    const requiresMultiFactorAuthentication =
      await checkRequiresMultiFactorAuthentication(supabase);

    // If user requires multi-factor authentication, redirect to MFA page.
    if (requiresMultiFactorAuthentication) {
      return NextResponse.redirect(
        new URL(pathsConfig.auth.verifyMfa, origin).href,
      );
    }

    return handleTeamAccountsOnly(request, user.id);
  }

  // if a pattern handler exists, call it
  if (handlePattern) {
    const patternHandlerResponse = await handlePattern(request, csrfResponse);

    // if a pattern handler returns a response, return it
    if (patternHandlerResponse) {
      return patternHandlerResponse;
    }
  }

  // append the action path to the request headers
  // which is useful for knowing the action path in server actions
  if (isServerAction(request)) {
    csrfResponse.headers.set('x-action-path', request.nextUrl.pathname);
  }

  // if no pattern handler returned a response,
  // return the session response
  return csrfResponse;
}

async function withCsrfMiddleware(
  request: NextRequest,
  response: NextResponse,
) {
  // set up CSRF protection
  const csrfProtect = createCsrfProtect({
    cookie: {
      secure: appConfig.production,
      name: CSRF_SECRET_COOKIE,
    },
    // ignore CSRF errors for server actions since protection is built-in
    ignoreMethods: isServerAction(request)
      ? ['POST']
      : // always ignore GET, HEAD, and OPTIONS requests
        ['GET', 'HEAD', 'OPTIONS'],
  });

  try {
    await csrfProtect(request, response);

    return response;
  } catch (error) {
    // if there is a CSRF error, return a 403 response
    if (error instanceof CsrfError) {
      return NextResponse.json('Invalid CSRF token', {
        status: 401,
      });
    }

    throw error;
  }
}

function isServerAction(request: NextRequest) {
  const headers = new Headers(request.headers);

  return headers.has(NEXT_ACTION_HEADER);
}

async function adminMiddleware(request: NextRequest, response: NextResponse) {
  const isAdminPath = request.nextUrl.pathname.startsWith('/admin');

  if (!isAdminPath) {
    return;
  }

  const {
    data: { user },
    error,
  } = await getUser(request, response);

  // If user is not logged in, redirect to sign in page.
  // This should never happen, but just in case.
  if (!user || error) {
    return NextResponse.redirect(
      new URL(pathsConfig.auth.signIn, request.nextUrl.origin).href,
    );
  }

  const client = createMiddlewareClient(request, response);
  const userIsSuperAdmin = await isSuperAdmin(client);

  // If user is not an admin, redirect to 404 page.
  if (!userIsSuperAdmin) {
    return NextResponse.redirect(new URL('/404', request.nextUrl.origin).href);
  }

  // in all other cases, return the response
  return response;
}

/**
 * Define URL patterns and their corresponding handlers.
 */
function getPatterns() {
  return [
    {
      pattern: new URLPattern({ pathname: '/admin/*?' }),
      handler: adminMiddleware,
    },
    {
      pattern: new URLPattern({ pathname: '/auth/*?' }),
      handler: async (req: NextRequest, res: NextResponse) => {
        const {
          data: { user },
        } = await getUser(req, res);

        // the user is logged out, so we don't need to do anything
        if (!user) {
          return;
        }

        // check if we need to verify MFA (user is authenticated but needs to verify MFA)
        const isVerifyMfa = req.nextUrl.pathname === pathsConfig.auth.verifyMfa;

        // If user is logged in and does not need to verify MFA,
        // redirect to home page.
        if (!isVerifyMfa) {
          const nextPath =
            req.nextUrl.searchParams.get('next') ?? pathsConfig.app.home;

          // Ensure we're using absolute URL for redirect
          const redirectUrl = new URL(nextPath, req.nextUrl.origin);
          
          console.log('🔄 Middleware auth redirect:', { 
            nextPath, 
            origin: req.nextUrl.origin, 
            redirectUrl: redirectUrl.href 
          });

          return NextResponse.redirect(redirectUrl.href);
        }
      },
    },
    {
      pattern: new URLPattern({ pathname: '/home/*?' }),
      handler: async (req: NextRequest, res: NextResponse) => {
        const {
          data: { user },
        } = await getUser(req, res);

        const origin = req.nextUrl.origin;
        const next = req.nextUrl.pathname;

        // If user is not logged in, redirect to sign in page.
        if (!user) {
          const signIn = pathsConfig.auth.signIn;
          const redirectPath = `${signIn}?next=${encodeURIComponent(next)}`;

          console.log('🔄 Middleware not logged in redirect:', { 
            next, 
            signIn, 
            redirectPath, 
            origin,
            finalUrl: new URL(redirectPath, origin).href
          });

          return NextResponse.redirect(new URL(redirectPath, origin).href);
        }

        const supabase = createMiddlewareClient(req, res);

        const requiresMultiFactorAuthentication =
          await checkRequiresMultiFactorAuthentication(supabase);

        // If user requires multi-factor authentication, redirect to MFA page.
        if (requiresMultiFactorAuthentication) {
          return NextResponse.redirect(
            new URL(pathsConfig.auth.verifyMfa, origin).href,
          );
        }
      },
    },
  ];
}

/**
 * Match URL patterns to specific handlers.
 * @param url
 */
function matchUrlPattern(url: string) {
  const patterns = getPatterns();
  const input = url.split('?')[0];

  for (const pattern of patterns) {
    const patternResult = pattern.pattern.exec(input);

    if (patternResult !== null && 'pathname' in patternResult) {
      return pattern.handler;
    }
  }
}

/**
 * Set a unique request ID for each request.
 * @param request
 */
function setRequestId(request: Request) {
  request.headers.set('x-correlation-id', crypto.randomUUID());
}

/**
 * @name createResponseWithSecureHeaders
 * @description Create a middleware with enhanced headers applied (if applied).
 * This is disabled by default. To enable set ENABLE_STRICT_CSP=true
 */
async function createResponseWithSecureHeaders() {
  const enableStrictCsp = process.env.ENABLE_STRICT_CSP ?? 'false';

  // we disable ENABLE_STRICT_CSP by default
  if (enableStrictCsp === 'false') {
    return {};
  }

  const { createCspResponse } = await import('./lib/create-csp-response');

  return createCspResponse();
}
