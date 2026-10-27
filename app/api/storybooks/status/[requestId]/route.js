import { storyOwner } from '../../../../../lib/story-access.js';
import { storyReceiptFor } from '../../../../../lib/data/index.js';
import { json, refused } from '../../../../../lib/story-http.js';
export const dynamic='force-dynamic';
export async function GET(request,{params}) {try{const who=storyOwner(),{requestId}=await params;const receipt=await storyReceiptFor(who,requestId);return json({result:receipt?.result??null});}catch(error){return refused(error);}}
