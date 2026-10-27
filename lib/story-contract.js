import { DataError } from './data/refusal.js';
export const LIMITS = Object.freeze({ name: 60, title: 120, dedication: 400, instructions: 2000, source: 12000, text: 1500, scene: 1000 });
export function fail(key = 'story.invalid') { throw new DataError(key); }
export function object(value, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !keys.includes(key))) fail();
  return value;
}
export function text(value, max, required = false) {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim()) || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(value)) fail();
  return value.trim();
}
export function choice(value, choices) { if (!choices.includes(value)) fail(); return value; }
export function revision(value) { if (!Number.isSafeInteger(value) || value < 0 || value > 1000000) fail(); return value; }
export function identifier(value) { if (typeof value !== 'string' || !/^[a-zA-Z0-9-]{1,80}$/u.test(value)) fail(); return value; }
export function fileId(value) { if (value === null || value === undefined || value === '') return null; if (typeof value !== 'string' || !/^[a-f0-9]{64}$/u.test(value)) fail(); return value; }
export function ids(value, max = 6) { if (!Array.isArray(value) || value.length > max || new Set(value).size !== value.length) fail(); return value.map(identifier); }
export function validateStoryAnswer(answer, count) {
  object(answer, ['title','storyline','pages']);
  const title = text(answer.title, LIMITS.title, true), storyline = text(answer.storyline, LIMITS.scene, true);
  if (!Array.isArray(answer.pages) || answer.pages.length !== count) fail('story.aiMalformed');
  const pages = answer.pages.map(page => { object(page, ['text','sceneDescription']); return { text: text(page.text, LIMITS.text, true), sceneDescription: text(page.sceneDescription, LIMITS.scene, true) }; });
  return { title, storyline, pages };
}
export function validateDraft(input, { allowBlank = false } = {}) {
  object(input, ['title','name','language','readingBand','sourceKind','templateKey','sourceText','instructions','characterIds','memoryIds','referenceIds','illustrationMode','styleKey','characterGuide','storyline','dedication','pageCount','coverFile','coverKind','coverDescription','pages','aiText']);
  const draft = { title: text(input.title, LIMITS.title, true), name: text(input.name, LIMITS.name, true), language: choice(input.language, ['en','tr']), readingBand: choice(input.readingBand, ['3-5','6-8']), sourceKind: choice(input.sourceKind, ['template','idea','pasted','manual']), templateKey: choice(input.templateKey, ['moon','teddy','ocean','']), sourceText: text(input.sourceText, LIMITS.source), instructions: text(input.instructions, LIMITS.instructions), characterIds: ids(input.characterIds), memoryIds: ids(input.memoryIds), referenceIds: ids(input.referenceIds, 2), illustrationMode: choice(input.illustrationMode, ['inspired','photo-reference']), styleKey: choice(input.styleKey, ['watercolor','pencil','paper']), characterGuide: text(input.characterGuide, LIMITS.instructions), storyline: text(input.storyline, LIMITS.scene), dedication: text(input.dedication, LIMITS.dedication), pageCount: choice(input.pageCount, [6,8,12]), coverFile: fileId(input.coverFile), coverKind: choice(input.coverKind, ['none','photo','generated']), coverDescription: text(input.coverDescription, LIMITS.scene), aiText: input.aiText === true };
  if (typeof input.aiText !== 'boolean' || !Array.isArray(input.pages) || input.pages.length !== draft.pageCount || draft.referenceIds.some(id => !draft.characterIds.includes(id))) fail();
  if (Boolean(draft.coverFile) !== (draft.coverKind !== 'none')) fail();
  draft.pages = input.pages.map(page => {
    object(page, ['text','sceneDescription','pictureFile','pictureKind','pictureAlt','aiText','aiPicture']);
    const row = { text: text(page.text, LIMITS.text, !allowBlank), sceneDescription: text(page.sceneDescription, LIMITS.scene), pictureFile: fileId(page.pictureFile), pictureKind: choice(page.pictureKind, ['none','photo','generated']), pictureAlt: text(page.pictureAlt, LIMITS.scene), aiText: page.aiText === true, aiPicture: page.aiPicture === true };
    if (typeof page.aiText !== 'boolean' || typeof page.aiPicture !== 'boolean' || Boolean(row.pictureFile) !== (row.pictureKind !== 'none')) fail();
    return row;
  });
  return draft;
}
