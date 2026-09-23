const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

export function formatCurrency(amount: number): string {
  return currencyFormatter.format(amount);
}

export function formatWeeksRemaining(weeks: number): string {
  const months = weeks / (52 / 12);
  const roundedWeeks = Math.ceil(weeks);
  const weekLabel = roundedWeeks === 1 ? 'week' : 'weeks';
  return `${roundedWeeks} ${weekLabel} (~${months.toFixed(1)} months)`;
}
