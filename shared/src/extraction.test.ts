import { describe, expect, it } from 'vitest';
import { ExtractionResultSchema } from './extraction.js';
import { formatCategoryPath, isValidCategoryPath } from './categories.js';

const reminder = {
  documentType: 'pollution_certificate',
  category: 'vehicle',
  subCategory: 'pollution',
  title: 'PUC certificate – KA01AB1234',
  kind: 'reminder',
  fields: { vehicleNumber: 'KA01AB1234' },
  dates: [{ label: 'expiry', value: '2027-03-14' }],
  confidence: 0.92,
  source: 'on-device',
};

describe('ExtractionResultSchema', () => {
  it('accepts a valid reminder', () => {
    expect(ExtractionResultSchema.parse(reminder)).toMatchObject({ kind: 'reminder' });
  });

  it('accepts a date-time with IST offset', () => {
    const r = {
      ...reminder,
      dates: [{ label: 'appointment', value: '2026-11-22T10:30:00+05:30' }],
    };
    expect(ExtractionResultSchema.safeParse(r).success).toBe(true);
  });

  it('rejects a reminder without dates', () => {
    expect(ExtractionResultSchema.safeParse({ ...reminder, dates: [] }).success).toBe(false);
  });

  it('allows a record without dates and fills defaults', () => {
    const { fields: _f, dates: _d, ...rest } = reminder;
    const parsed = ExtractionResultSchema.parse({
      ...rest,
      kind: 'record',
      category: 'keepsakes',
      subCategory: 'award',
    });
    expect(parsed.dates).toEqual([]);
    expect(parsed.fields).toEqual({});
  });

  it('rejects unknown categories and out-of-range confidence', () => {
    expect(ExtractionResultSchema.safeParse({ ...reminder, category: 'pets' }).success).toBe(false);
    expect(ExtractionResultSchema.safeParse({ ...reminder, confidence: 1.5 }).success).toBe(false);
  });

  it('rejects malformed dates such as Indian DD/MM/YYYY (must be normalised first)', () => {
    const r = { ...reminder, dates: [{ label: 'expiry', value: '14/03/2027' }] };
    expect(ExtractionResultSchema.safeParse(r).success).toBe(false);
  });
});

describe('categories', () => {
  it('validates and formats category paths', () => {
    expect(isValidCategoryPath({ category: 'kids', subCategory: 'timetable' })).toBe(true);
    expect(isValidCategoryPath({ category: 'kids', subCategory: 'pollution' })).toBe(false);
    expect(formatCategoryPath({ category: 'kids', subCategory: 'timetable' })).toBe(
      'Kids › Timetable',
    );
  });
});
