import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/**
 * Each widget carries one accent hue, used on its icon chip and card stripe.
 * Full class strings (not interpolated) so Tailwind keeps them at build time.
 */
export const WIDGET_ACCENTS = {
  blue: {
    chip: 'bg-blue-500/15 text-blue-600 dark:bg-blue-400/15 dark:text-blue-300',
    stripe: 'border-l-blue-500 dark:border-l-blue-400',
  },
  emerald: {
    chip: 'bg-emerald-500/15 text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-300',
    stripe: 'border-l-emerald-500 dark:border-l-emerald-400',
  },
  violet: {
    chip: 'bg-violet-500/15 text-violet-600 dark:bg-violet-400/15 dark:text-violet-300',
    stripe: 'border-l-violet-500 dark:border-l-violet-400',
  },
  orange: {
    chip: 'bg-orange-500/15 text-orange-600 dark:bg-orange-400/15 dark:text-orange-300',
    stripe: 'border-l-orange-500 dark:border-l-orange-400',
  },
  amber: {
    chip: 'bg-amber-500/15 text-amber-600 dark:bg-amber-400/15 dark:text-amber-300',
    stripe: 'border-l-amber-500 dark:border-l-amber-400',
  },
} as const;

export type WidgetAccent = keyof typeof WIDGET_ACCENTS;

/** Left stripe that tints a widget's card edge. Pair with the matching heading. */
export function widgetCardClass(accent: WidgetAccent) {
  return cn('border-l-4', WIDGET_ACCENTS[accent].stripe);
}

interface WidgetHeadingProps {
  icon: LucideIcon;
  title: string;
  accent: WidgetAccent;
  trailing?: ReactNode;
}

export function WidgetHeading({ icon: Icon, title, accent, trailing }: WidgetHeadingProps) {
  return (
    <CardHeader className="shrink-0">
      <CardTitle className="flex items-center gap-2.5">
        <span
          aria-hidden
          className={cn(
            'flex size-7 shrink-0 items-center justify-center rounded-lg',
            WIDGET_ACCENTS[accent].chip,
          )}
        >
          <Icon className="size-4" />
        </span>
        <span className="min-w-0 flex-1 truncate">{title}</span>
        {trailing}
      </CardTitle>
    </CardHeader>
  );
}
