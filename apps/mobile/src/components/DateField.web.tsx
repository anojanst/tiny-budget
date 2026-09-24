import { useRef, type CSSProperties } from 'react';
import { toDateInputValue } from '@money-ahead/core';
import { DateFieldShell, type DateFieldProps } from './dateFieldShell';

/**
 * The web stand-in for `DateField`.
 *
 * `@react-native-community/datetimepicker` has no web build: the bare
 * `datetimepicker.js` it falls back to renders `null` and logs a warning, so
 * on the web the field drew correctly and tapping it could never open
 * anything. The browser already has a date picker, so this reaches for that
 * one instead of shipping a hand-rolled calendar.
 *
 * The input is laid over the control and made invisible rather than styled:
 * `<input type="date">` cannot be made to match the rest of the app across
 * browsers, and the shell underneath already renders the date the way every
 * other platform does. The press handler calls `showPicker()`, which is what
 * actually opens the calendar — clicking a date input only moves between its
 * day/month/year segments — and falls back to focusing the input where that
 * method is missing.
 */
export function DateField(props: DateFieldProps) {
  const input = useRef<HTMLInputElement>(null);

  const open = () => {
    const el = input.current;
    if (!el) return;
    try {
      el.showPicker();
    } catch {
      // Firefox before 101, and any browser that refuses the call outside a
      // gesture it recognises. Focusing at least lets the field be typed in.
      el.focus();
    }
  };

  return (
    <DateFieldShell
      {...props}
      onPress={open}
      overlay={
        <input
          ref={input}
          type="date"
          value={props.value}
          min={props.minimumDate ? toDateInputValue(props.minimumDate) : undefined}
          onChange={(event) => props.onChange(event.target.value)}
          aria-label={props.accessibilityLabel ?? props.label ?? 'Pick a date'}
          style={overlayStyle}
        />
      }
    />
  );
}

const overlayStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  opacity: 0,
  border: 0,
  padding: 0,
  margin: 0,
  background: 'transparent',
  // The shell's Pressable sits underneath and owns the click, so the input
  // must not swallow it — it is only ever opened through `showPicker`.
  pointerEvents: 'none',
};
