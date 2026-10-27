import { storyPageContext } from '../../lib/story-page.js';
import { StoryUnavailable } from '../story-unavailable.jsx';
import { SettingsView } from './settings-view.jsx';
export const dynamic='force-dynamic';
export default async function Page(){const context=await storyPageContext();return context.owner?<SettingsView settings={context.settings} locale={context.locale}/>:<StoryUnavailable locale={context.locale}/>;}
