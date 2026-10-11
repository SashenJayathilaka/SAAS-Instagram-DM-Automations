'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {ThumbsDown,ThumbsUp,X} from 'lucide-react';
import type {DocsHeading} from '@/lib/docs/types';
import styles from './docs.module.css';
import {docsFont} from './font';
export function ArticleInteractions({slug}:{slug:string}){
 const [zoom,setZoom]=useState<{src:string;alt:string}|null>(null); const [vote,setVote]=useState<string|null>(null);
 useEffect(()=>{try{setVote(localStorage.getItem(`ap3k-docs-feedback:${slug}`))}catch{}},[slug]);
 useEffect(()=>{const content=document.getElementById('docs-article-content'); if(!content)return;const handler=(event:MouseEvent)=>{const img=(event.target as Element).closest('img');if(img)setZoom({src:img.src,alt:img.alt})};const key=(event:KeyboardEvent)=>{if((event.key==='Enter'||event.key===' ')&&(event.target as Element).matches('figure[tabindex]')){event.preventDefault();const img=(event.target as Element).querySelector('img');if(img)setZoom({src:img.src,alt:img.alt})}};content.addEventListener('click',handler);content.addEventListener('keydown',key);return()=>{content.removeEventListener('click',handler);content.removeEventListener('keydown',key)}},[slug]);
 const feedback=(value:string)=>{setVote(value);try{localStorage.setItem(`ap3k-docs-feedback:${slug}`,value)}catch{}};
 return <><div className={styles.feedback}><span>Was this page helpful?</span><button aria-pressed={vote==='yes'} onClick={()=>feedback('yes')}><ThumbsUp size={14}/>Yes</button><button aria-pressed={vote==='no'} onClick={()=>feedback('no')}><ThumbsDown size={14}/>No</button>{vote&&<span role="status">Preference saved on this device.{vote==='no'&&<> <Link href="/contact">Tell support what was missing →</Link></>}</span>}</div><Dialog.Root open={!!zoom} onOpenChange={open=>{if(!open)setZoom(null)}}><Dialog.Portal><Dialog.Overlay className={styles.overlay}/><Dialog.Content className={styles.zoom} style={{fontFamily:docsFont.style.fontFamily}} aria-describedby={undefined}><Dialog.Title className="sr-only">{zoom?.alt||'Enlarged screenshot'}</Dialog.Title><Dialog.Close aria-label="Close screenshot"><X size={20}/></Dialog.Close>{zoom&&<img src={zoom.src} alt={zoom.alt}/>}</Dialog.Content></Dialog.Portal></Dialog.Root></>;
}
export function TableOfContents({headings}:{headings:DocsHeading[]}){
 const [active,setActive]=useState('');
 useEffect(()=>{const observer=new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting)setActive(e.target.id)},{rootMargin:'-90px 0px -65% 0px'});headings.forEach(h=>{const el=document.getElementById(h.id);if(el)observer.observe(el)});return()=>observer.disconnect()},[headings]);
 const links=headings.filter(h=>h.level===2).map(h=><a key={h.id} href={`#${h.id}`} aria-current={active===h.id?'true':undefined}>{h.text}</a>);
 return <aside className={styles.toc} aria-label="On this page"><strong>On this page</strong>{links}</aside>;
}
