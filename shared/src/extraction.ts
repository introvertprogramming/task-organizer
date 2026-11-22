import { z } from 'zod';
import { CATEGORIES, type CategoryId } from './categories.js';

const categoryIds = Object.keys(CATEGORIES) as [CategoryId, ...CategoryId[]];

/** ISO date (YYYY-MM-DD) or date-time with offset (e.g. 2026-11-22T10:30:00+05:30). */
const isoDateOrDateTime = z.union([z.iso.date(), z.iso.datetime({ offset: true })]);

export const ExtractedDateSchema = z.object({
  /** What the date means, e.g. "expiry", "due", "appointment", "event". */
  label: z.string().min(1).max(60),
  value: isoDateOrDateTime,
});

/**
 * The structured result of understanding a document or voice note –
 * produced either by on-device rules or by the LLM. Both paths MUST
 * produce this exact shape so the rest of the app doesn't care which ran.
 */
export const ExtractionResultSchema = z
  .object({
    documentType: z.string().min(1).max(60),
    category: z.enum(categoryIds),
    subCategory: z.string().min(1).max(40),
    title: z.string().min(1).max(120),
    kind: z.enum(['reminder', 'record']),
    fields: z.record(z.string(), z.string().max(500)).default({}),
    dates: z.array(ExtractedDateSchema).max(20).default([]),
    /** 0..1 – how sure the producer is. On-device results below the threshold go to the LLM. */
    confidence: z.number().min(0).max(1),
    source: z.enum(['on-device', 'llm', 'user']),
  })
  .refine((r) => r.kind === 'record' || r.dates.length > 0, {
    message: 'A reminder must have at least one date',
    path: ['dates'],
  });

export type ExtractedDate = z.infer<typeof ExtractedDateSchema>;
export type ExtractionResult = z.infer<typeof ExtractionResultSchema>;
