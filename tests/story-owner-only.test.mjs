/**
 * A family's books and photos are open only to the person who runs the app (`lib/story-access.js`). Every page's
 * start, every address and every file answer is checked here for each person Tellop can name: the owner reaches
 * them; a helper, a member, a viewer and the owner looking as a member or a viewer are refused with "This app is open
 * only to the person who runs it." (`story.ownerOnly`), and an answer about the person that cannot be read is refused
 * with the kit's own words for it (`error.storageUnreadable`), all before any record or file is read. A refused page
 * gets the closed page (with the way back while the owner looks as someone else); a refused address answers 403 with
 * the words' key and nothing else. The kit's own `/api/files` has no such check, and its row below keeps that gap
 * in sight.
 *
 * The person comes from a stand-in of Tellop's person door; records go through the records door to a local store in
 * a temporary folder; files go to a stand-in files door in memory (`tests/mac-files.mjs`). Nothing reaches the
 * network.
 */
import assert from 'node:assert/strict';
import { after, afterEach, before, test } from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import { measured } from './records-bounds.mjs';
import { FILES, macFiles, picture, sha256 } from './mac-files.mjs';

const temp = mkdtempSync(path.join(os.tmpdir(), 'story-owner-only-'));
process.env.APP_DATA_FILE = path.join(temp, 'app.db');
const data = await import('../lib/data/index.js');
const { FAMILY_OWNER } = await import('../lib/story-access.js');
const { storyPageContext } = await import('../lib/story-page.js');
const { newDraft, templateDraft } = await import('../lib/story-draft.js');
const { POST: command } = await import('../app/api/storybooks/route.js');
const { POST: propose } = await import('../app/api/storybooks/ai/route.js');
const { POST: keepPhoto } = await import('../app/api/storybooks/files/route.js');
const { GET: library } = await import('../app/api/storybooks/library/[kind]/route.js');
const { GET: content } = await import('../app/api/storybooks/content/[kind]/[id]/route.js');
const { GET: status } = await import('../app/api/storybooks/status/[requestId]/route.js');
const { POST: kitKeep } = await import('../app/api/files/route.js');

const PERSON = Symbol.for('tellop.person');
const someone = `p_${'m'.repeat(22)}`;
const OWNER = Object.freeze({ id: 'owner', name: 'Ayşe', role: 'owner' });
/** Every visit that is not the owner in their own view: the words the closed page and the addresses give, and
 * whether the page offers the way back. */
const CLOSED = 'story.ownerOnly';
const UNREAD = 'error.storageUnreadable';
const REFUSED = Object.freeze({
  helper: { door: async () => ({ id: someone, name: 'Mert', role: 'helper' }), words: CLOSED, preview: false },
  member: { door: async () => ({ id: someone, name: 'Mert', role: 'member' }), words: CLOSED, preview: false },
  viewer: { door: async () => ({ id: someone, name: null, role: 'viewer' }), words: CLOSED, preview: false },
  'owner looking as a member': { door: async () => ({ id: 'owner', name: 'Ayşe', role: 'member', preview: true }), words: CLOSED, preview: true },
  'owner looking as a viewer': { door: async () => ({ id: 'owner', name: 'Ayşe', role: 'viewer', preview: true }), words: CLOSED, preview: true },
  'person door that fails': { door: async () => { throw new Error('the door is down'); }, words: UNREAD, preview: false },
  'person answer of another shape': { door: async () => ({ id: someone, name: 'Mallory', role: 'owner' }), words: UNREAD, preview: false },
  'no person door inside Tellop': { door: undefined, words: UNREAD, preview: false },
});

const json = (address, body) => new Request(`http://app.invalid${address}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
const get = (address) => new Request(`http://app.invalid${address}`);
const params = (value) => ({ params: Promise.resolve(value) });
const memoryInput = () => ({ requestId: randomUUID(), expectedRevision: 0, kind: 'memory', id: null, fields: { title: 'Garden', description: 'Trees', photoFile: null, displayFile: null, aiCopyFile: null } });

let kept;
/** The owner's family, made through the owner's own addresses: a special photo with a picture and a book with a cover. */
const family = {};

before(async () => {
  await data.storySettingsFor(FAMILY_OWNER);
  kept = macFiles();
  globalThis[PERSON] = async () => OWNER;
  await measured(async () => {
    const photo = await (await keepPhoto(new Request('http://app.invalid/api/storybooks/files', { method: 'POST', body: picture() }))).json();
    family.photo = photo.file;
    const memory = { ...memoryInput(), fields: { ...memoryInput().fields, photoFile: photo.file } };
    family.memory = (await (await command(json('/api/storybooks', { action: 'saveLibrary', input: memory }))).json()).id;
    const draft = templateDraft({ ...newDraft(data.DEFAULT_SETTINGS), name: 'Mina' });
    Object.assign(draft, { coverFile: photo.file, coverKind: 'photo' });
    family.requestId = randomUUID();
    const book = await data.saveStoryBookFor(FAMILY_OWNER, { requestId: family.requestId, expectedRevision: 0, bookId: null, baseEditionId: null, draft, reviewed: false });
    family.edition = book.editionId;
  });
  assert.ok(family.photo && family.memory && family.edition);
});
afterEach(() => { globalThis[PERSON] = async () => OWNER; });
after(async () => {
  delete globalThis[PERSON];
  delete globalThis[FILES];
  await data.closeStorage();
  rmSync(temp, { recursive: true, force: true });
});

/** Every page's start and every address, for the person the door names now: each answer and the records calls made. */
async function visit() {
  return measured(async () => {
    const answers = {};
    answers.page = await storyPageContext();
    answers.save = await command(json('/api/storybooks', { action: 'saveLibrary', input: memoryInput() }));
    answers.ai = await propose(json('/api/storybooks/ai', {}));
    answers.photo = await keepPhoto(new Request('http://app.invalid/api/storybooks/files', { method: 'POST', body: picture() }));
    answers.library = await library(get('/api/storybooks/library/memory'), params({ kind: 'memory' }));
    answers.original = await content(get(`/api/storybooks/content/memory/${family.memory}?variant=original`), params({ kind: 'memory', id: family.memory }));
    answers.cover = await content(get(`/api/storybooks/content/cover/${family.edition}`), params({ kind: 'cover', id: family.edition }));
    answers.status = await status(get(`/api/storybooks/status/${family.requestId}`), params({ requestId: family.requestId }));
    return answers;
  });
}
const ADDRESSES = ['save', 'ai', 'photo', 'library', 'original', 'cover', 'status'];

test('owner: every page and address answers, with the family\'s records and files', async () => {
  const { value } = await visit();
  assert.equal(value.page.owner, FAMILY_OWNER);
  assert.equal(value.page.closed, null);
  assert.equal(value.save.status, 200);
  assert.equal(value.ai.status, 400, 'the owner passes the guard; an empty request is then refused as invalid');
  assert.equal(value.photo.status, 201);
  assert.equal(value.library.status, 200);
  assert.ok((await value.library.json()).items.some((item) => item.id === family.memory));
  assert.equal(value.original.status, 200);
  assert.equal(value.original.headers.get('x-tellop-file'), family.photo);
  assert.equal(value.cover.headers.get('x-tellop-file'), family.photo);
  assert.equal(value.status.status, 200);
  assert.ok((await value.status.json()).result);
});

for (const [who, { door, words, preview }] of Object.entries(REFUSED)) {
  test(`${who}: the closed page and 403 on every address with ${words}, before any record or file is read`, async () => {
    if (door === undefined) delete globalThis[PERSON];
    else globalThis[PERSON] = door;
    const files = kept.size;
    const memories = (await data.storyLibraryFor(FAMILY_OWNER, 'memory')).items.length;
    const { value, calls } = await visit();
    assert.equal(calls.length, 0, `records read or written: ${calls.map((call) => call.what).join(', ')}`);
    assert.equal(value.page.owner, null);
    assert.equal(value.page.settings, null);
    assert.equal(value.page.abilities, null);
    assert.deepEqual(value.page.closed, { preview, wordsKey: words });
    for (const name of ADDRESSES) {
      const answer = value[name];
      assert.equal(answer.status, 403, name);
      assert.equal(answer.headers.get('x-tellop-file'), null, name);
      assert.deepEqual(await answer.json(), { problem: words }, name);
    }
    assert.equal(kept.size, files, 'a file was kept');
    assert.equal((await data.storyLibraryFor(FAMILY_OWNER, 'memory')).items.length, memories, 'a record was added');
  });
}

// An accepted gap, kept in sight: the kit's own file address (kit bytes, `AGENTS.md` rule 6c) has no app check. A
// helper's or a member's file is kept in the owner's file room online (Tellop's host refuses a viewer's there), but
// no record names it and no route of this app shows it. A kit release that lets the app check that address closes it.
for (const who of ['helper', 'member']) {
  test(`${who}: the kit's own /api/files still keeps their file, which no record can name and no route shows`, async () => {
    globalThis[PERSON] = REFUSED[who].door;
    const files = kept.size;
    const { value, calls } = await measured(async () => {
      const answer = await kitKeep(new Request('http://app.invalid/api/files', { method: 'POST', body: picture() }));
      const file = (await answer.json()).file;
      return { status: answer.status, file };
    });
    assert.equal(value.status, 201);
    assert.equal(kept.size, files + 1, 'the kit route kept the file');
    assert.equal(calls.length, 0, 'the kit route wrote no note that the family owns it');
    globalThis[PERSON] = async () => OWNER;
    await measured(async () => {
      await assert.rejects(data.requireStoryAssetsFor(FAMILY_OWNER, [value.file]), (error) => error?.messageKey === 'story.photoMissing');
      const memory = { ...memoryInput(), fields: { ...memoryInput().fields, photoFile: value.file } };
      const named = await command(json('/api/storybooks', { action: 'saveLibrary', input: memory }));
      assert.equal(named.status, 400);
      assert.deepEqual(await named.json(), { problem: 'story.photoMissing' });
    });
  });
}

test('outside Tellop the one person is the owner, who reaches the pages and the family\'s records', async () => {
  delete globalThis[PERSON];
  delete globalThis[FILES];
  try {
    const page = await storyPageContext();
    assert.equal(page.owner, FAMILY_OWNER);
    assert.equal(page.closed, null);
    const answer = await library(get('/api/storybooks/library/memory'), params({ kind: 'memory' }));
    assert.equal(answer.status, 200);
    assert.ok((await answer.json()).items.some((item) => item.id === family.memory));
  } finally {
    kept = macFiles();
  }
});
