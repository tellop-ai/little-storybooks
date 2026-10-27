import { storyOwner } from './story-access.js';
import { storySettingsFor } from './data/index.js';
import { getLocale } from './i18n/index.js';
export async function storyPageContext() {try{const owner=storyOwner(),settings=await storySettingsFor(owner);return {owner,settings,locale:settings.interfaceLanguage};}catch(error){if(error?.messageKey==='story.onlineUnavailable')return {owner:null,settings:null,locale:getLocale()};throw error;}}
