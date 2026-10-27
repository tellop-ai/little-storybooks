import { storyPageContext } from '../../lib/story-page.js';
import { storyLibraryFor } from '../../lib/data/index.js';
import { StoryUnavailable } from '../story-unavailable.jsx';
import { CreateView } from './create-view.jsx';
export const dynamic='force-dynamic';
export default async function Page() {const {owner,locale,settings}=await storyPageContext();if(!owner)return <StoryUnavailable locale={locale}/>;const characters=await storyLibraryFor(owner,'character'),memories=await storyLibraryFor(owner,'memory');return <CreateView locale={locale} settings={settings} characters={characters} memories={memories}/>;}
