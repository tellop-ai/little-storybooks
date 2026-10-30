'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageFrame } from '@/components/ui/page-frame';
import { Button } from '@/components/ui/button';
import { t } from '../../lib/i18n/index.js';
import { StoryHeader, LanguagePick, ModePick, Result, useSave } from '../story-ui.jsx';
/** The shared settings, as words only, for a person who may not change them (`lib/story-roles.js`). */
function SettingsRead({settings,locale}) {const rows=[['story.interfaceLanguage',`story.${settings.interfaceLanguage}`],['story.language',`story.${settings.defaultStoryLanguage}`],['story.mode',`story.${settings.defaultIllustrationMode}`]];return <div className="story-form story-narrow"><dl className="grid gap-3">{rows.map(([label,value])=><div key={label}><dt className="text-sm text-muted-foreground">{t(label,locale)}</dt><dd>{t(value,locale)}</dd></div>)}</dl><p className="story-muted">{t('story.settingsReadOnly',locale)}</p></div>;}
export function SettingsView({settings,locale,canChange=false}) {
 const [values,setValues]=useState(settings),task=useSave(locale),router=useRouter();const change=(key,value)=>setValues(v=>({...v,[key]:value}));
 return <><StoryHeader locale={locale} path="/settings"/><PageFrame title={t('story.settings',locale)} description={t('story.settingsHint',locale)} locale={locale}>{canChange?<form className="story-form story-narrow" onSubmit={event=>{event.preventDefault();task.save('saveSettings',{expectedRevision:values.revision,interfaceLanguage:values.interfaceLanguage,defaultStoryLanguage:values.defaultStoryLanguage,defaultIllustrationMode:values.defaultIllustrationMode},result=>{setValues(v=>({...v,...result}));router.refresh();});}}><LanguagePick locale={locale} label={t('story.interfaceLanguage',locale)} value={values.interfaceLanguage} onChange={v=>change('interfaceLanguage',v)}/><LanguagePick locale={locale} value={values.defaultStoryLanguage} onChange={v=>change('defaultStoryLanguage',v)}/><ModePick locale={locale} value={values.defaultIllustrationMode} onChange={v=>change('defaultIllustrationMode',v)}/><Button disabled={task.disabled} type="submit">{t(task.pending?'story.saving':'story.save',locale)}</Button><Result locale={locale} {...task}/>{task.recovery}<p className="story-muted">{t('story.onlineOwnerOnly',locale)}</p></form>:<SettingsRead settings={settings} locale={locale}/>}</PageFrame></>;
}
