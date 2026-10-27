import { DataError } from './data/refusal.js';
export function json(value,status=200) { return Response.json(value,{status,headers:{'cache-control':'no-store'}}); }
export function refused(error) { const problem=error?.wordsKey??error?.messageKey??'error.saveFailed';return json({problem},problem==='story.onlineUnavailable'?403:problem==='error.notFound'?404:problem==='story.conflict'?409:400); }
export async function readStoryJson(request) {
  if(!request.headers.get('content-type')?.startsWith('application/json'))throw new DataError('story.invalid');
  const reader=request.body?.getReader();if(!reader)throw new DataError('story.invalid');let size=0;const chunks=[];
  try{for(;;){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>800000){await reader.cancel();throw new DataError('story.invalid');}chunks.push(value);}}
  finally{reader.releaseLock();}
  try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new DataError('story.invalid');}
}
