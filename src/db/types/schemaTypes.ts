import type { InferModel } from 'drizzle-orm';
import { matches, commentary } from '../schema';

// TypeScript types derived from Drizzle schema
export type Match = InferModel<typeof matches>;
export type NewMatch = InferModel<typeof matches, 'insert'>;

export type Commentary = InferModel<typeof commentary>;
export type NewCommentary = InferModel<typeof commentary, 'insert'>;

// Re-export table names/types for convenience
export type { typeof matches as MatchesTable };
