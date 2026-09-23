import type { IconName } from './ui';

/**
 * A guessed icon for an entry, from its name.
 *
 * A list of identical grey dots is a list you have to read word by word; a
 * house, a trolley and a car are recognisable before the text is. The guess is
 * deliberately shallow — first match wins — and falls back to a generic
 * in/out arrow, because a wrong-but-plausible icon costs nothing next to the
 * name it sits beside.
 */
const RULES: [RegExp, IconName][] = [
  [/rent|mortgage|housing|landlord/i, 'home-outline'],
  [/grocer|food|supermarket|shop/i, 'cart-outline'],
  [/power|electric|energy|gas\b/i, 'lightning-bolt-outline'],
  [/water|council|rates/i, 'water-outline'],
  [/internet|broadband|wifi|phone|mobile/i, 'wifi'],
  [/car|fuel|petrol|rego|transport|bus|train/i, 'car-outline'],
  [/insur/i, 'shield-check-outline'],
  [/loan|debt|credit|visa|card|repay/i, 'credit-card-outline'],
  [/health|medic|doctor|dental|pharm/i, 'medical-bag'],
  [/child|school|daycare|tuition/i, 'school-outline'],
  [/gym|fitness|sport/i, 'dumbbell'],
  [/stream|netflix|spotify|subscri/i, 'play-circle-outline'],
  [/pet|vet|dog|cat\b/i, 'paw-outline'],
  [/salary|wage|pay\b|income/i, 'cash-multiple'],
  [/refund|tax|bonus|rebate/i, 'gift-outline'],
  [/rental|dividend|interest/i, 'chart-line'],
];

export function movementIcon(name: string, direction: 'in' | 'out'): IconName {
  for (const [pattern, icon] of RULES) {
    if (pattern.test(name)) return icon;
  }
  return direction === 'in' ? 'arrow-down' : 'arrow-up';
}
