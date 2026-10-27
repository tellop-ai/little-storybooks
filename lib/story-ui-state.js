/** UI state rules shared by the editor, library and their regression checks. */
export function interactionLocked({saving=false,uploading=false,preparing=false,aiPending=false,aiUncertain=false,proposal=null}={}) {
  return Boolean(saving||uploading||preparing||aiPending||aiUncertain||proposal);
}
export function libraryChoices(items,selected,snapshots=[]) {
  const live=new Set(items.map(item=>item.id)),saved=new Map(snapshots.map(item=>[item.id,item]));
  return [...items.map(item=>selected.includes(item.id)&&saved.has(item.id)?{...saved.get(item.id),retained:true}:item),...snapshots.filter(item=>selected.includes(item.id)&&!live.has(item.id)).map(item=>({...item,retained:true}))];
}
export function referenceChoices(characters,selectedCharacters,references=[]) {
  const retained=new Map(references.map(ref=>[ref.sourceCharacterId,ref]));
  const choices=characters.filter(c=>selectedCharacters.includes(c.id)&&(c.aiCopyFile||retained.has(c.id))).map(c=>retained.has(c.id)?{id:c.id,name:retained.get(c.id).characterName,retained:true}:c);
  for(const [id,ref] of retained)if(selectedCharacters.includes(id)&&!choices.some(c=>c.id===id))choices.push({id,name:ref.characterName,retained:true});
  return choices;
}
export function canDrawPicture(draft) {return draft.illustrationMode!=='photo-reference'||draft.referenceIds.length>0;}
export function photoAnalysisSource(row,photo,copy) {
  if(!row?.aiCopyFile||!photo?.saved||photo.file||photo.removed||copy)return null;
  if(!photo.saved.endsWith(`/${row.id}?v=${row.displayFile??row.photoFile}`))return null;
  return `${row.id}:${row.revision}:${row.photoFile}:${row.aiCopyFile}`;
}
/** The proposed words replace words only. Accepted art and current book options survive. */
export function acceptStoryWords(draft,content) {
  if(content.pages.length!==draft.pages.length)throw new Error('story.aiMalformed');
  return {...draft,title:content.title,storyline:content.storyline,aiText:true,pages:content.pages.map((page,index)=>({...draft.pages[index],text:page.text,sceneDescription:page.sceneDescription,aiText:true}))};
}
