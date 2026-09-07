import { Select } from '@base-ui/react/select';
import { cn } from '@/lib/utils';
import { Check, ChevronDown } from 'lucide-react';

interface Option {
  value: number;
  label: string;
  /** Out of the projection's range — shown, but not selectable. */
  disabled?: boolean;
}

interface MonthYearSelectProps {
  value: number;
  onValueChange: (value: number) => void;
  options: Option[];
  className?: string;
  'aria-label': string;
}

/**
 * A plain select over a numeric option list.
 *
 * Out-of-range months stay visible and disabled rather than being filtered
 * out: a January that vanishes from the list reads as a bug, whereas a greyed
 * one says "not in range" without the reader having to work out why.
 */
export function MonthYearSelect({
  value,
  onValueChange,
  options,
  className,
  'aria-label': ariaLabel,
}: MonthYearSelectProps) {
  return (
    <Select.Root
      value={value}
      onValueChange={(next) => onValueChange(Number(next))}
      items={options.map((o) => ({ value: o.value, label: o.label }))}
    >
      <Select.Trigger
        aria-label={ariaLabel}
        className={cn(
          'flex h-8 shrink-0 items-center justify-between gap-1 rounded-lg border border-input bg-transparent px-2.5 text-sm font-medium outline-none transition-colors hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30',
          className,
        )}
      >
        <Select.Value />
        <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
      </Select.Trigger>

      <Select.Portal>
        <Select.Positioner sideOffset={4} className="z-50 outline-none">
          <Select.Popup className="max-h-[min(20rem,var(--available-height))] min-w-36 overflow-y-auto overscroll-contain rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-lg outline-none">
            {options.map((option) => (
              <Select.Item
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                className="grid cursor-default grid-cols-[1rem_1fr] items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm outline-none select-none data-disabled:opacity-40 data-highlighted:bg-accent data-highlighted:text-accent-foreground"
              >
                <Select.ItemIndicator className="col-start-1">
                  <Check className="size-3.5" />
                </Select.ItemIndicator>
                <Select.ItemText className="col-start-2">{option.label}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}
