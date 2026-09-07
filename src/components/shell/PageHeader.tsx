import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle: string;
  /** Primary/secondary actions, right-aligned on the same baseline as the title. */
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {/* `shrink-0` keeps the actions off the title's line-wrapping, but on its
          own it also sizes this to max-content, so a wide action group can
          never wrap and pushes the page sideways instead. `max-w-full` puts a
          ceiling back on it. */}
      {actions && (
        <div className="flex max-w-full shrink-0 flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  );
}
