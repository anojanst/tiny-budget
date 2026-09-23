import { useState } from 'react';
import { Platform } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { parseLocalDate, startOfToday, toDateInputValue } from '@tiny-budget/core';
import { DateFieldShell, type DateFieldProps } from './dateFieldShell';

/**
 * A date, picked rather than typed.
 *
 * Every date in this app is a `yyyy-mm-dd` string, which is the right thing to
 * store and the wrong thing to ask a person to type on a phone keyboard — a
 * slip produces a silently wrong projection rather than an error. The control
 * shows the date the way people read one and hands back the format the store
 * wants, so the two never have to agree in a user's head.
 *
 * Optional dates keep a clear button: undated is a real, meaningful state
 * here, not an empty field waiting to be filled.
 *
 * `DateField.web.tsx` stands in on the web, where this library renders
 * nothing at all.
 */
export function DateField(props: DateFieldProps) {
  const [open, setOpen] = useState(false);
  const parsed = props.value ? parseLocalDate(props.value) : null;

  // Opening on today is a better guess than opening on the epoch when the
  // field is empty, and than opening on an unparseable string when it isn't.
  const initial = parsed ?? startOfToday();

  const handle = (event: DateTimePickerEvent, next?: Date) => {
    setOpen(false);
    if (event.type === 'dismissed' || !next) return;
    props.onChange(toDateInputValue(next));
  };

  return (
    <DateFieldShell {...props} onPress={() => setOpen(true)}>
      {open ? (
        <DateTimePicker
          value={initial}
          mode="date"
          minimumDate={props.minimumDate}
          onChange={handle}
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
        />
      ) : null}
    </DateFieldShell>
  );
}
