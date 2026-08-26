import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface WidgetHeadingProps {
  title: string;
  /** Optional supporting line; keep it to one short sentence. */
  description?: string;
  icon?: LucideIcon;
  /** Right-aligned action or figure, on the title's baseline. */
  trailing?: ReactNode;
  className?: string;
}

/**
 * Card headings are deliberately plain — a title, an optional line of context,
 * and an action. Color is reserved for the data inside the card, so a chart or
 * a green stat is never competing with its own header for attention.
 */
export function WidgetHeading({
  title,
  description,
  icon: Icon,
  trailing,
  className,
}: WidgetHeadingProps) {
  return (
    <CardHeader className={cn('shrink-0', className)}>
      <CardTitle className="flex items-center gap-2.5">
        {Icon && (
          <span aria-hidden className="text-muted-foreground">
            <Icon className="size-4" />
          </span>
        )}
        <span className="min-w-0 flex-1 truncate font-semibold">{title}</span>
        {trailing}
      </CardTitle>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
    </CardHeader>
  );
}
