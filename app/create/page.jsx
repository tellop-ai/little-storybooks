import { storyPageContext } from '../../lib/story-page.js';
import { storyLibraryFor } from '../../lib/data/index.js';
import { t } from '../../lib/i18n/index.js';
import { StoryUnavailable } from '../story-unavailable.jsx';
import { StoryReadOnly } from '../story-read-only.jsx';
import { CreateView } from './create-view.jsx';
export const dynamic='force-dynamic';
export default async function Page() {const {owner,locale,settings,abilities,closed}=await storyPageContext();if(!owner)return <StoryUnavailable locale={locale} closed={closed}/>;if(!abilities.canAdd)return <StoryReadOnly locale={locale} path="/create" title={t('story.create',locale)} wordsKey="story.createNotOpen" links={[['/','story.back']]}/>;const characters=await storyLibraryFor(owner,'character'),memories=await storyLibraryFor(owner,'memory');return <CreateView locale={locale} settings={settings} characters={characters} memories={memories} canChange={abilities.canChange}/>;}
