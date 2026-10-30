import { PageFrame } from '@/components/ui/page-frame';
import { CountsLine } from '@/components/ui/counts-line';
import { storyPageContext } from '../lib/story-page.js';
import { storyShelfFor } from '../lib/data/index.js';
import { t } from '../lib/i18n/index.js';
import { StoryHeader, ActionLink, Placeholder } from './story-ui.jsx';
import { StoryUnavailable } from './story-unavailable.jsx';
import { contentAddress } from '../lib/story-browser.js';
export const dynamic='force-dynamic';
export default async function Page({searchParams}) {
 const {owner,locale,abilities,closed}=await storyPageContext();if(!owner)return <StoryUnavailable locale={locale} closed={closed}/>;
 const params=await searchParams,before=typeof params?.before==='string'?params.before:null;const shelf=await storyShelfFor(owner,before);
 return <div data-tellop-app-marker="ok"><StoryHeader locale={locale} path="/"/><PageFrame title={t('story.shelf',locale)} description={t('app.tagline',locale)} locale={locale} actions={abilities.canAdd?<ActionLink href="/create" primary>{t('story.create',locale)}</ActionLink>:null} counts={<CountsLine items={[{label:t('story.loadedBooks',locale),value:shelf.items.length}]}/>}>{shelf.items.length?<div className="story-shelf">{shelf.items.map(book=><article className="story-book-card" key={book.id}><a href={`/books/${book.id}/read`} className="story-book-cover">{book.coverFile?<img src={contentAddress('cover',book.activeEditionId,book.coverFile)} alt=""/>:<Placeholder locale={locale}/>}<h2>{book.title}</h2><p>{t('story.forName',locale,{name:book.primaryCharacterName})}</p></a><div className="story-card-details"><span className="story-muted">{t(`story.${book.language}`,locale)} · {t(`story.${book.status}`,locale)}</span>{abilities.canChange&&<ActionLink href={`/books/${book.id}`}>{t('story.edit',locale)}</ActionLink>}</div></article>)}</div>:abilities.canAdd?<div className="story-empty"><h2>{t('story.empty',locale)}</h2><p>{t('story.emptyHint',locale)}</p><ActionLink href="/create" primary>{t('story.create',locale)}</ActionLink></div>:<div className="story-empty"><h2>{t('story.emptyShelfRead',locale)}</h2><p>{t('story.emptyShelfReadHint',locale)}</p></div>}{shelf.next&&<ActionLink href={`/?before=${shelf.next}`}>{t('story.more',locale)}</ActionLink>}{before&&<ActionLink href="/">{t('story.latest',locale)}</ActionLink>}</PageFrame></div>;
}
