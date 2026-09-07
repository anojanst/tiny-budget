import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { Route } from '@/hooks/useHashRoute';
import {
  LayoutDashboard,
  Landmark,
  Wallet,
  Target,
  Settings,
  CalendarDays,
  PiggyBank,
  type LucideIcon,
} from 'lucide-react';

interface NavItem {
  route: Route;
  label: string;
  icon: LucideIcon;
  /** Small count or status chip on the right of the row. */
  badge?: string;
  /** Dimmed and unclickable when the data it needs doesn't exist yet. */
  disabled?: boolean;
}

interface SidebarProps {
  route: Route;
  onNavigate: (route: Route) => void;
  debtCount: number;
  goalCount: number;
  /** Rendered at the foot of the nav — see TimeMachine for why it lives here. */
  footer?: ReactNode;
  /** Budget switcher, directly under the logo. */
  switcher?: ReactNode;
}

export function Sidebar({
  route,
  onNavigate,
  debtCount,
  goalCount,
  footer,
  switcher,
}: SidebarProps) {
  const menu: NavItem[] = [
    { route: 'overview', label: 'Overview', icon: LayoutDashboard },
    {
      route: 'debts',
      label: 'Debts',
      icon: Landmark,
      badge: debtCount > 0 ? String(debtCount) : undefined,
    },
    { route: 'budget', label: 'Budget', icon: Wallet },
    {
      route: 'goals',
      label: 'Goals',
      icon: Target,
      badge: goalCount > 0 ? String(goalCount) : undefined,
    },
    { route: 'calendar', label: 'Calendar', icon: CalendarDays },
  ];

  const general: NavItem[] = [{ route: 'settings', label: 'Settings', icon: Settings }];

  const renderItem = ({ route: itemRoute, label, icon: Icon, badge }: NavItem) => {
    const isActive = route === itemRoute;
    return (
      <li key={itemRoute}>
        <button
          type="button"
          onClick={() => onNavigate(itemRoute)}
          aria-current={isActive ? 'page' : undefined}
          className={cn(
            // The active row is carried by a filled pill plus a left rail, so
            // it survives being read without color.
            'relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
            isActive
              ? 'bg-accent font-medium text-accent-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          )}
        >
          {isActive && (
            <span
              aria-hidden
              className="absolute top-1.5 bottom-1.5 -left-3 w-1 rounded-full bg-primary"
            />
          )}
          <Icon className="size-4 shrink-0" />
          <span className="min-w-0 flex-1 truncate text-left">{label}</span>
          {badge && (
            <span
              className={cn(
                'shrink-0 rounded-md px-1.5 py-0.5 text-[0.7rem] font-medium tabular-nums',
                isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
              )}
            >
              {badge}
            </span>
          )}
        </button>
      </li>
    );
  };

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col gap-5 border-r border-border bg-sidebar px-6 py-5">
      <div>
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"
          >
            <PiggyBank className="size-4.5" />
          </span>
          <span className="text-base font-semibold tracking-tight">Tiny Budget</span>
        </div>
        {switcher && <div className="mt-3">{switcher}</div>}
      </div>

      <nav className="flex-1 space-y-6">
        <div>
          <p className="mb-2 px-3 text-[0.7rem] font-medium tracking-wider text-muted-foreground uppercase">
            Menu
          </p>
          <ul className="space-y-0.5">{menu.map(renderItem)}</ul>
        </div>
        <div>
          <p className="mb-2 px-3 text-[0.7rem] font-medium tracking-wider text-muted-foreground uppercase">
            General
          </p>
          <ul className="space-y-0.5">{general.map(renderItem)}</ul>
        </div>
      </nav>

      {footer}
    </aside>
  );
}
