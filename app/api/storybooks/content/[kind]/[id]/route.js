import { storyOwner } from '../../../../../../lib/story-access.js';
import { storyContentFor } from '../../../../../../lib/data/index.js';
import { fileResponse } from '../../../../../../lib/data/files.js';
import { refused } from '../../../../../../lib/story-http.js';
export const dynamic='force-dynamic';
export async function GET(request,{params}) {try{const who=storyOwner(),{kind,id}=await params;return await fileResponse(await storyContentFor(who,kind,id,new URL(request.url).searchParams.get('variant')??'display'),request);}catch(error){return refused(error);}}
