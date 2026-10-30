import { storyOwner } from '../../../../../lib/story-access.js';
import { storyLibraryFor } from '../../../../../lib/data/index.js';
import { json,refused } from '../../../../../lib/story-http.js';
export const dynamic='force-dynamic';
export async function GET(request,{params}) {try{const who=await storyOwner(),{kind}=await params;return json(await storyLibraryFor(who,kind,new URL(request.url).searchParams.get('before')));}catch(error){return refused(error);}}
