import { DataError, keepFile } from '../../../../lib/data/files.js';
import { registerStoryAssetFor } from '../../../../lib/data/index.js';
import { storyOwner } from '../../../../lib/story-access.js';
import { dropBody } from '../../../../lib/story-http.js';

/**
 * This app's own address for a family's photos and picture copies (`STORY_FILE_ADDRESS` in
 * `lib/story-browser.js`, the only address the app's pages send a file to). Each request is the kit's file keep
 * exactly as `app/api/files/route.js` answers it (a whole file, or one piece of it: `lib/send-file.js`,
 * `lib/data/files.js`), and once the last piece names the file the family's ownership note for it is written
 * (`registerStoryAssetFor`). At this address anyone but the person who runs the app is refused before anything is
 * kept (`storyOwner`). A piece before the last answers 202 and notes nothing.
 *
 * A book, a character or a special photo names only a file that note covers (`requireStoryAssetsFor`), and this
 * app's routes show only files a record names. The kit's own `/api/files` stays exactly as the kit ships it, with no
 * such check: online it still keeps a file from a helper or a member (Tellop refuses a viewer's). No record can name
 * that file and no route of this app shows it, but it stays in the owner's online file room. The app cannot close
 * that address itself (`AGENTS.md` rule 6c, and the kit's own code); it stays an accepted gap until a kit release
 * lets the app check it.
 *
 * Refusals travel as message keys, never as sentences, and no answer here carries
 * `Access-Control-Allow-Origin` (`AGENTS.md` rule 3).
 */
export const dynamic = 'force-dynamic';

/** The status of a refusal, by its message key; any other is 400 (the kit's own, and this app's). */
const STATUS = Object.freeze({
  'error.fileRoom': 507, 'error.fileRoomOnline': 507, 'error.fileExpired': 410, 'error.cannotChange': 403,
  'error.fileTooLarge': 413, 'error.filesOff': 403, 'error.filesBusy': 429, 'error.filesDayLimit': 429, 'error.filesPersonDayLimit': 429,
});

/**
 * @param {unknown} body
 * @param {number} status
 */
function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

/** @param {Request} request */
export async function POST(request) {
  let owner;
  try {
    owner = await storyOwner();
  } catch (error) {
    await dropBody(request);
    // The guard's own refusals (`closed`) are 403, the person who could not be read included.
    const problem = error instanceof DataError ? error.messageKey : 'error.fileNotKept';
    return json({ problem }, error?.closed === true ? 403 : STATUS[problem] ?? 400);
  }
  try {
    const kept = await keepFile(request);
    if (typeof kept.file !== 'string') return json(kept, 202);
    await registerStoryAssetFor(owner, kept.file);
    return json(kept, 201);
  } catch (error) {
    if (error instanceof DataError) return json({ problem: error.messageKey }, STATUS[error.messageKey] ?? 400);
    return json({ problem: 'error.fileNotKept' }, 500);
  }
}

/** No cross-origin preflight is answered, as the kit's own file address. */
export function OPTIONS() {
  return new Response(null, { status: 405, headers: { allow: 'POST' } });
}
