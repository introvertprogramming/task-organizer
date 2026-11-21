import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './App.js';

describe('App', () => {
  it('renders the title and category list', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Task Organizer' })).toBeInTheDocument();
    const list = screen.getByRole('list', { name: 'Categories' });
    expect(within(list).getByText('Kids › Timetable')).toBeInTheDocument();
  });
});
