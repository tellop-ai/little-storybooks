import { storyOwner } from '../../../lib/story-access.js';
import { dropBody, json, refused, readStoryJson } from '../../../lib/story-http.js';
import { object, fail } from '../../../lib/story-contract.js';
import { saveStoryBookFor, saveStorySettingsFor, saveStoryLibraryFor, deleteStoryRecordFor, dismissStoryProposalFor } from '../../../lib/data/index.js';
export const dynamic='force-dynamic';
export async function POST(request) {
  let owner;
  try{owner=await storyOwner();}catch(error){await dropBody(request);return refused(error);}
  try {
    const body=await readStoryJson(request);object(body,['action','input']);
    const commands={saveBook:saveStoryBookFor,saveSettings:saveStorySettingsFor,saveLibrary:saveStoryLibraryFor,delete:deleteStoryRecordFor,dismissProposal:dismissStoryProposalFor};
    if(!Object.hasOwn(commands,body.action))fail();
    return json(await commands[body.action](owner,body.input));
  }catch(error){return refused(error);}
}
