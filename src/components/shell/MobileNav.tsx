import { cn } from '@/lib/utils';
import type { Route } from '@/hooks/useHashRoute';
import { LayoutDashboard, Landmark, Wallet, Target, Settings, type LucideIcon } from 'lucide-react';

const ITEMS: { route: Route; label: string; icon: LucideIcon }[] = [
  { route: 'overview', label: 'Overview', icon: LayoutDashboard },
  { route: 'debts', label: 'Debts', icon: Landmark },
  { route: 'budget', label: 'Budget', icon: Wallet },
  { route: 'goals', label: 'Goals', icon: Target },
  { route: 'settings', label: 'Settings', icon: Settings },
];

interface MobileNavProps {
  route: Route;
  onNavigate: (route: Route) => void;
}

/** Thumb-reachable tab bar; the sidebar's job below the lg breakpoint. */
export function MobileNav({ route, onNavigate }: MobileNavProps) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card/95 backdrop-blur lg:hidden">
      <ul className="flex">
        {ITEMS.map(({ route: itemRoute, label, icon: Icon }) => {
          const isActive = route === itemRoute;
          return (
            <li key={itemRoute} className="flex-1">
              <button
                type="button"
                onClick={() => onNavigate(itemRoute)}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex w-full flex-col items-center gap-1 py-2.5 text-[0.7rem] transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                <Icon className={cn('size-5', isActive && 'stroke-[2.5]')} />
                {label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
