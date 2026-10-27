import { storyPageContext } from '../../../lib/story-page.js';
import { storyBookFor,storyEditionsFor,storyLibraryFor } from '../../../lib/data/index.js';
import { t } from '../../../lib/i18n/index.js';
import { StoryUnavailable } from '../../story-unavailable.jsx';
import { BookEditor } from '../../story-editor.jsx';
import { ActionLink } from '../../story-ui.jsx';
export const dynamic='force-dynamic';
export default async function Page({params,searchParams}) {
 const {owner,locale}=await storyPageContext();if(!owner)return <StoryUnavailable locale={locale}/>;
 const {id}=await params,query=await searchParams,record=await storyBookFor(owner,id,query?.edition??null);if(!record)return <main className="story-unavailable"><h1>{t('story.notFound',locale)}</h1><ActionLink href="/">{t('story.back',locale)}</ActionLink></main>;
 const editions=await storyEditionsFor(owner,id,query?.versionsBefore?Number(query.versionsBefore):null),characters=await storyLibraryFor(owner,'character'),memories=await storyLibraryFor(owner,'memory');
 return <BookEditor key={record.edition.id} locale={locale} record={record} characters={characters.items} memories={memories.items} characterCursor={characters.next} memoryCursor={memories.next} editions={editions}/>;
}
