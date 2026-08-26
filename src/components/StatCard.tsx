import { cn } from '@/lib/utils';
import { ArrowUpRight } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string;
  /** One short line under the value — context, not decoration. */
  hint?: string;
  /**
   * Exactly one card per row should be featured. It's the metric the page is
   * really about; everything else is supporting context.
   */
  featured?: boolean;
  /** Renders the corner affordance and makes the whole card clickable. */
  onClick?: () => void;
  /** Softens the value when it's a placeholder rather than a real figure. */
  muted?: boolean;
}

export function StatCard({ label, value, hint, featured, onClick, muted }: StatCardProps) {
  const Wrapper = onClick ? 'button' : 'div';

  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'group relative flex flex-col justify-between gap-6 rounded-xl border p-5 text-left transition-colors',
        featured
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-card text-card-foreground',
        onClick && !featured && 'hover:border-primary/40 hover:bg-accent/40',
        onClick && featured && 'hover:bg-primary/90',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p
          className={cn(
            'text-sm font-medium',
            featured ? 'text-primary-foreground/80' : 'text-muted-foreground',
          )}
        >
          {label}
        </p>
        {onClick && (
          <span
            aria-hidden
            className={cn(
              'flex size-6 shrink-0 items-center justify-center rounded-full border transition-transform group-hover:-translate-y-px',
              featured
                ? 'border-primary-foreground/30 text-primary-foreground'
                : 'border-border text-muted-foreground',
            )}
          >
            <ArrowUpRight className="size-3.5" />
          </span>
        )}
      </div>

      <div>
        <p
          className={cn(
            'text-3xl font-semibold tracking-tight tabular-nums',
            muted && (featured ? 'text-primary-foreground/60' : 'text-muted-foreground'),
          )}
        >
          {value}
        </p>
        {hint && (
          <p
            className={cn(
              'mt-1.5 text-xs',
              featured ? 'text-primary-foreground/70' : 'text-muted-foreground',
            )}
          >
            {hint}
          </p>
        )}
      </div>
    </Wrapper>
  );
}
