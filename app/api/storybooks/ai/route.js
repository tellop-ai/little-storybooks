import { storyOwner } from '../../../../lib/story-access.js';
import { dropBody, json, refused, readStoryJson } from '../../../../lib/story-http.js';
import { proposeStoryFor } from '../../../../lib/story-ai.js';
export const dynamic='force-dynamic';
export async function POST(request) {let owner;try{owner=await storyOwner();}catch(error){await dropBody(request);return refused(error);}try{return json(await proposeStoryFor(owner,await readStoryJson(request),request.signal));}catch(error){return refused(error);}}
