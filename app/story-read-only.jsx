import { PageFrame } from '@/components/ui/page-frame';
import { t } from '../lib/i18n/index.js';
import { StoryHeader, ActionLink } from './story-ui.jsx';
/** A page this person may only read (`lib/story-roles.js`): its heading, one plain line, and the ways on. */
export function StoryReadOnly({locale,path,title,wordsKey,links}) {return <><StoryHeader locale={locale} path={path}/><PageFrame locale={locale} title={title} description={t(wordsKey,locale)} actions={<>{links.map(([href,key])=><ActionLink key={href} href={href}>{t(key,locale)}</ActionLink>)}</>}/></>;}
