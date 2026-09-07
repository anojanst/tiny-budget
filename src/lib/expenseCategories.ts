/**
 * Suggestions for the expense name field, not a fixed taxonomy — the combobox
 * always accepts free text. They exist so nobody has to think up the word
 * "Contents insurance" from a blank box, and so the same thing tends to get
 * spelled the same way twice.
 *
 * Ordered roughly by how commonly they appear in a household budget, since the
 * list is filtered as you type and the first few matches are what get seen.
 */
export const EXPENSE_CATEGORIES: readonly string[] = [
  'Rent',
  'Mortgage',
  'Groceries',
  'Power',
  'Gas',
  'Water',
  'Internet',
  'Mobile phone',
  'Petrol',
  'Public transport',
  'Car payment',
  'Car insurance',
  'Car maintenance',
  'Parking',
  'Health insurance',
  'Home insurance',
  'Contents insurance',
  'Life insurance',
  'Income protection',
  'Council rates',
  'Body corporate',
  'Childcare',
  'School fees',
  'Kids activities',
  'Doctor',
  'Dentist',
  'Pharmacy',
  'Dining out',
  'Takeaways',
  'Coffee',
  'Alcohol',
  'Entertainment',
  'Streaming',
  'Subscriptions',
  'Gym',
  'Sports',
  'Hobbies',
  'Clothing',
  'Haircuts',
  'Personal care',
  'Household supplies',
  'Cleaning',
  'Laundry',
  'Pet food',
  'Vet',
  'Gifts',
  'Charity',
  'Travel',
  'Student loan',
  'Bank fees',
  'Union fees',
  'Savings club',
];

/**
 * The same idea for pay streams. Households commonly have more than one — two
 * jobs, a partner's wage, a rental — and each wants naming so the calendar can
 * say which money landed.
 */
export const INCOME_CATEGORIES: readonly string[] = [
  'Salary',
  'Wages',
  'Partner income',
  'Side job',
  'Freelance',
  'Rental income',
  'Benefit',
  'Pension',
  'Child support',
  'Dividends',
  'Maintenance',
  'Other income',
];
