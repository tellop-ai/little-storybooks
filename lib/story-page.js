import { storyVisitor } from './story-access.js';
import { storySettingsFor } from './data/index.js';
import { getLocale } from './i18n/index.js';
import { storyAbilities } from './story-roles.js';
/** Every page's start: the family whose books these are, its settings, and what the person may do
 * (`lib/story-roles.js`), read on the server for each visit. A visit the guard refuses (`storyVisitor`) gets
 * `closed` instead: the words to show (`wordsKey`) and `preview` while the owner looks as someone else; no record is
 * read. */
export async function storyPageContext() {try{const {owner,person}=await storyVisitor(),settings=await storySettingsFor(owner);return {owner,settings,locale:settings.interfaceLanguage,abilities:storyAbilities(person),closed:null};}catch(error){if(error?.closed===true)return {owner:null,settings:null,locale:getLocale(),abilities:null,closed:{preview:error.preview===true,wordsKey:error.messageKey}};throw error;}}
