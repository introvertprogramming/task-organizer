import { CATEGORIES, formatCategoryPath, type CategoryId } from '@task-organizer/shared';

/** Placeholder home screen – replaced by real features in Phase 2. */
export function App() {
  const categories = Object.keys(CATEGORIES) as CategoryId[];
  return (
    <main className="shell">
      <h1>Task Organizer</h1>
      <p>Your family&apos;s documents and reminders – stored on your device.</p>
      <ul aria-label="Categories">
        {categories.map((c) => (
          <li key={c}>{formatCategoryPath({ category: c, subCategory: CATEGORIES[c][0] })}</li>
        ))}
      </ul>
    </main>
  );
}
