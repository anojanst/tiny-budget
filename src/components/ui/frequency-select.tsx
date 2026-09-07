import { Select } from '@base-ui/react/select';
import { cn } from '@/lib/utils';
import type { Frequency } from '@/types/budget';
import { Check, ChevronDown } from 'lucide-react';

/**
 * Short labels because this sits in a row that repeats twenty-odd times — the
 * pair of columns either side of it matter more than spelling out "Fortnightly".
 */
const OPTIONS: { value: Frequency; short: string; long: string }[] = [
  { value: 'weekly', short: 'Wk', long: 'Weekly' },
  { value: 'fortnightly', short: '2wk', long: 'Fortnightly' },
  { value: 'monthly', short: 'Mo', long: 'Monthly' },
  { value: 'quarterly', short: 'Qtr', long: 'Quarterly' },
  { value: 'biannual', short: '6mo', long: 'Half-yearly' },
  { value: 'annual', short: 'Yr', long: 'Annual' },
];

interface FrequencySelectProps {
  value: Frequency;
  onValueChange: (value: Frequency) => void;
  className?: string;
  'aria-label'?: string;
}

export function FrequencySelect({
  value,
  onValueChange,
  className,
  'aria-label': ariaLabel,
}: FrequencySelectProps) {
  return (
    <Select.Root
      value={value}
      onValueChange={(next) => onValueChange(next as Frequency)}
      items={OPTIONS.map((o) => ({ value: o.value, label: o.short }))}
    >
      <Select.Trigger
        aria-label={ariaLabel ?? 'How often'}
        className={cn(
          'flex h-8 shrink-0 items-center justify-between gap-1 rounded-lg border border-input bg-transparent px-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30',
          className,
        )}
      >
        <Select.Value />
        <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
      </Select.Trigger>

      <Select.Portal>
        <Select.Positioner sideOffset={4} className="z-50 outline-none">
          <Select.Popup className="min-w-36 rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-lg outline-none">
            {OPTIONS.map((option) => (
              <Select.Item
                key={option.value}
                value={option.value}
                className="grid cursor-default grid-cols-[1rem_1fr] items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
              >
                <Select.ItemIndicator className="col-start-1">
                  <Check className="size-3.5" />
                </Select.ItemIndicator>
                <Select.ItemText className="col-start-2">{option.long}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}
