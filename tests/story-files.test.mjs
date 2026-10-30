/**
 * A family's photos reach the app only through its own file address (`app/api/storybooks/files/route.js`), which
 * keeps each file as the kit does and then notes it as the family's. Every save that names a file requires that
 * note, so a file kept anywhere else, the kit's own `/api/files` included, can never be named by a book, a
 * character or a special photo. These checks run the address as inside Tellop on the Mac: the person door names the
 * owner, records go through the records door to a local store in a temporary folder, and files go to a stand-in
 * files door that keeps them in memory (`tests/mac-files.mjs`).
 * Nothing reaches the network.
 */
import assert from 'node:assert/strict';
import { after, afterEach, before, beforeEach, test } from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import { bounded, measured } from './records-bounds.mjs';
import { FILES, macFiles, picture, sha256 } from './mac-files.mjs';

const temp = mkdtempSync(path.join(os.tmpdir(), 'story-files-'));
process.env.APP_DATA_FILE = path.join(temp, 'app.db');
const data = await import('../lib/data/index.js');
const { FAMILY_OWNER } = await import('../lib/story-access.js');
const { POST: keepStoryFile } = await import('../app/api/storybooks/files/route.js');
const { POST: keepKitFile } = await import('../app/api/files/route.js');
const { POST: storyCommand } = await import('../app/api/storybooks/route.js');
const { proposeStoryFor } = await import('../lib/story-ai.js');
const { newDraft, templateDraft } = await import('../lib/story-draft.js');
const { STORY_FILE_ADDRESS, sendStoryFile, uploadedPicture } = await import('../lib/story-browser.js');

const ACTION = Symbol.for('tellop.internalRecordsAction');
const PERSON = Symbol.for('tellop.person');
const refused = (key) => (error) => error?.messageKey === key;
const memory = (photoFile) => ({ requestId: randomUUID(), expectedRevision: 0, kind: 'memory', id: null, fields: { title: 'Garden', description: 'Trees', photoFile, displayFile: null, aiCopyFile: null } });

const post = (address, bytes) => new Request(`http://app.invalid${address}`, { method: 'POST', body: bytes });

before(async () => { await data.storySettingsFor(FAMILY_OWNER); });
// Tellop on the Mac names the person who runs the app (the owner-only guard: `tests/story-owner-only.test.mjs`).
beforeEach(() => { globalThis[PERSON] = async () => ({ id: 'owner', name: null, role: 'owner' }); });
afterEach(() => { delete globalThis[FILES]; delete globalThis[PERSON]; delete globalThis.fetch; });
after(async () => { await data.closeStorage(); rmSync(temp, { recursive: true, force: true }); });

test('the app\'s own file address keeps a whole photo and notes it as the family\'s, so a record can name it', async () => {
  const kept = macFiles();
  const bytes = picture();
  const run = await measured(async () => {
    const response = await keepStoryFile(post('/api/storybooks/files', bytes));
    const answer = await response.json();
    assert.equal(response.status, 201);
    assert.equal(answer.file, sha256(bytes));
    assert.equal(answer.shows, 'picture');
    await data.requireStoryAssetsFor(FAMILY_OWNER, [answer.file]);
    return data.saveStoryLibraryFor(FAMILY_OWNER, memory(answer.file));
  });
  bounded(run, 'keep a photo, then save a special photo naming it');
  assert.ok(kept.has(sha256(bytes)));
  assert.equal((await data.storyLibraryItemFor(FAMILY_OWNER, 'memory', run.value.id)).photoFile, sha256(bytes));
});

test('a photo sent in pieces is noted only when the last piece names it', async () => {
  macFiles();
  const bytes = picture();
  const half = 40;
  await measured(async () => {
    const first = await keepStoryFile(post(`/api/storybooks/files?size=${bytes.length}&from=0&to=${half}`, bytes.subarray(0, half)));
    const begun = await first.json();
    assert.equal(first.status, 202);
    assert.equal(typeof begun.upload, 'string');
    assert.equal(begun.file, undefined);
    await assert.rejects(data.requireStoryAssetsFor(FAMILY_OWNER, [sha256(bytes)]), refused('story.photoMissing'));
    const last = await keepStoryFile(post(`/api/storybooks/files?size=${bytes.length}&from=${half}&to=${bytes.length}&upload=${begun.upload}`, bytes.subarray(half)));
    assert.equal(last.status, 201);
    assert.equal((await last.json()).file, sha256(bytes));
    await data.requireStoryAssetsFor(FAMILY_OWNER, [sha256(bytes)]);
  });
});

test('a file kept at the kit\'s own /api/files is never the family\'s: no record can name it', async () => {
  const kept = macFiles();
  const bytes = picture();
  await measured(async () => {
    const response = await keepKitFile(post('/api/files', bytes));
    assert.equal(response.status, 201);
    const { file } = await response.json();
    assert.ok(kept.has(file));
    await assert.rejects(data.requireStoryAssetsFor(FAMILY_OWNER, [file]), refused('story.photoMissing'));
    await assert.rejects(data.saveStoryLibraryFor(FAMILY_OWNER, memory(file)), refused('story.photoMissing'));
    const draft = templateDraft({ ...newDraft(data.DEFAULT_SETTINGS), name: 'Mina' });
    draft.coverFile = file;
    draft.coverKind = 'photo';
    await assert.rejects(data.saveStoryBookFor(FAMILY_OWNER, { requestId: randomUUID(), expectedRevision: 0, bookId: null, baseEditionId: null, draft, reviewed: false }), refused('story.photoMissing'));
  });
});

test('a person who is not the owner is refused before anything is kept', async () => {
  const kept = macFiles();
  globalThis[PERSON] = async () => ({ id: `p_${'v'.repeat(22)}`, name: null, role: 'viewer' });
  const run = await measured(() => keepStoryFile(post('/api/storybooks/files', picture())));
  assert.equal(run.value.status, 403);
  assert.deepEqual(await run.value.json(), { problem: 'story.ownerOnly' });
  assert.equal(kept.size, 0);
  assert.equal(run.calls.length, 0);
});

test('noting a photo the family already has only reads: it never writes over the note someone else added', async () => {
  macFiles();
  const file = sha256(picture());
  const first = await measured(() => data.registerStoryAssetFor(FAMILY_OWNER, file));
  assert.deepEqual(first.calls.map((call) => call.what), ['StoryAsset.findFirst', 'StoryAsset.create']);
  const again = await measured(() => data.registerStoryAssetFor(FAMILY_OWNER, file));
  assert.deepEqual(again.calls.map((call) => call.what), ['StoryAsset.findFirst']);
});

test('a change the host refuses shows "You cannot change this." on every address that writes, never a newer save', async () => {
  macFiles();
  const store = globalThis[Symbol.for('tellop.template.storage')];
  const writes = new Set(['create', 'createMany', 'update', 'updateMany', 'upsert', 'delete', 'deleteMany']);
  const prior = process.env.TELLOP_INTERNAL_RECORDS;
  process.env.TELLOP_INTERNAL_RECORDS = '1';
  // A Viewer online: every read answers, every write is refused as Tellop's records door refuses it.
  globalThis[ACTION] = async (steps) => {
    if (steps.some((step) => writes.has(step.action))) throw new Error('records-forbidden');
    return Promise.all(steps.map((step) => store.client[step.model[0].toLowerCase() + step.model.slice(1)][step.action](step.args)));
  };
  try {
    const kept = await keepStoryFile(post('/api/storybooks/files', picture()));
    assert.equal(kept.status, 403);
    assert.deepEqual(await kept.json(), { problem: 'error.cannotChange' });
    const saved = await storyCommand(new Request('http://app.invalid/api/storybooks', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'saveLibrary', input: memory(null) }),
    }));
    assert.equal(saved.status, 403);
    assert.deepEqual(await saved.json(), { problem: 'error.cannotChange' });
    const draft = templateDraft({ ...newDraft(data.DEFAULT_SETTINGS), name: 'Mina' });
    await assert.rejects(proposeStoryFor(FAMILY_OWNER, { requestId: randomUUID(), expectedRevision: 0, kind: 'story', draft }, undefined, {
      askAI: async () => { throw new Error('a refused claim must not reach AI'); },
    }), refused('error.cannotChange'));
  } finally {
    delete globalThis[ACTION];
    if (prior === undefined) delete process.env.TELLOP_INTERNAL_RECORDS;
    else process.env.TELLOP_INTERNAL_RECORDS = prior;
  }
});

test('the app\'s pages send every photo and picture copy to the app\'s own address', async () => {
  const sent = [];
  globalThis.fetch = async (address, init) => {
    sent.push(String(address));
    const size = init.body.size;
    return new Response(JSON.stringify({ file: 'a'.repeat(64), size, kind: 'png', shows: 'picture' }), { status: 201, headers: { 'content-type': 'application/json' } });
  };
  const file = new File([picture()], 'garden.png', { type: 'image/png' });
  assert.equal(await uploadedPicture({ file }), 'a'.repeat(64));
  assert.equal((await sendStoryFile(file)).file, 'a'.repeat(64));
  assert.equal(await uploadedPicture({ removed: true }), null);
  assert.equal(await uploadedPicture(null), undefined);
  assert.equal(sent.length, 2);
  for (const address of sent) assert.ok(address.startsWith(`${STORY_FILE_ADDRESS}?`), address);
  assert.equal(STORY_FILE_ADDRESS, '/api/storybooks/files');
});
