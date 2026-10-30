/**
 * A stand-in for Tellop's files door on the Mac, shared by the checks (not a test file itself, so `node --test` does
 * not run it alone): files kept in memory by their digest, a whole keep, an upload in pieces, and the look-up.
 * Nothing reaches the network or the disk.
 */
import { createHash, randomUUID } from 'node:crypto';

export const FILES = Symbol.for('tellop.internalFiles');
export const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==', 'base64');
export const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

let marker = 0;
/** A different PNG each time: the same picture with bytes after its end. */
export const picture = () => Buffer.concat([PNG, Buffer.from(`story-check-${marker++}`)]);

/** Sets the door and answers its files, by digest. */
export function macFiles() {
  const kept = new Map();
  const uploads = new Map();
  const kind = (bytes) => (bytes.subarray(0, 8).equals(PNG.subarray(0, 8)) ? 'png' : 'bin');
  const keep = (bytes) => { const digest = sha256(bytes); kept.set(digest, bytes); return { digest, size: bytes.length }; };
  const read = async (source) => { const parts = []; for await (const piece of source) parts.push(Buffer.from(piece)); return Buffer.concat(parts); };
  globalThis[FILES] = Object.freeze({
    put: async (source) => keep(await read(source)),
    ref: async (digest) => (kept.has(digest) ? { size: kept.get(digest).length, kind: kind(kept.get(digest)) } : null),
    discard: async () => false,
    begin: async () => { const id = randomUUID(); uploads.set(id, []); return id; },
    part: async (id, source) => { const parts = uploads.get(id); parts.push(await read(source)); return { size: Buffer.concat(parts).length }; },
    finish: async (id) => { const whole = Buffer.concat(uploads.get(id)); uploads.delete(id); return keep(whole); },
    abort: async (id) => { uploads.delete(id); },
  });
  return kept;
}
