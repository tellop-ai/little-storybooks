import { t } from './i18n/index.js';
import { DataError } from './data/refusal.js';
export function emptyPage() { return {text:'',sceneDescription:'',pictureFile:null,pictureKind:'none',pictureAlt:'',aiText:false,aiPicture:false}; }
export function newDraft(settings) {return {title:'',name:'',language:settings.defaultStoryLanguage,readingBand:'3-5',sourceKind:'template',templateKey:'moon',sourceText:'',instructions:'',characterIds:[],memoryIds:[],referenceIds:[],illustrationMode:settings.defaultIllustrationMode,styleKey:'watercolor',characterGuide:'',storyline:'',dedication:'',pageCount:6,coverFile:null,coverKind:'none',coverDescription:'',aiText:false,pages:Array.from({length:6},emptyPage)};}
/** Twelve authored beats form complete six/eight/twelve page editions without AI. */
export function templateDraft(draft) {
  const key=draft.templateKey,locale=draft.language,values={name:draft.name};
  const lengths=draft.pageCount===6?[2,2,2,2,2,2]:draft.pageCount===8?[2,2,2,2,1,1,1,1]:Array(12).fill(1);let at=0;
  const pages=lengths.map(length=>{const start=at;at+=length;return {...emptyPage(),text:Array.from({length},(_,i)=>t(`story.template.${key}.${start+i}.text`,locale,values)).join('\n\n'),sceneDescription:t(`story.template.${key}.${at-1}.scene`,locale,values)};});
  return {...draft,title:t(`story.template.${key}`,locale,values),storyline:t(`story.template.${key}.line`,locale),aiText:false,pages};
}
/** Keep all supplied characters. Split only at whitespace; never shorten a story silently. */
export function manualDraft(draft) {
  const source=draft.sourceText.trim();if(source.length>draft.pageCount*1500)throw new DataError('story.splitLong');
  let remaining=source;const pages=[];
  for(let i=0;i<draft.pageCount;i++) {
    const left=draft.pageCount-i;let cut=remaining.length;
    if(left>1){const target=Math.ceil(remaining.length/left);const whitespace=remaining.slice(target,1501).search(/\s/u);cut=whitespace>=0?target+whitespace:Math.min(1500,remaining.length);}
    const chunk=remaining.slice(0,cut);if(chunk.length>1500)throw new DataError('story.splitLong');pages.push({...emptyPage(),text:chunk.trim()});remaining=remaining.slice(cut).trimStart();
  }
  if(remaining)throw new DataError('story.splitLong');
  return {...draft,pages,aiText:false};
}
export function draftFromBook(record) {
  const e=record.edition,characters=JSON.parse(e.charactersJson).items,memories=JSON.parse(e.memoriesJson).items;
  return {title:e.title,name:e.recipientName,language:e.language,readingBand:e.readingBand,sourceKind:e.sourceKind,templateKey:e.templateKey,sourceText:e.sourceText,instructions:e.instructions,characterIds:characters.map(c=>c.id),memoryIds:memories.map(m=>m.id),referenceIds:record.references.map(r=>r.sourceCharacterId).filter(Boolean),illustrationMode:e.illustrationMode,styleKey:e.styleKey,characterGuide:e.characterGuide,storyline:e.storyline,dedication:e.dedication,pageCount:e.pageCount,coverFile:e.coverFile,coverKind:e.coverKind,coverDescription:e.coverDescription,aiText:e.aiText,pages:record.pages.map(({text,sceneDescription,pictureFile,pictureKind,pictureAlt,aiText,aiPicture})=>({text,sceneDescription,pictureFile,pictureKind,pictureAlt,aiText,aiPicture}))};
}
