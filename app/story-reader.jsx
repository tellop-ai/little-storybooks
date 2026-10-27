'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { t } from '../lib/i18n/index.js';
import { contentAddress } from '../lib/story-browser.js';
import { StoryHeader, ActionLink } from './story-ui.jsx';
import { PrintButton } from './print-button.jsx';
export function BookReader({record,locale}) {
 const {book,edition,pages}=record,[index,setIndex]=useState(0);
 const sheets=[{kind:'cover'},...(edition.dedication?[{kind:'dedication'}]:[]),...pages.map(p=>({kind:'page',page:p}))];
 function content(sheet){if(sheet.kind==='cover')return <div className="story-reading-cover"><p>{t('story.forName',locale,{name:edition.recipientName})}</p><h1>{edition.title}</h1>{edition.coverFile&&<img src={contentAddress('cover',edition.id,edition.coverFile)} alt={edition.coverDescription}/>}<p>{t('story.madeWithLove',locale)}</p></div>;
 if(sheet.kind==='dedication')return <div className="story-dedication"><h2>{t('story.dedication',locale)}</h2><p>{edition.dedication}</p></div>;
 const page=sheet.page;return <div className={page.pictureFile?'story-spread':'story-spread story-text-spread'}>{page.pictureFile&&<div className="story-scene"><img src={contentAddress('page',page.id,page.pictureFile)} alt={page.pictureAlt}/></div>}<div className="story-prose"><p>{page.text}</p><small>{t('story.page',locale,{number:String(page.position+1)})}</small></div></div>;
 }
 return <><StoryHeader locale={locale} path="/"/><main className="story-reader print-page" lang={edition.language}><div className="story-reader-controls" data-print-hidden><div className="story-actions"><ActionLink href="/">{t('story.back',locale)}</ActionLink><ActionLink href={`/books/${book.id}?edition=${edition.id}`}>{t('story.edit',locale)}</ActionLink><PrintButton locale={locale}/></div>{!edition.reviewedAt&&<p className="story-muted">{t('story.readDraft',locale)}</p>}<p className="story-muted">{t('story.printHint',locale)}</p></div><section className="story-screen-book" data-print-hidden aria-label={edition.title} tabIndex={0} onKeyDown={event=>{if(event.key==='ArrowRight'){event.preventDefault();setIndex(i=>Math.min(sheets.length-1,i+1));}if(event.key==='ArrowLeft'){event.preventDefault();setIndex(i=>Math.max(0,i-1));}}}>{content(sheets[index])}<div className="story-reader-turn"><Button variant="outline" disabled={index===0} onClick={()=>setIndex(i=>i-1)}>{t('story.previous',locale)}</Button><span aria-live="polite">{t('story.pageOf',locale,{number:String(index+1),count:String(sheets.length)})}</span><Button variant="outline" disabled={index===sheets.length-1} onClick={()=>setIndex(i=>i+1)}>{t('story.next',locale)}</Button></div></section><div className="story-print-book">{sheets.map((sheet,i)=><section className="story-print-sheet" key={i}>{content(sheet)}</section>)}</div></main></>;
}
