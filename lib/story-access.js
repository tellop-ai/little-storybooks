import { currentPerson } from './data/person.js';
import { DataError } from './data/refusal.js';
export const FAMILY_OWNER = 'local-storybook-family';
/** A refusal of the guard below (`closed` marks it as one); `preview` is true while the owner looks as someone else. */
function closed(messageKey, preview) { const error=new DataError(messageKey); error.closed=true; error.preview=preview===true; return error; }
/**
 * The one guard every page, address and file answer of this app passes first: a family's books and photos are open
 * only to the person who runs the app. The person is the one Tellop names (`currentPerson()`): on the Mac and outside
 * Tellop that is the owner; online it is whoever Tellop let in. A helper, a member, a viewer and the owner looking as
 * one of them are refused with `story.ownerOnly`. When Tellop's answer about the person cannot be read (no answer, a
 * broken channel, an answer of another shape) the refusal is `error.storageUnreadable` instead: the visit is still
 * refused, but the words do not tell the owner that the app is closed to them. Either way nothing is read or kept
 * first, so a refused visit never falls back to the family.
 *
 * @returns {Promise<{ owner: string, person: { id: string, name: string | null, role: string, preview: boolean } }>}
 */
export async function storyVisitor() {
  let person;
  try { person=await currentPerson(); }
  catch { throw closed('error.storageUnreadable',false); }
  if(person?.role!=='owner'||person.preview===true)throw closed('story.ownerOnly',person?.preview);
  return {owner:FAMILY_OWNER,person};
}
/** The family whose books these are, for the person who runs the app only (`storyVisitor`). */
export async function storyOwner() { return (await storyVisitor()).owner; }
