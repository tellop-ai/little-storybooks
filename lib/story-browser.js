import { appendPicture, sendFile, PictureProblem } from './send-file.js';
/** The app's own file address (`app/api/storybooks/files/route.js`): it keeps the file and notes it as the family's,
 * which every save that names a file requires. Every file this app's pages send goes here, never to the kit's
 * `/api/files`, whose files no record can name. */
export const STORY_FILE_ADDRESS='/api/storybooks/files';
/** Keeps one file at the app's own address; answers what `sendFile` answers. */
export async function sendStoryFile(file) {return sendFile(file,{address:STORY_FILE_ADDRESS});}
export function contentAddress(kind,id,file) {return `/api/storybooks/content/${kind}/${id}?v=${file??''}`;}
/** The original upload is untouched. Each explicitly requested AI/display copy is measured before upload. */
export async function referenceCopy(file) {
  let image;
  try { image=await createImageBitmap(file,{imageOrientation:'from-image'}); }
  catch { throw new PictureProblem('story.copyFailed'); }
  try {
    if(!image.width||!image.height)throw new PictureProblem('story.copyFailed');
    for(const side of [1024,768,512,384]) {
      const scale=Math.min(1,side/Math.max(image.width,image.height));const canvas=document.createElement('canvas');
      canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));
      const ctx=canvas.getContext('2d');if(!ctx)throw new PictureProblem('story.copyFailed');ctx.drawImage(image,0,0,canvas.width,canvas.height);
      for(const quality of [.85,.65,.45]) {
        const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',quality));
        if(blob?.type==='image/webp'&&blob.size>0&&blob.size<=512*1024&&canvas.width<=1024&&canvas.height<=1024)return new File([blob],'story-reference.webp',{type:'image/webp'});
      }
    }
    throw new PictureProblem('story.copyFailed');
  }finally{image.close?.();}
}
export async function uploadedPicture(value) {
  const form=new FormData();await appendPicture(form,'photo',value,{address:STORY_FILE_ADDRESS});
  if(form.get('photo')==='remove')return null;
  return form.get('photo')??undefined;
}
export async function uploadReference(file) {return (await sendStoryFile(await referenceCopy(file))).file;}
export async function base64OfBlob(blob) {const bytes=new Uint8Array(await blob.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(binary);}
