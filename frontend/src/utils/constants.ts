import type { Category } from '../types';

export const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'TRAVEL', label: 'Travel' },
  { value: 'MEALS', label: 'Meals' },
  { value: 'OFFICE_SUPPLIES', label: 'Office Supplies' },
  { value: 'SOFTWARE', label: 'Software' },
  { value: 'HARDWARE', label: 'Hardware' },
  { value: 'MARKETING', label: 'Marketing' },
  { value: 'OTHER', label: 'Other' },
];

export const CATEGORY_LABELS = Object.fromEntries(CATEGORIES.map((c) => [c.value, c.label])) as Record<Category, string>;

export const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CAD'] as const;
