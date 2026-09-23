/**
 * Everything both clients share: the money math, the dated projection, and
 * the persisted store with its migration chain.
 *
 * Nothing here imports React, a bundler alias, or a browser global, so the
 * same code runs on the web, in React Native, and in a plain Node test run.
 */
export * from './types';
export * from './dates';
export * from './budgetMath';
export * from './calendar';
export * from './format';
export * from './expenseCategories';
export * from './id';
export * from './store';
