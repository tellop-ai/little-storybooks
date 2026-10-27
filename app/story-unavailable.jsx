import { t } from '../lib/i18n/index.js';
export function StoryUnavailable({locale}) {return <main className="story-unavailable"><h1>{t('app.title',locale)}</h1><p>{t('story.onlineUnavailable',locale)}</p></main>;}
