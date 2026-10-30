import { createHash, randomUUID } from 'node:crypto';
import { modelAction as recordsAction, modelBatch } from './index.js';
import { DataError } from './refusal.js';
import { fileFacts, readPicture } from './files.js';
import { choice, fail, fileId, identifier, object, revision, text, validateDraft } from '../story-contract.js';
/** The private records decoder deliberately returns null-prototype objects.
 * App reads expose plain scalar DTOs so React can pass them to client components.
 * The trusted records decoder and its validation stay unchanged. */
function pageValue(value) {
  if (Array.isArray(value)) return value.map(pageValue);
  if (value !== null && typeof value === 'object')
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, pageValue(item)]));
  return value;
}
async function modelAction(model, action, args) {
  return pageValue(await recordsAction(model, action, args));
}
const select = keys => Object.fromEntries(keys.split(' ').map(k => [k,true]));
const BOOK = select('id title primaryCharacterName status activeEditionId revision updatedAt');
const CHARACTER = select('id name role readingBand interests appearance photoFile displayFile aiCopyFile revision updatedAt');
const MEMORY = select('id title description photoFile displayFile aiCopyFile revision updatedAt');
const EDITION = select('id bookId editionNumber recipientName title language readingBand sourceKind templateKey sourceText instructions charactersJson memoriesJson illustrationMode styleKey characterGuide storyline dedication pageCount coverFile coverKind coverDescription aiText reviewedAt revision');
const PAGE = select('id position text sceneDescription pictureFile pictureKind pictureAlt aiText aiPicture revision');
const REFERENCE = select('id position characterName sourceCharacterId description sourceFile referenceFile');
const PROPOSAL = select('id requestId fingerprint kind state bookId editionId pagePosition expectedRevision contentJson pictureFile problem');
const owner = value => text(value, 80, true);
const now = () => new Date().toISOString();
const fingerprint = payload => createHash('sha256').update(JSON.stringify(payload)).digest('hex');
const requestKey = (who, requestId) => createHash('sha256').update(`${who}:${identifier(requestId)}`).digest('hex');
function mutation(input) { identifier(input.requestId); revision(input.expectedRevision); }
/** The kit's refusals a save shows as they are (`lib/data/index.js`), never as a newer save or an unconfirmed one. */
const HOST_WORDS = new Set(['error.saveUnconfirmed','error.cannotChange','error.saveRefused']);
const step = (model, action, args) => ({ model, action, args });
export const DEFAULT_SETTINGS = Object.freeze({ id: null, revision: 0, interfaceLanguage: 'en', defaultStoryLanguage: 'en', defaultIllustrationMode: 'inspired' });
export async function storySettingsFor(who) { return await modelAction('StorySettings','findFirst',{where:{ownerId:owner(who)},select:select('id revision interfaceLanguage defaultStoryLanguage defaultIllustrationMode')}) ?? {...DEFAULT_SETTINGS}; }
export async function storyReceiptFor(who, requestId) { const row = await modelAction('StoryReceipt','findFirst',{where:{ownerId:owner(who),requestId:identifier(requestId)},select:select('fingerprint resultJson')}); return row ? {fingerprint:row.fingerprint,result:JSON.parse(row.resultJson)} : null; }
async function replay(who, input) { const saved = await storyReceiptFor(who,input.requestId); if (saved && saved.fingerprint !== fingerprint(input)) fail('story.requestChanged'); return saved?.result ?? null; }
async function commit(who,input,steps,result) {
  steps.push(step('StoryReceipt','create',{data:{id:requestKey(who,input.requestId),ownerId:who,requestId:input.requestId,fingerprint:fingerprint(input),resultJson:JSON.stringify(result),createdAt:now()},select:{id:true}}));
  try { await modelBatch(steps); return result; }
  catch (error) {
    // A lost response and a simultaneous replay both inspect the receipt. Neither resubmits a write.
    const saved = await replay(who,input); if (saved) return saved;
    // The host's own words for a refused change (a Viewer's save, a Member's change of another person's record)
    // and an unconfirmed save pass on as they are: neither is a newer save.
    if (HOST_WORDS.has(error?.messageKey)) throw error;
    throw new DataError('story.conflict');
  }
}
export async function saveStorySettingsFor(who,input) {
  owner(who); object(input,['requestId','expectedRevision','interfaceLanguage','defaultStoryLanguage','defaultIllustrationMode']); mutation(input);
  const prior = await replay(who,input); if(prior) return prior;
  const data={interfaceLanguage:choice(input.interfaceLanguage,['en','tr']),defaultStoryLanguage:choice(input.defaultStoryLanguage,['en','tr']),defaultIllustrationMode:choice(input.defaultIllustrationMode,['inspired','photo-reference']),revision:input.expectedRevision+1,updatedAt:now()};
  const current=await storySettingsFor(who), id=current.id ?? randomUUID();
  const change=input.expectedRevision===0 ? step('StorySettings','create',{data:{...data,id,ownerId:who,createdAt:now()},select:{id:true}}) : step('StorySettings','update',{where:{id,ownerId:who,revision:input.expectedRevision},data,select:{id:true}});
  return commit(who,input,[change],{id,revision:data.revision});
}
export async function registerStoryAssetFor(who,file) {
  owner(who); fileId(file); const id=fingerprint({who,file});
  // Read first and only add: a person who may only add (online, a Member) never writes to a note someone else added.
  const held=async()=>Boolean(await modelAction('StoryAsset','findFirst',{where:{id,ownerId:who},select:{id:true}}));
  if(await held())return;
  try { await modelAction('StoryAsset','create',{data:{id,ownerId:who,file,createdAt:now()},select:{id:true}}); }
  catch(error) { if(await held())return; throw error; }
}
export async function requireStoryAssetsFor(who,files) {
  const unique=[...new Set(files.filter(Boolean))]; if(!unique.length)return;
  unique.forEach(fileId); if(unique.length>32)fail();
  const owned=await modelAction('StoryAsset','findMany',{where:{ownerId:owner(who),file:{in:unique}},take:32,select:{file:true}});
  if(owned.length!==unique.length)fail('story.photoMissing');
  // Sequential lookups also keep the host's in-flight request ceiling.
  for(const file of unique) { const facts=await fileFacts(file); if(!facts || facts.shows!=='picture')fail('story.photoMissing'); }
}
function library(kind) { return choice(kind,['character','memory'])==='character' ? {model:'StoryCharacter',fields:CHARACTER} : {model:'StoryMemory',fields:MEMORY}; }
export async function storyLibraryFor(who,kind,before=null) {
  const {model,fields}=library(kind); if(before!==null)identifier(before);
  const rows=await modelAction(model,'findMany',{where:{ownerId:owner(who),...(before?{id:{lt:before}}:{})},orderBy:{id:'desc'},take:21,select:fields});
  return {items:rows.slice(0,20),next:rows.length>20?rows[19].id:null};
}
export async function storyLibraryItemFor(who,kind,id) { const {model,fields}=library(kind); return modelAction(model,'findFirst',{where:{ownerId:owner(who),id:identifier(id)},select:fields}); }
export async function saveStoryLibraryFor(who,input) {
  owner(who); object(input,['requestId','expectedRevision','kind','id','fields']); mutation(input); const {model}=library(input.kind);
  const prior=await replay(who,input); if(prior)return prior;
  const f=input.fields; object(f,input.kind==='character'?['name','role','readingBand','interests','appearance','photoFile','displayFile','aiCopyFile']:['title','description','photoFile','displayFile','aiCopyFile']);
  const data=input.kind==='character'?{name:text(f.name,60,true),role:choice(f.role,['child','parent','family','pet','other']),readingBand:choice(f.readingBand,['3-5','6-8']),interests:text(f.interests,1000),appearance:text(f.appearance,1000)}:{title:text(f.title,120,true),description:text(f.description,1000)};
  const previous=input.id!==null?await storyLibraryItemFor(who,input.kind,input.id):null;
  for(const field of ['photoFile','displayFile','aiCopyFile']){
    if(!Object.hasOwn(f,field)){data[field]=previous?.[field]??null;continue;}
    const digest=fileId(f[field]);
    const form=new FormData();form.set(field,digest??'remove');const picture=await readPicture(form,field);if(picture.problem)fail(picture.problem);data[field]=picture.change==='remove'?null:picture.file;
  }
  if(!data.photoFile && (data.displayFile || data.aiCopyFile))fail();
  await requireStoryAssetsFor(who,[data.photoFile,data.displayFile,data.aiCopyFile]);
  if(data.aiCopyFile) { const facts=await fileFacts(data.aiCopyFile); if(facts.kind!=='webp'||facts.size>512*1024)fail('story.copyFailed'); }
  const id=input.id===null?randomUUID():identifier(input.id); data.updatedAt=now();data.revision=input.expectedRevision+1;
  const change=input.id===null?step(model,'create',{data:{...data,id,ownerId:who,createdAt:now()},select:{id:true}}):step(model,'update',{where:{id,ownerId:who,revision:input.expectedRevision},data,select:{id:true}});
  if(input.id===null && input.expectedRevision!==0)fail();
  return commit(who,input,[change],{id,revision:data.revision});
}
export async function deleteStoryRecordFor(who,input) {
  owner(who); object(input,['requestId','expectedRevision','kind','id']); mutation(input); const id=identifier(input.id);
  const model=input.kind==='book'?'StoryBook':library(input.kind).model;
  const prior=await replay(who,input);if(prior)return prior;
  return commit(who,input,[step(model,'delete',{where:{id,ownerId:who,revision:input.expectedRevision},select:{id:true}})],{id,removed:true});
}
export async function storyShelfFor(who,before=null) {
  if(before!==null)identifier(before);
  const rows=await modelAction('StoryBook','findMany',{where:{ownerId:owner(who),...(before?{id:{lt:before}}:{})},orderBy:{id:'desc'},take:13,select:BOOK});
  const editionIds=rows.slice(0,12).map(row=>row.activeEditionId).filter(Boolean);
  const editions=editionIds.length?await modelAction('StoryEdition','findMany',{where:{ownerId:who,id:{in:editionIds}},take:12,select:select('id language coverFile')}):[];
  return {items:rows.slice(0,12).map(row=>({...row,...{language:editions.find(e=>e.id===row.activeEditionId)?.language??'en',coverFile:editions.find(e=>e.id===row.activeEditionId)?.coverFile??null}})),next:rows.length>12?rows[11].id:null};
}
export async function storyBookFor(who,id,editionId=null) {
  const book=await modelAction('StoryBook','findFirst',{where:{id:identifier(id),ownerId:owner(who)},select:BOOK});if(!book)return null;
  const edition=await modelAction('StoryEdition','findFirst',{where:{id:editionId===null?book.activeEditionId:identifier(editionId),ownerId:who,bookId:book.id},select:EDITION});if(!edition)return null;
  const pages=await modelAction('StoryPage','findMany',{where:{ownerId:who,editionId:edition.id},orderBy:{position:'asc'},take:12,select:PAGE});
  const references=await modelAction('StoryReference','findMany',{where:{ownerId:who,editionId:edition.id},orderBy:{position:'asc'},take:2,select:REFERENCE});
  return {book,edition,pages,references};
}
export async function storyEditionsFor(who,bookId,before=null) {
  if(before!==null)revision(before);
  const rows=await modelAction('StoryEdition','findMany',{where:{ownerId:owner(who),bookId:identifier(bookId),...(before?{editionNumber:{lt:before}}:{})},orderBy:{editionNumber:'desc'},take:21,select:select('id editionNumber title language reviewedAt')});
  return {items:rows.slice(0,20),next:rows.length>20?rows[19].editionNumber:null};
}
export async function storyContextFor(who,draft) {
  const characters=draft.characterIds.length?await modelAction('StoryCharacter','findMany',{where:{ownerId:owner(who),id:{in:draft.characterIds}},take:6,select:CHARACTER}):[];
  const memories=draft.memoryIds.length?await modelAction('StoryMemory','findMany',{where:{ownerId:owner(who),id:{in:draft.memoryIds}},take:6,select:MEMORY}):[];
  if(characters.length!==draft.characterIds.length||memories.length!==draft.memoryIds.length)fail('story.selectionMissing');
  return {characters,memories};
}
export async function storySnapshotContextFor(who,draft,base=null) {
  if(!base)return storyContextFor(who,draft);
  const oldCharacters=JSON.parse(base.edition.charactersJson).items,oldMemories=JSON.parse(base.edition.memoriesJson).items;
  const fresh=await storyContextFor(who,{characterIds:draft.characterIds.filter(id=>!oldCharacters.some(c=>c.id===id)),memoryIds:draft.memoryIds.filter(id=>!oldMemories.some(m=>m.id===id))});
  return {characters:draft.characterIds.map(id=>oldCharacters.find(c=>c.id===id)??fresh.characters.find(c=>c.id===id)),memories:draft.memoryIds.map(id=>oldMemories.find(m=>m.id===id)??fresh.memories.find(m=>m.id===id))};
}
export async function saveStoryBookFor(who,input) {
  owner(who); object(input,['requestId','expectedRevision','bookId','baseEditionId','draft','reviewed']);mutation(input);if(typeof input.reviewed!=='boolean')fail();
  const prior=await replay(who,input);if(prior)return prior;
  const draft=validateDraft(input.draft,{allowBlank:!input.reviewed}); const id=input.bookId===null?randomUUID():identifier(input.bookId);
  let base=null;
  if(input.bookId!==null){base=await storyBookFor(who,id,input.baseEditionId);if(!base)fail('error.notFound');}
  else if(input.expectedRevision!==0||input.baseEditionId!==null)fail();
  // Existing snapshots are preserved during edits, including after a library entry is removed.
  const context=await storySnapshotContextFor(who,draft,base);
  const held=base?.references??[];
  const missing=draft.referenceIds.filter(id=>!held.some(r=>r.sourceCharacterId===id));
  const referenceCharacters=missing.length?await modelAction('StoryCharacter','findMany',{where:{ownerId:who,id:{in:missing}},take:2,select:CHARACTER}):[];
  if(referenceCharacters.length!==missing.length)fail('story.referencesNeeded');
  const refs=draft.referenceIds.map(id=>held.find(r=>r.sourceCharacterId===id)??referenceCharacters.filter(c=>c.id===id).map(c=>({sourceCharacterId:c.id,characterName:c.name,description:c.appearance,sourceFile:c.photoFile,referenceFile:c.aiCopyFile}))[0]);
  if(refs.some(r=>!r.referenceFile))fail('story.referencesNeeded');
  await requireStoryAssetsFor(who,[draft.coverFile,...draft.pages.map(p=>p.pictureFile),...refs.flatMap(r=>[r.sourceFile,r.referenceFile])]);
  const editionId=randomUUID(), stamp=now(), editionNumber=input.expectedRevision+1;
  const plainCharacters=context.characters.map(c=>({id:c.id,name:c.name,role:c.role,readingBand:c.readingBand,interests:c.interests,appearance:c.appearance}));
  const plainMemories=context.memories.map(m=>({id:m.id,title:m.title,description:m.description}));
  const edition={id:editionId,ownerId:who,bookId:id,editionNumber,recipientName:draft.name,title:draft.title,language:draft.language,readingBand:draft.readingBand,sourceKind:draft.sourceKind,templateKey:draft.templateKey,sourceText:draft.sourceText,instructions:draft.instructions,charactersJson:JSON.stringify({version:1,items:plainCharacters}),memoriesJson:JSON.stringify({version:1,items:plainMemories}),illustrationMode:draft.illustrationMode,styleKey:draft.styleKey,characterGuide:draft.characterGuide,storyline:draft.storyline,dedication:draft.dedication,pageCount:draft.pageCount,coverFile:draft.coverFile,coverKind:draft.coverKind,coverDescription:draft.coverDescription,aiText:draft.aiText,reviewedAt:input.reviewed?stamp:null,revision:1,createdAt:stamp,updatedAt:stamp};
  const bookData={title:draft.title,primaryCharacterName:draft.name,status:input.reviewed?'ready':'draft',activeEditionId:editionId,revision:editionNumber,updatedAt:stamp};
  const steps=[input.bookId===null?step('StoryBook','create',{data:{...bookData,id,ownerId:who,createdAt:stamp},select:{id:true}}):step('StoryBook','update',{where:{id,ownerId:who,revision:input.expectedRevision},data:bookData,select:{id:true}}),step('StoryEdition','create',{data:edition,select:{id:true}}),...draft.pages.map((p,position)=>step('StoryPage','create',{data:{...p,id:randomUUID(),ownerId:who,editionId,position,revision:1,createdAt:stamp,updatedAt:stamp},select:{id:true}})),...refs.map((r,position)=>step('StoryReference','create',{data:{id:randomUUID(),ownerId:who,editionId,position,characterName:r.characterName,sourceCharacterId:r.sourceCharacterId,description:r.description,sourceFile:r.sourceFile,referenceFile:r.referenceFile,createdAt:stamp},select:{id:true}}))];
  return commit(who,input,steps,{id,editionId,revision:editionNumber});
}
export async function storyContentFor(who,kind,id,variant='display') {
  choice(variant,['display','reference','original']);
  if(kind==='character'||kind==='memory'){const row=await storyLibraryItemFor(who,kind,id);return variant==='reference'?row?.aiCopyFile??null:variant==='original'?row?.photoFile??null:row?.displayFile??row?.photoFile??null;}
  if(kind==='proposal'){const proposal=await readStoryProposal(who,id);return proposal?.state==='ready'?proposal.pictureFile??null:null;}
  const model=kind==='page'?'StoryPage':kind==='cover'?'StoryEdition':null;if(!model)fail();
  const field=kind==='cover'?'coverFile':'pictureFile';
  const row=await modelAction(model,'findFirst',{where:{ownerId:owner(who),id:identifier(id),...(kind==='proposal'?{state:'ready'}:{})},select:{[field]:true}});return row?.[field]??null;
}
const SOURCE = Object.freeze({book:{model:'StoryBook',field:'sourceBookId'},character:{model:'StoryCharacter',field:'sourceCharacterId'},memory:{model:'StoryMemory',field:'sourceMemoryId'}});
const retiredProposal = proposal => ({...proposal,state:'dismissed',contentJson:'null',pictureFile:null,problem:null});
function sourceGuard(who,kind,id,expectedRevision) {
  const source=SOURCE[kind];if(!source)fail();
  return step(source.model,'update',{where:{id:identifier(id),ownerId:owner(who),...(expectedRevision===undefined?{}:{revision:expectedRevision})},data:{id},select:{id:true}});
}
async function readStoryProposal(who,id) {
  const proposal=await modelAction('StoryProposal','findFirst',{where:{ownerId:owner(who),id:identifier(id)},select:PROPOSAL});
  if(!proposal)return null;
  const source=await modelAction('StoryProposalSource','findFirst',{where:{ownerId:who,id:proposal.id},select:select('sourceKind sourceBookId sourceCharacterId sourceMemoryId')});
  if(source)Object.assign(proposal,source);
  // SetNull runs in the same deletion as the source. Keep the request fingerprint
  // as a tombstone, while every reader refuses its former words and file.
  // Old suggestions have no reliable source links. Retire them conservatively;
  // accepted editions and their photos are independent snapshots.
  if(!source || (proposal.sourceKind!=='none' && !proposal[SOURCE[proposal.sourceKind]?.field]))return retiredProposal(proposal);
  return proposal;
}
export async function storyProposalFor(who,id) {
  const proposal=await readStoryProposal(who,id);
  if(proposal?.state==='ready'&&proposal.kind==='story'){
    const pages=await modelAction('StoryProposalPage','findMany',{where:{ownerId:who,proposalId:proposal.id},orderBy:{position:'asc'},take:12,select:{text:true,sceneDescription:true}});
    if(pages.length)proposal.contentJson=JSON.stringify({...JSON.parse(proposal.contentJson),pages});
  }
  return proposal;
}
export async function replayStoryProposalFor(who,input) {
  const found=await storyProposalFor(owner(who),requestKey(who,input.requestId));
  if(found&&found.fingerprint!==fingerprint(input))fail('story.requestChanged');
  return found;
}
export async function claimStoryProposalFor(who,input,meta={}) {
  owner(who);identifier(input.requestId);const mark=fingerprint(input),id=requestKey(who,input.requestId);
  const existing=await storyProposalFor(who,id);if(existing){if(existing.fingerprint!==mark)fail('story.requestChanged');return {fresh:false,proposal:existing};}
  const sourceKind=meta.sourceKind??null,source=sourceKind?SOURCE[sourceKind]:null;
  if(sourceKind&&!source)fail();
  const steps=source?[sourceGuard(who,sourceKind,meta.sourceId,input.expectedRevision)]:[];
  steps.push(step('StoryProposal','create',{data:{id,ownerId:who,requestId:input.requestId,fingerprint:mark,kind:input.kind,state:'running',bookId:meta.bookId??null,editionId:meta.editionId??null,pagePosition:meta.pagePosition??null,expectedRevision:input.expectedRevision,contentJson:'',createdAt:now()},select:{id:true}}));
  steps.push(step('StoryProposalSource','create',{data:{id,ownerId:who,sourceKind:sourceKind??'none',...(source?{[source.field]:identifier(meta.sourceId)}:{})},select:{id:true}}));
  try{await modelBatch(steps);}
  catch(error) { const found=await storyProposalFor(who,id);if(found){if(found.fingerprint!==mark)fail('story.requestChanged');return {fresh:false,proposal:found};}if(HOST_WORDS.has(error?.messageKey))throw error;throw new DataError('error.saveUnconfirmed'); }
  return {fresh:true,proposal:{id}};
}
export async function finishStoryProposalFor(who,id,result) {
  const current=await readStoryProposal(who,id);if(!current)fail('error.notFound');
  if(current.state!=='running')return storyProposalFor(who,id);
  const source=SOURCE[current.sourceKind],steps=source?[sourceGuard(who,current.sourceKind,current[source.field])]:[];
  const content=result.content??null,pages=current.kind==='story'&&content?content.pages:[];
  // Each page is its own bounded scalar pair. Never store a whole book in one
  // scalar: twelve valid multilingual pages can exceed the host's 48 KiB cap.
  const header=pages?.length?{title:content.title,storyline:content.storyline}:content;
  steps.push(step('StoryProposal','update',{where:{id:identifier(id),ownerId:owner(who),state:'running'},data:{state:result.problem?'failed':'ready',contentJson:JSON.stringify(header),pictureFile:result.pictureFile??null,problem:result.problem??null},select:{id:true}}));
  for(const [position,page]of (pages??[]).entries())steps.push(step('StoryProposalPage','create',{data:{id:randomUUID(),ownerId:who,proposalId:id,position,text:page.text,sceneDescription:page.sceneDescription},select:{id:true}}));
  try{await modelBatch(steps);}
  catch(error){const latest=await readStoryProposal(who,id);if(latest?.state==='dismissed')return latest;throw error;}
  return storyProposalFor(who,id);
}

/** Dismiss only this owned proposal. Its named file is ineligible for the kit's fresh-unused-file discard.
 * Keep the ownership receipt: an accepted edition or another proposal may still use the same bytes. */
export async function dismissStoryProposalFor(who,input) {
  owner(who);object(input,['requestId','expectedRevision','id']);mutation(input);const id=identifier(input.id);
  const prior=await replay(who,input);if(prior)return prior;
  return commit(who,input,[step('StoryProposalPage','deleteMany',{where:{ownerId:who,proposalId:id}}),step('StoryProposal','update',{where:{id,ownerId:who,expectedRevision:input.expectedRevision,state:'ready'},data:{state:'dismissed',contentJson:'null',pictureFile:null,problem:null},select:{id:true}})],{id,dismissed:true});
}
