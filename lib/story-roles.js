/**
 * Which controls each person sees, by the role Tellop names for them (`currentPerson()`, `lib/data/person.js`;
 * `AGENTS.md` rule 1). One rule for every page, kept here:
 *
 * - the owner and a helper: every control;
 * - a member: controls that add a new book, character or special photo, never one that changes or removes one
 *   already there, nor the shared settings (the app cannot tell which records a member added, and online a change
 *   to a record someone else added is refused);
 * - a viewer: no control that adds, changes or removes anything; reading, turning pages and printing stay.
 *
 * Any other role sees what a viewer sees. Server pages read the person and hand these answers to the page's pieces,
 * never the other way round. Hiding a control is not the safeguard: online, Tellop refuses a change the role cannot
 * make, and the page then shows "You cannot change this." (`error.cannotChange`).
 *
 * Today the app is open only to the person who runs it (`lib/story-access.js`): everyone else gets the closed page
 * before any of this is read, so only the owner's row reaches a page. The rule stays ready for when the app opens to
 * readers.
 */

/** The roles that see every control. */
const CHANGES = new Set(['owner', 'helper']);
/** The roles that may add a new record. */
const ADDS = new Set(['owner', 'helper', 'member']);

/** @param {unknown} role */
export function canAdd(role) {
  return typeof role === 'string' && ADDS.has(role);
}

/** @param {unknown} role */
export function canChange(role) {
  return typeof role === 'string' && CHANGES.has(role);
}

/**
 * What a page hands its pieces for this person: `{ canAdd, canChange, preview }`, where `preview` is true only while
 * the app's owner looks at the app as a member or a viewer (then the layout draws the way back).
 *
 * @param {{ role?: unknown, preview?: unknown } | null | undefined} person
 */
export function storyAbilities(person) {
  return Object.freeze({ canAdd: canAdd(person?.role), canChange: canChange(person?.role), preview: person?.preview === true });
}
