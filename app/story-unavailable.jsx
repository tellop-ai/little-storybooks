import { PageFrame } from '@/components/ui/page-frame';
import { t } from '../lib/i18n/index.js';
/** The one page a visit the guard refuses sees (`lib/story-access.js`): the app is open only to the person who runs
 * it, or the person could not be read. The layout adds the way back while the owner looks as someone else. */
export function StoryUnavailable({locale,closed}) {return <PageFrame locale={locale} title={t('app.title',locale)} description={t(closed?.wordsKey??'story.ownerOnly',locale)}/>;}
