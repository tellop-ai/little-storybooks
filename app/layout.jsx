import { getLocale, t } from '../lib/i18n/index.js';
import { storyPageContext } from '../lib/story-page.js';
import './globals.css';
export function generateMetadata() {return {title:t('app.title',getLocale())};}
export default async function RootLayout({children}) {const {locale}=await storyPageContext();return <html lang={locale}><body>{children}</body></html>;}
