import { Menu } from '@base-ui/react/menu';
import { cn } from '@/lib/utils';
import type { NamedBudget } from '@/types/budget';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';

interface BudgetSwitcherProps {
  budgets: NamedBudget[];
  activeId: string;
  onSwitch: (id: string) => void;
  onCreate: () => void;
}

/**
 * Sits directly under the logo, where an account or workspace switcher
 * normally lives — the budget is the context everything else on screen is
 * scoped to, so it belongs above the navigation rather than inside Settings.
 */
export function BudgetSwitcher({ budgets, activeId, onSwitch, onCreate }: BudgetSwitcherProps) {
  const active = budgets.find((entry) => entry.id === activeId) ?? budgets[0];

  return (
    <Menu.Root>
      <Menu.Trigger
        className="flex w-full items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-2 text-left text-sm transition-colors hover:bg-muted"
        aria-label={`Current budget: ${active?.name ?? 'none'}. Switch budget`}
      >
        <span className="min-w-0 flex-1 truncate font-medium">{active?.name}</span>
        {budgets.length > 1 && (
          <span className="shrink-0 text-[0.7rem] tabular-nums text-muted-foreground">
            {budgets.length}
          </span>
        )}
        <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner sideOffset={4} align="start" className="z-50 outline-none">
          <Menu.Popup className="max-h-[min(24rem,var(--available-height))] w-[var(--anchor-width)] min-w-52 overflow-y-auto rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-lg outline-none">
            {budgets.map((entry) => (
              <Menu.Item
                key={entry.id}
                onClick={() => onSwitch(entry.id)}
                className={cn(
                  'grid cursor-default grid-cols-[1rem_1fr] items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm outline-none select-none',
                  'data-highlighted:bg-accent data-highlighted:text-accent-foreground',
                )}
              >
                <span className="col-start-1">
                  {entry.id === activeId && <Check className="size-3.5" />}
                </span>
                <span className="col-start-2 truncate">{entry.name}</span>
              </Menu.Item>
            ))}

            <Menu.Separator className="my-1 h-px bg-border" />

            <Menu.Item
              onClick={onCreate}
              className="grid cursor-default grid-cols-[1rem_1fr] items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
            >
              <Plus className="col-start-1 size-3.5" />
              <span className="col-start-2">New budget</span>
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
