import { buttonVariants } from '@/components/ui/button';
import { BACK_TO_OWNER } from '../lib/data/person.js';
import { getLocale, t } from '../lib/i18n/index.js';
import { storyPageContext } from '../lib/story-page.js';
import './globals.css';
export function generateMetadata() {return {title:t('app.title',getLocale())};}
/** While the owner looks at the app as a member or a viewer, every page offers the way back to their own view. */
export default async function RootLayout({children}) {const {locale,abilities,closed}=await storyPageContext();return <html lang={locale}><body>{(abilities?.preview||closed?.preview)&&<nav className="flex justify-end px-4 pt-3" data-print-hidden><a href={BACK_TO_OWNER} className={buttonVariants({variant:'outline'})}>{t('story.backToOwnView',locale)}</a></nav>}{children}</body></html>;}
