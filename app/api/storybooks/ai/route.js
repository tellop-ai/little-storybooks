import { storyOwner } from '../../../../lib/story-access.js';
import { json, refused, readStoryJson } from '../../../../lib/story-http.js';
import { proposeStoryFor } from '../../../../lib/story-ai.js';
export const dynamic='force-dynamic';
export async function POST(request) {try{return json(await proposeStoryFor(storyOwner(),await readStoryJson(request),request.signal));}catch(error){return refused(error);}}
