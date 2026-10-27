'use client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { t } from '../lib/i18n/index.js';
/** Print the real book. All pages and their images remain mounted in the print view. */
export function PrintButton({locale}) {
 const [busy,setBusy]=useState(false),[missing,setMissing]=useState(false);
 useEffect(()=>{let restoreDark=false;const before=()=>{restoreDark||=document.documentElement.classList.contains('dark');document.documentElement.classList.remove('dark');};const after=()=>{if(restoreDark)document.documentElement.classList.add('dark');restoreDark=false;document.documentElement.classList.remove('story-print-text-only');};window.addEventListener('beforeprint',before);window.addEventListener('afterprint',after);return()=>{after();window.removeEventListener('beforeprint',before);window.removeEventListener('afterprint',after);};},[]);
 async function print(textOnly=false){setBusy(true);setMissing(false);try{await document.fonts.ready;if(!textOnly){const images=Array.from(document.querySelectorAll('.story-print-book img'));const results=await Promise.all(images.map(image=>Promise.race([image.decode().then(()=>image.naturalWidth>0,()=>false),new Promise(resolve=>setTimeout(()=>resolve(false),10000))])));if(results.some(ok=>!ok)){setMissing(true);return;}}document.documentElement.classList.toggle('story-print-text-only',textOnly);window.print();}finally{setBusy(false);}}
 return <div data-print-hidden className="story-print-actions"><Button type="button" disabled={busy} onClick={()=>print()}>{t(busy?'story.printWait':'print.savePdf',locale)}</Button>{missing&&<div role="alert"><p>{t('story.printMissing',locale)}</p><Button type="button" variant="outline" disabled={busy} onClick={()=>print(true)}>{t('story.printTextOnly',locale)}</Button></div>}</div>;
}
