// @vitest-environment jsdom
import { useState } from 'react';
import { describe, expect, it, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CategoryCombobox } from './category-combobox';

afterEach(cleanup);

const committed = () => screen.getByTestId('committed').textContent;

/**
 * Base UI's combobox is a "must resolve to an item" control by default: when
 * its popup unmounts it syncs the field back to the selected value. Free text
 * is never a selection, so that sync wipes whatever was typed the moment focus
 * leaves — which is exactly what a user does next, to reach the amount box.
 *
 * This field is a text input that offers suggestions, so these tests pin the
 * opposite behaviour.
 */
function Harness({ initial = '' }: { initial?: string }) {
  const [value, setValue] = useState(initial);
  return (
    <div>
      <CategoryCombobox
        value={value}
        onValueChange={setValue}
        items={['Rent', 'Groceries', 'Power']}
        aria-label="Name"
      />
      <input aria-label="Amount" />
      <output data-testid="committed">{value}</output>
    </div>
  );
}

describe('CategoryCombobox', () => {
  it('keeps free text when focus moves to the next field', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const field = screen.getByRole('combobox', { name: 'Name' });

    await user.click(field);
    await user.keyboard('Zebra grooming');
    expect(committed()).toBe('Zebra grooming');

    // Leaving the field is where the value used to disappear.
    await user.click(screen.getByLabelText('Amount'));
    await waitFor(() => expect(committed()).toBe('Zebra grooming'));
    expect((field as HTMLInputElement).value).toBe('Zebra grooming');
  });

  it('keeps free text that merely starts like a suggestion', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const field = screen.getByRole('combobox', { name: 'Name' });

    // "Rent" is a real suggestion, so the popup has a match to offer — the
    // typed text still wins over it.
    await user.click(field);
    await user.keyboard('Rent top-up');
    await user.click(screen.getByLabelText('Amount'));
    await waitFor(() => expect((field as HTMLInputElement).value).toBe('Rent top-up'));
  });

  it('still lets a suggestion be picked from the list', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const field = screen.getByRole('combobox', { name: 'Name' });

    await user.click(field);
    await user.keyboard('Groc');
    await user.click(await screen.findByRole('option', { name: 'Groceries' }));
    await waitFor(() => expect(committed()).toBe('Groceries'));
  });

  it('keeps an edited name when the field is emptied deliberately', async () => {
    // Clearing by hand reports `input-change`, not the popup's reset, so it
    // must still come through — otherwise the field could never be emptied.
    const user = userEvent.setup();
    render(<Harness initial="Rent" />);
    const field = screen.getByRole('combobox', { name: 'Name' });

    await user.clear(field);
    expect(committed()).toBe('');
  });
});
