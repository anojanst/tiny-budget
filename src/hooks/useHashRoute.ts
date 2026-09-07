import { useEffect, useState } from 'react';

/**
 * The app is split across a handful of pages so no single screen has to hold
 * every widget. That needs routing, but not a router: hash navigation gives
 * back/forward and shareable links in about twenty lines, with no dependency
 * and no server-side rewrite to configure for a static build.
 */
export const ROUTES = ['overview', 'debts', 'budget', 'goals', 'calendar', 'settings'] as const;

export type Route = (typeof ROUTES)[number];

function currentRoute(): Route {
  const hash = window.location.hash.replace(/^#\/?/, '');
  return (ROUTES as readonly string[]).includes(hash) ? (hash as Route) : 'overview';
}

export function useHashRoute() {
  const [route, setRoute] = useState<Route>(currentRoute);

  useEffect(() => {
    const onChange = () => setRoute(currentRoute());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  // Assigning the hash rather than calling setRoute keeps the URL as the single
  // source of truth, so a back button press and a nav click take the same path.
  const navigate = (next: Route) => {
    window.location.hash = `/${next}`;
  };

  return { route, navigate };
}
