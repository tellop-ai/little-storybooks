'use client';
import { useEffect, useRef, useState } from 'react';
import { BookOpen, ArrowRight, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { AppMenu } from '@/components/ui/app-menu';
import { t } from '../lib/i18n/index.js';

export function StoryHeader({locale,path,disabled=false}) {useEffect(()=>{document.documentElement.lang=locale;},[locale]);return <header className="story-header" data-print-hidden inert={disabled?true:undefined}><a href="/" className="story-brand"><BookOpen aria-hidden="true"/>{t('app.title',locale)}</a><AppMenu locale={locale} currentPath={path}/></header>;}
export function Field({label,children,hint}) {return <label className="story-field"><span>{label}</span>{children}{hint&&<small>{hint}</small>}</label>;}
export function TextField({label,value,onChange,max=1000,multiline=false,...props}) {const Control=multiline?Textarea:Input;return <Field label={label}><Control value={value} onChange={event=>onChange(event.target.value)} maxLength={max} {...props}/></Field>;}
export function Pick({label,value,onChange,options,disabled}) {return <Field label={label}><NativeSelect value={value} disabled={disabled} onChange={event=>onChange(event.target.value)}>{options.map(([key,words])=><NativeSelectOption value={key} key={key}>{words}</NativeSelectOption>)}</NativeSelect></Field>;}
export function LanguagePick({locale,label,value,onChange}) {return <Pick label={label??t('story.language',locale)} value={value} onChange={onChange} options={['en','tr'].map(key=>[key,t(`story.${key}`,locale)])}/>;}
export function ModePick({locale,value,onChange}) {return <fieldset className="story-section"><legend>{t('story.mode',locale)}</legend>{['inspired','photo-reference'].map(mode=><Button type="button" key={mode} variant={value===mode?'default':'outline'} aria-pressed={value===mode} onClick={()=>onChange(mode)}>{t(`story.${mode}`,locale)}</Button>)}<p className="story-muted">{t(value==='inspired'?'story.inspiredHint':'story.referenceHint',locale)}</p></fieldset>;}
export function ActionLink({href,children,primary=false,disabled=false}) {return <a className={primary?'story-link story-link-primary':'story-link'} href={disabled?undefined:href} aria-disabled={disabled||undefined}>{children}{primary&&<ArrowRight aria-hidden="true"/>}</a>;}
export function Placeholder({locale}) {return <div className="story-placeholder"><ImageIcon aria-hidden="true"/><p>{t('story.noPicture',locale)}</p></div>;}
export function Result({locale,problem,success}) {return <div aria-live="polite" className="story-result">{problem?<p role="alert">{t(problem,locale)}</p>:success?<p>{t(success,locale)}</p>:null}</div>;}
async function post(address,body,signal) {const response=await fetch(address,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),signal});const result=await response.json();if(!response.ok)throw Object.assign(new Error(result.problem),{messageKey:result.problem});return result;}
export function useSave(locale) {
  const [pending,setPending]=useState(false),[problem,setProblem]=useState(null),[success,setSuccess]=useState(null),[uncertain,setUncertain]=useState(null);const busy=useRef(false);
  async function deliver(body,onSaved) {
    if(busy.current)return;busy.current=true;setPending(true);setProblem(null);setSuccess(null);
    try{const result=await post('/api/storybooks',body);setUncertain(null);setSuccess('story.saved');await onSaved?.(result);return result;}
    catch(error){if(!error.messageKey||error.messageKey==='error.saveUnconfirmed'){
      try{const response=await fetch(`/api/storybooks/status/${body.input.requestId}`);const answer=await response.json();if(response.ok&&answer.result){setUncertain(null);setSuccess('story.saved');await onSaved?.(answer.result);return answer.result;}}catch{}
      setUncertain({body,onSaved});setProblem('story.pendingSave');
    }else setProblem(error.messageKey);}
    finally{busy.current=false;setPending(false);}
  }
  async function save(action,input,onSaved){if(uncertain||busy.current)return;return deliver({action,input:{...input,requestId:crypto.randomUUID()}},onSaved);}
  async function check(){if(!uncertain)return;setPending(true);try{const response=await fetch(`/api/storybooks/status/${uncertain.body.input.requestId}`),answer=await response.json();if(response.ok&&answer.result){await uncertain.onSaved?.(answer.result);setUncertain(null);setProblem(null);setSuccess('story.saved');}else setProblem('story.notConfirmed');}catch{setProblem('story.pendingSave');}finally{setPending(false);}}
  const recovery=uncertain?<div className="story-actions"><Button type="button" variant="outline" disabled={pending} onClick={check}>{t('story.checkSave',locale)}</Button><Button type="button" variant="outline" disabled={pending} onClick={()=>deliver(uncertain.body,uncertain.onSaved)}>{t('story.retry',locale)}</Button></div>:null;
  return {save,pending,problem,success,setProblem,setSuccess,recovery,disabled:pending||Boolean(uncertain)};
}
export function useProposal() {
  const [pending,setPending]=useState(false),[problem,setProblem]=useState(null),[proposal,setProposal]=useState(null),[last,setLast]=useState(null);const abort=useRef(null),busy=useRef(false);
  useEffect(()=>()=>abort.current?.abort(),[]);
  async function send(input,reuse=false) {
    if(busy.current)return;busy.current=true;setPending(true);setProblem(null);setProposal(null);
    const body=reuse?input:{...input,requestId:crypto.randomUUID()};setLast(body);abort.current=new AbortController();
    try{const value=await post('/api/storybooks/ai',body,abort.current.signal);if(value.state==='dismissed')setProblem('story.proposalDismissed');else if(value.state==='failed')setProblem(value.problem??'ai.unavailable');else if(value.state!=='ready')setProblem('story.generationUncertain');else setProposal(value);return value;}
    catch(error){setProblem(!error.messageKey||['error.saveUnconfirmed','error.saveFailed','error.storageUnreadable'].includes(error.messageKey)?'story.generationUncertain':error.messageKey);}
    finally{setPending(false);busy.current=false;abort.current=null;}
  }
  return {pending,disabled:pending||problem==='story.generationUncertain',problem,proposal,send,setProposal,setProblem,last,recheck:()=>last&&send(last,true)};
}
