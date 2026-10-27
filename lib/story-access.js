import { DataError } from './data/refusal.js';
export const FAMILY_OWNER = 'local-storybook-family';
/** The private Mac process supplies this hook. A published process without trusted identity refuses every surface. */
export function storyOwner() {
  if (process.env.DATABASE_URL || process.env.TELLOP_INTERNAL_RECORDS !== '1' || typeof globalThis[Symbol.for('tellop.internalRecordsAction')] !== 'function') throw new DataError('story.onlineUnavailable');
  return FAMILY_OWNER;
}
