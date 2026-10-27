import { storyPageContext } from '../../../../lib/story-page.js';
import { storyBookFor } from '../../../../lib/data/index.js';
import { t } from '../../../../lib/i18n/index.js';
import { StoryUnavailable } from '../../../story-unavailable.jsx';
import { BookReader } from '../../../story-reader.jsx';
import { ActionLink } from '../../../story-ui.jsx';
export const dynamic='force-dynamic';
export default async function Page({params,searchParams}) {const {owner,locale}=await storyPageContext();if(!owner)return <StoryUnavailable locale={locale}/>;const {id}=await params,query=await searchParams,record=await storyBookFor(owner,id,query?.edition??null);return record?<BookReader locale={locale} record={record}/>:<main className="story-unavailable"><h1>{t('story.notFound',locale)}</h1><ActionLink href="/">{t('story.back',locale)}</ActionLink></main>;}
