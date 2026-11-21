/**
 * Top-level categories and their sub-categories.
 * Displayed as "Parent › Child" (e.g. "Kids › Timetable").
 */
export const CATEGORIES = {
  kids: ['timetable', 'circular', 'homework', 'fees', 'events'],
  vehicle: ['insurance', 'pollution', 'service', 'registration'],
  bills: ['electricity', 'water', 'gas', 'phone', 'internet', 'rent'],
  health: ['appointment', 'prescription', 'report', 'insurance'],
  work: ['meeting', 'deadline'],
  home: ['maintenance', 'warranty'],
  keepsakes: ['award', 'certificate', 'memory'],
  other: ['general'],
} as const satisfies Record<string, readonly string[]>;

export type CategoryId = keyof typeof CATEGORIES;
export type SubCategoryOf<C extends CategoryId> = (typeof CATEGORIES)[C][number];

export interface CategoryPath {
  category: CategoryId;
  subCategory: string;
}

export function isValidCategoryPath(path: CategoryPath): boolean {
  const subs: readonly string[] | undefined = CATEGORIES[path.category];
  return subs !== undefined && subs.includes(path.subCategory);
}

export function formatCategoryPath({ category, subCategory }: CategoryPath): string {
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  return `${cap(category)} › ${cap(subCategory)}`;
}
