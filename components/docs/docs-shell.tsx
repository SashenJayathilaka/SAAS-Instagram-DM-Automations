'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as Dialog from '@radix-ui/react-dialog';
import { ArrowRight, BookOpen, ChevronDown, Menu, Search, X } from 'lucide-react';
import AP3KLogo from '@/components/global/ap3k-logo';
import ThemeToggle from '@/components/global/theme-toggle';
import { DOCS_GROUPS } from '@/lib/docs/groups';
import labels from '@/lib/docs/navigation-labels.json';
import type { DocsHeading } from '@/lib/docs/types';
import styles from './docs.module.css';
import {docsFont} from './font';
export type DocsSearchEntry={slug:string;group:string;title:string;description:string;text:string;headings:DocsHeading[]};
export default function DocsShell({entries,children}:{entries:DocsSearchEntry[];children:React.ReactNode}){
 const pathname=usePathname();
 const current=entries.find(a=>pathname===`/docs/${a.slug}`);
 const [search,setSearch]=useState(false); const [menu,setMenu]=useState(false); const [query,setQuery]=useState('');
 const input=useRef<HTMLInputElement>(null);
 useEffect(()=>{setMenu(false);setSearch(false);if(!window.location.hash)window.scrollTo({top:0,behavior:'auto'})},[pathname]);
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();setSearch(v=>!v)}}; window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key)},[]);
 const results=useMemo(()=>{const terms=query.toLowerCase().trim().split(/\s+/).filter(Boolean); if(!terms.length)return [];
 return entries.map(a=>({...a,score:terms.reduce((sum,t)=>sum+(a.title.toLowerCase().includes(t)?10:0),0)})).filter(a=>terms.every(t=>`${a.title} ${a.description} ${a.text}`.toLowerCase().includes(t))).sort((a,b)=>b.score-a.score)},[entries,query]);
 const searchButton=(wide=false)=><button type="button" className={wide?styles.searchWide:styles.searchButton} onClick={()=>setSearch(true)}><Search size={18}/><span>Search documentation</span><kbd>⌘ K</kbd></button>;
 const navigation=<nav aria-label="Documentation topics">{DOCS_GROUPS.map(group=><details key={`${group.id}-${current?.group}`} open={current?.group===group.id||undefined}><summary>{group.title}<ChevronDown size={15}/></summary><div>{entries.filter(a=>a.group===group.id).map(a=><Link key={a.slug} href={`/docs/${a.slug}`} aria-current={a.slug===current?.slug?'page':undefined} onClick={()=>setMenu(false)}><BookOpen size={14}/>{(labels as Record<string,string>)[a.slug]||a.title}</Link>)}</div></details>)}</nav>;
 return <>
  <a className={styles.skip} href="#docs-content">Skip to content</a>
  <header className={styles.header}><Link className={styles.brand} href="/docs" aria-label="AP3K documentation"><AP3KLogo className="gap-2 text-lg" markClassName="h-7 w-7 rounded-lg shadow-none ring-0 [&>svg]:p-1"/><span>docs</span></Link><button className={styles.headerSearch} aria-label="Search documentation" onClick={()=>setSearch(true)}><Search size={17}/></button><div className={styles.trail}>{current?<><Link href="/docs">{DOCS_GROUPS.find(g=>g.id===current.group)?.title}</Link><span>/</span><strong>{current.title}</strong></>:<span>Documentation</span>}</div><div className={styles.headerActions}><Link href="/pricing">Pricing</Link><Link href="/contact">Contact support</Link><Link className={styles.signIn} href="/sign-in">Sign in</Link><ThemeToggle compact/><button className={styles.mobileSearch} aria-label="Search documentation" onClick={()=>setSearch(true)}><Search size={20}/></button><button className={styles.menuButton} aria-label="Open documentation menu" onClick={()=>setMenu(true)}><Menu size={21}/></button></div></header>
  <aside className={styles.sidebar}>{navigation}<div className={styles.sidebarBottom}><Link href="/contact">Need a hand? Contact support <ArrowRight size={15}/></Link></div></aside>
  <main id="docs-content" className={`${styles.main} ${current?styles.articleMain:""}`} tabIndex={-1}>{!current&&<div className={styles.homeIntro}><h1>AP3K Documentation</h1><p>Everything you need to turn Instagram interactions into conversations.{" "}<br/>Learn the basics, build automations, and find answers.</p>{searchButton(true)}</div>}{children}</main>
  <Dialog.Root open={menu} onOpenChange={setMenu}><Dialog.Portal><Dialog.Overlay className={styles.overlay}/><Dialog.Content className={styles.mobileDrawer} style={{fontFamily:docsFont.style.fontFamily}} aria-describedby={undefined}><div className={styles.dialogTop}><Dialog.Title>Documentation</Dialog.Title><Dialog.Close aria-label="Close documentation menu"><X size={20}/></Dialog.Close></div>{searchButton(true)}{navigation}<Link href="/pricing">Pricing</Link><Link href="/contact">Contact support</Link></Dialog.Content></Dialog.Portal></Dialog.Root>
  <Dialog.Root open={search} onOpenChange={setSearch}><Dialog.Portal><Dialog.Overlay className={styles.overlay}/><Dialog.Content className={styles.searchDialog} style={{fontFamily:docsFont.style.fontFamily}} aria-describedby={undefined} onOpenAutoFocus={e=>{e.preventDefault();input.current?.focus()}}><Dialog.Title className="sr-only">Search documentation</Dialog.Title><div className={styles.searchInput}><Search size={21}/><input ref={input} aria-label="Search documentation articles" placeholder="Search documentation…" value={query} onChange={e=>setQuery(e.target.value)}/>{query&&<button onClick={()=>setQuery('')}>Clear</button>}<Dialog.Close aria-label="Close search"><X size={20}/></Dialog.Close></div><div className={styles.results} aria-live="polite">{query.trim()?<><p>{results.length} {results.length===1?'result':'results'} for “{query}”</p>{results.map(a=><Link key={a.slug} href={`/docs/${a.slug}`} onClick={()=>setSearch(false)}><BookOpen size={18}/><div><strong>{a.title}</strong><p>{a.description}</p><small>{DOCS_GROUPS.find(g=>g.id===a.group)?.title}</small></div><ArrowRight size={17}/></Link>)}{!results.length&&<div className={styles.noResults}>No articles found. Try “keywords”, “connect Instagram”, or “delay”.</div>}</>:<div className={styles.noResults}>Search guides, features, and troubleshooting.<div className={styles.suggestions}>{['Connect Instagram','Keywords','Delay','AI replies'].map(q=><button key={q} onClick={()=>setQuery(q)}>{q}</button>)}</div></div>}</div><div className={styles.searchFooter}>Press <kbd>Esc</kbd> to close · <kbd>Tab</kbd> to navigate</div></Dialog.Content></Dialog.Portal></Dialog.Root>
 </>;
}
