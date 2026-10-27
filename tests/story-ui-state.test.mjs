import test from 'node:test';
import assert from 'node:assert/strict';
import { interactionLocked, libraryChoices, referenceChoices, canDrawPicture, photoAnalysisSource, acceptStoryWords } from '../lib/story-ui-state.js';

test('every pending or unknown operation and undecided proposal locks edits until resolved',()=>{
 assert.equal(interactionLocked(),false);
 for(const reason of ['saving','uploading','preparing','aiPending','aiUncertain']) {
  assert.equal(interactionLocked({[reason]:true}),true,reason);
  assert.equal(interactionLocked({[reason]:false}),false,reason);
 }
 assert.equal(interactionLocked({proposal:{kind:'story'}}),true);
 assert.equal(interactionLocked({proposal:null}),false);
 // Resolving AI does not unlock a save whose response is still unknown.
 assert.equal(interactionLocked({saving:true,aiPending:false,proposal:null}),true);
});

test('six removed characters stay visible and removable so a replacement can be selected',()=>{
 const snapshots=Array.from({length:6},(_,i)=>({id:`old-${i}`,name:`Person ${i}`}));
 const replacement={id:'new',name:'New person',photoFile:'live-photo'};
 let selected=snapshots.map(c=>c.id);
 let choices=libraryChoices([replacement],selected,snapshots);
 assert.equal(choices.length,7);
 assert.equal(choices.filter(c=>c.retained).length,6);
 selected=selected.filter(id=>id!==choices.find(c=>c.retained).id);
 selected.push(replacement.id);
 choices=libraryChoices([replacement],selected,snapshots);
 assert.equal(choices.filter(c=>selected.includes(c.id)).length,6);
 assert.equal(choices.some(c=>c.id==='old-0'),false);
 assert.equal(choices.find(c=>c.id==='new').photoFile,'live-photo');
});

test('saved selected names and memories show their stored snapshot, without a misleading live photo',()=>{
 const snapshots=[{id:'same',title:'Old memory',description:'Book words'},{id:'gone',title:'Removed memory'}];
 const choices=libraryChoices([{id:'same',title:'Changed memory',photoFile:'new-photo'}],['same','gone'],snapshots);
 assert.deepEqual(choices,[{...snapshots[0],retained:true},{...snapshots[1],retained:true}]);
 assert.deepEqual(libraryChoices([],[],snapshots),[]);
});

test('retained references remain explicit after library deletion or photo removal, and can be removed',()=>{
 const references=[{sourceCharacterId:'gone',characterName:'Saved name',referenceFile:'kept-photo'},{sourceCharacterId:'live',characterName:'Old name',referenceFile:'old-photo'}];
 const choices=referenceChoices([{id:'live',name:'Renamed',aiCopyFile:null},{id:'fresh',name:'New',aiCopyFile:'new-photo'}],['gone','live','fresh'],references);
 assert.deepEqual(choices.map(c=>[c.id,c.name,Boolean(c.retained)]),[['live','Old name',true],['fresh','New',false],['gone','Saved name',true]]);
 assert.deepEqual(referenceChoices([],[],references),[]);
 assert.equal(canDrawPicture({illustrationMode:'photo-reference',referenceIds:[]}),false);
 assert.equal(canDrawPicture({illustrationMode:'photo-reference',referenceIds:['gone']}),true);
 assert.equal(canDrawPicture({illustrationMode:'inspired',referenceIds:[]}),true);
 assert.equal(interactionLocked(),false,'missing references must never lock manual saving');
});

test('photo details bind to the saved photo, prepared copy and revision',()=>{
 const row={id:'one',revision:2,photoFile:'original',displayFile:'small',aiCopyFile:'small'};
 const photo={saved:'/api/storybooks/content/character/one?v=small'};
 const source=photoAnalysisSource(row,photo,null);
 assert.ok(source);
 for(const value of [null,{removed:true},{...photo,file:{}},{saved:'/api/storybooks/content/character/other?v=small'}])assert.equal(photoAnalysisSource(row,value,null),null);
 assert.equal(photoAnalysisSource(row,photo,{}),null,'newly prepared copy requires saving');
 assert.equal(photoAnalysisSource({...row,aiCopyFile:null},photo,null),null);
 assert.notEqual(photoAnalysisSource({...row,revision:3},photo,null),source);
 assert.notEqual(photoAnalysisSource({...row,aiCopyFile:'changed'},photo,null),source);
});

test('accepting proposed words preserves current options, accepted art, alt text and untouched original draft',()=>{
 const page={text:'Old words',sceneDescription:'Old scene',pictureFile:'accepted-art',pictureKind:'generated',pictureAlt:'Parent alt',aiText:false,aiPicture:true};
 const draft={title:'Old title',storyline:'Old line',instructions:'Latest parent instructions',dedication:'Latest dedication',referenceIds:['kept'],pages:[page]};
 const result=acceptStoryWords(draft,{title:'New title',storyline:'New line',pages:[{text:'New words',sceneDescription:'New scene',pictureFile:null}]});
 assert.equal(result.instructions,draft.instructions);
 assert.equal(result.dedication,draft.dedication);
 assert.deepEqual(result.referenceIds,['kept']);
 assert.deepEqual(result.pages[0],{...page,text:'New words',sceneDescription:'New scene',aiText:true});
 assert.equal(draft.pages[0].text,'Old words');
 assert.equal(result.aiText,true);
 assert.throws(()=>acceptStoryWords(draft,{pages:[]}),/story.aiMalformed/);
});
