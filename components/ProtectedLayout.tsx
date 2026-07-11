'use client';

import React, { ReactNode, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { useDispatch } from 'react-redux';
import Navbar from './Navbar';
import Footer from './Footer';
import ScrollToTop from './ScrollToTop';
import { stripLocaleFromPath, useLocale } from '@/lib/i18n/client';
import { useLocalePath } from '@/hooks/useLocalePath';
import { LoginSkeleton } from '@/components/skeletons';

interface ProtectedLayoutProps {
  children: ReactNode;
}

export default function ProtectedLayout({ children }: ProtectedLayoutProps) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const locale = useLocale();
  const lp = useLocalePath();
  const dispatch = useDispatch();

  const isAuthenticated = status === 'authenticated';

  // Track if user was ever authenticated in this session.
  // Prevents clearing localStorage during the initial "loading" → "unauthenticated" flash
  // that happens before NextAuth reads the JWT cookie.
  const [wasAuthenticated, setWasAuthenticated] = useState(false);

  // Strip locale prefix OR store-code prefix (e.g. V101_en, Anwar_ar) for route matching.
  // stripLocaleFromPath only handles en/ar — store-code URLs like /V101_en/locations
  // must also be stripped so public pages work without login on those URLs.
  const STORE_CODE_RE = /^[A-Za-z0-9_]+_(en|ar)$/;
  const pathnameWithoutLocale = (() => {
    const stripped = stripLocaleFromPath(pathname);
    if (stripped !== pathname) return stripped;
    const segs = pathname.split("/").filter(Boolean);
    const first = segs[0] || "";
    if (first && STORE_CODE_RE.test(first)) return "/" + segs.slice(1).join("/") || "/";
    return pathname;
  })();
  const publicPages = [
    '/login', '/register', '/forgot-password',
    // Locations page — also reachable via Magento CMS slugs /contact, /contact-us, /branch-locations, /our-branches
    '/locations', '/branch-locations', '/contact',
    '/catalogue', '/catalog',
    '/guides',
    '/privacy-policy', '/privacy',
    '/return-exchange-policy', '/returns-exchange',
    '/terms-conditions', '/terms',
  ];
  const isPublicPage = publicPages.some(p => pathnameWithoutLocale.startsWith(p));

  // Sync NextAuth session with Redux & LocalStorage
  useEffect(() => {
    if (status === 'authenticated') {
      setWasAuthenticated(true);

      if ((session as any)?.accessToken) {
        const token = (session as any).accessToken;
        dispatch({ type: 'LOGIN_SUCCESS', payload: token });
        if (typeof window !== 'undefined') {
          localStorage.setItem('token', token);
        }
      }
    } else if (status === 'unauthenticated') {
      // Clear token for unauthenticated users on protected pages
      if (!isPublicPage) {
        dispatch({ type: 'LOGOUT' });
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
        }
      }
    }
  }, [session, status, dispatch, isPublicPage, wasAuthenticated]);

  const hideFooter = ['/login', '/register', '/forgot-password'].some(p => pathnameWithoutLocale.startsWith(p));
  const isLoading = status === 'loading';

  // Redirect unauthenticated users to login on protected pages.
  // Uses locale directly (stable string) instead of lp() to avoid the effect
  // re-running on every render due to lp being a new function reference each time.
  useEffect(() => {
    if (status === 'unauthenticated' && !isPublicPage) {
      localStorage.removeItem('token');
      window.location.href = `/${locale}/login?callbackUrl=${encodeURIComponent(pathname)}`;
    }
  }, [status, isPublicPage, locale, pathname]);

  // Status still resolving on a protected page → user is likely unauthenticated
  // and will be redirected to /login. Show LoginSkeleton so the visual matches
  // the destination, avoiding a "wrong-skeleton flash" before the redirect.
  if (isLoading && !isPublicPage && !wasAuthenticated) {
    return (
      <div className="flex flex-col min-h-screen bg-white max-w-[1920px] mx-auto w-full">
        <Navbar />
        <main className="flex-1 flex flex-col w-full relative">
          <LoginSkeleton />
        </main>
      </div>
    );
  }

  // Don't render page content if unauthenticated on protected pages (redirecting to login)
  const showContent = isPublicPage || status === 'authenticated' || isLoading || wasAuthenticated;

  return (
    <div className="flex flex-col min-h-screen bg-white max-w-[1920px] mx-auto w-full">
      <Navbar />

      <main className="flex-1 flex flex-col w-full relative">
        <div className="flex-1 flex flex-col w-full min-h-0">
          {showContent ? children : (
            // Unauthenticated on a protected page: redirect to /login is firing
            // in the effect above. Render LoginSkeleton so the transition into
            // the login route is visually continuous (no dashboard-shape flash).
            <LoginSkeleton />
          )}
        </div>

        {!hideFooter && <Footer />}
      </main>

      <ScrollToTop />
    </div>
  );
}
