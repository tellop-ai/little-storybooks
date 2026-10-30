import { storyPageContext } from '../../lib/story-page.js';
import { storyLibraryFor } from '../../lib/data/index.js';
import { StoryUnavailable } from '../story-unavailable.jsx';
import { LibraryView } from '../story-library.jsx';
export const dynamic='force-dynamic';
export default async function Page({searchParams}) {const {owner,locale,abilities,closed}=await storyPageContext();if(!owner)return <StoryUnavailable locale={locale} closed={closed}/>;const params=await searchParams;return <LibraryView kind="memory" locale={locale} canAdd={abilities.canAdd} canChange={abilities.canChange} library={await storyLibraryFor(owner,'memory',params?.before??null)}/>;}
