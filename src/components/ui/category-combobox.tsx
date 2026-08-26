import { Combobox } from '@base-ui/react/combobox';
import { cn } from '@/lib/utils';
import { ChevronDown, Check } from 'lucide-react';

interface CategoryComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
  items: readonly string[];
  placeholder?: string;
  className?: string;
  'aria-label'?: string;
  onKeyDown?: (event: React.KeyboardEvent) => void;
}

/**
 * A suggestion list that never gets in the way: the field is a plain text
 * input that happens to offer completions. Anything typed is kept verbatim,
 * so an unusual category is no harder to enter than a common one.
 */
export function CategoryCombobox({
  value,
  onValueChange,
  items,
  placeholder,
  className,
  'aria-label': ariaLabel,
  onKeyDown,
}: CategoryComboboxProps) {
  return (
    <Combobox.Root
      items={items as string[]}
      // Only the text is controlled. Binding `value` as well would make every
      // keystroke read as a selection, which clears the filter query and shows
      // the full list no matter what has been typed.
      inputValue={value}
      onInputValueChange={onValueChange}
      onValueChange={(next) => {
        if (typeof next === 'string') onValueChange(next);
      }}
    >
      <Combobox.InputGroup className={cn('relative', className)}>
        <Combobox.Input
          placeholder={placeholder}
          aria-label={ariaLabel}
          onKeyDown={onKeyDown}
          className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent py-1 pr-7 pl-2.5 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
        />
        <Combobox.Trigger
          aria-label="Show suggestions"
          className="absolute inset-y-0 right-0 flex w-7 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronDown className="size-3.5" />
        </Combobox.Trigger>
      </Combobox.InputGroup>

      <Combobox.Portal>
        <Combobox.Positioner sideOffset={4} className="z-50 outline-none">
          <Combobox.Popup className="max-h-[min(20rem,var(--available-height))] w-[var(--anchor-width)] min-w-40 overflow-y-auto overscroll-contain rounded-xl border border-border bg-popover py-1 text-popover-foreground shadow-lg outline-none">
            {/* Nothing matching isn't an error here — it just means this is a
                category the list didn't think of, which is allowed. */}
            <Combobox.Empty className="px-3 py-2 text-sm text-muted-foreground">
              No match — press Enter to use what you typed.
            </Combobox.Empty>
            <Combobox.List>
              {(item: string) => (
                <Combobox.Item
                  key={item}
                  value={item}
                  className="grid cursor-default grid-cols-[1rem_1fr] items-center gap-2 px-2.5 py-1.5 text-sm outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                >
                  <Combobox.ItemIndicator className="col-start-1">
                    <Check className="size-3.5" />
                  </Combobox.ItemIndicator>
                  <span className="col-start-2">{item}</span>
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}
