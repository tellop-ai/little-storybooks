/**
 * Which controls each person sees (`lib/story-roles.js`), and what every page's start hands the owner's pieces
 * (`lib/story-page.js`). The app is open only to the person who runs it (`lib/story-access.js`), so today only the
 * owner's row reaches a page; the rule for the other roles stays ready for when it opens to them. The person comes
 * from a stand-in of Tellop's person door; records go through the records door to a local store in a temporary
 * folder. Nothing reaches the network.
 */
import assert from 'node:assert/strict';
import { after, afterEach, before, test } from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { measured } from './records-bounds.mjs';

const temp = mkdtempSync(path.join(os.tmpdir(), 'story-roles-'));
process.env.APP_DATA_FILE = path.join(temp, 'app.db');
const data = await import('../lib/data/index.js');
const { FAMILY_OWNER } = await import('../lib/story-access.js');
const { canAdd, canChange, storyAbilities } = await import('../lib/story-roles.js');
const { storyPageContext } = await import('../lib/story-page.js');

const PERSON = Symbol.for('tellop.person');

before(async () => { await data.storySettingsFor(FAMILY_OWNER); });
afterEach(() => { delete globalThis[PERSON]; });
after(async () => { await data.closeStorage(); rmSync(temp, { recursive: true, force: true }); });

test('owner: adds, changes and removes', () => {
  assert.equal(canAdd('owner'), true);
  assert.equal(canChange('owner'), true);
});

test('helper: adds, changes and removes, as the owner', () => {
  assert.equal(canAdd('helper'), true);
  assert.equal(canChange('helper'), true);
});

test('member: adds a new book, character or photo, but changes and removes nothing already there', () => {
  assert.equal(canAdd('member'), true);
  assert.equal(canChange('member'), false);
});

test('viewer: adds, changes and removes nothing', () => {
  assert.equal(canAdd('viewer'), false);
  assert.equal(canChange('viewer'), false);
});

test('any other role, or none, sees what a viewer sees', () => {
  for (const role of ['Owner', 'admin', '', null, undefined, 1]) {
    assert.equal(canAdd(role), false, String(role));
    assert.equal(canChange(role), false, String(role));
  }
  assert.deepEqual(storyAbilities(null), { canAdd: false, canChange: false, preview: false });
});

test('the owner\'s pages get every control; nobody else reaches a page (`tests/story-owner-only.test.mjs`)', async () => {
  globalThis[PERSON] = async () => ({ id: 'owner', name: 'Ayşe', role: 'owner' });
  const { value } = await measured(() => storyPageContext());
  assert.equal(value.owner, FAMILY_OWNER);
  assert.deepEqual({ ...value.abilities }, { canAdd: true, canChange: true, preview: false });
  assert.equal(value.closed, null);
});
