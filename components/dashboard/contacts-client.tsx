"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Download, Filter, Loader2, MessageCircle, Search, UsersRound, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { exportInstagramContacts } from "@/actions/inbox";
import { filterContacts, contactTime, type Contact, type ContactFilters } from "@/lib/contacts";
import { useUi } from "@/components/i18n/use-ui";
import UpgradeDialog, { ProBadge } from "@/components/automations/upgrade-dialog";
import css from "./contacts-client.module.css";
const PAGE_SIZE=25;
const columns=[['recipientUsername','Username'],['lastInteractedAt','Last interacted on'],['createdAt','Created on'],['email','Email'],['phone','Phone']] as const;
export default function ContactsClient({slug,contacts,canExport=false}:{slug:string;contacts:Contact[];canExport?:boolean}) {
  const tr=useUi(); const [filters,setFilters]=useState<ContactFilters>({sort:'lastInteractedAt',direction:'desc'});
  const [page,setPage]=useState(1),[upgrade,setUpgrade]=useState(false),[exporting,setExporting]=useState(false),[error,setError]=useState('');
  const filtered=useMemo(()=>filterContacts(contacts,filters),[contacts,filters]);
  const pages=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE)),current=Math.min(page,pages);
  const rows=filtered.slice((current-1)*PAGE_SIZE,current*PAGE_SIZE);
  function update(patch:Partial<ContactFilters>){setFilters(f=>({...f,...patch}));setPage(1);}
  function sort(key:ContactFilters['sort']){update({sort:key,direction:filters.sort===key&&filters.direction==='asc'?'desc':'asc'});}
  const activeFilters=Object.entries(filters).filter(([k,v])=>!['sort','direction','query'].includes(k)&&v&&v!=='all').length;
  function date(v:Contact['createdAt']) {return contactTime(v)?new Date(contactTime(v)).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric',timeZone:'UTC'}):'—';}
  async function download(){
    if(!canExport){setUpgrade(true);return;}
    setExporting(true);setError('');
    try {const result=await exportInstagramContacts(filters);if(result.status===403){setUpgrade(true);return;}if(result.status!==200||!result.csv)throw new Error(result.error||'Could not download contacts. Please try again.');
      const url=URL.createObjectURL(new Blob([result.csv],{type:'text/csv;charset=utf-8;'}));const a=document.createElement('a');a.href=url;a.download=result.filename||'ap3k-contacts.csv';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
    }catch{setError(tr('Could not download contacts. Please try again.'));}finally{setExporting(false);}
  }
  const sortIcon=(key:ContactFilters['sort'])=>filters.sort===key?(filters.direction==='asc'?<ArrowUp size={14}/>:<ArrowDown size={14}/>):<ArrowUpDown size={14}/>;
  return <div className={css.page}>
    <header className={css.header}><h1>{tr('Contacts')}</h1><div className={css.headerActions}>
      <label className={css.search}><Search size={17}/><span className="sr-only">{tr('Search contacts')}</span><input value={filters.query||''} onChange={e=>update({query:e.target.value})} placeholder={tr('Search contacts')}/></label>
      <button type="button" className={css.download} onClick={download} disabled={exporting} aria-label={tr('Download CSV')} title={tr('Exports all contacts matching your filters, across every page.')}>{exporting?<Loader2 size={17} className="animate-spin"/>:<Download size={17}/>} {tr('Download CSV')} {!canExport&&<ProBadge/>}</button>
    </div></header>
    {error&&<p role="alert" className={css.error}>{error}</p>}
    <div className={css.toolbar}>
      <span className={css.allContacts}>{tr(filters.query||activeFilters?'Matching contacts':'All contacts')} <span>{filtered.length}</span></span>
      <Popover><PopoverTrigger asChild><button className={css.filterButton}><Filter size={16}/>{tr('Filter')}{activeFilters>0&&<b>{activeFilters}</b>}</button></PopoverTrigger>
        <PopoverContent align="start" className={css.filterPanel}>
          <div className={css.filterHeading}><strong>{tr('Filter contacts')}</strong><button type="button" onClick={()=>update({email:'all',phone:'all',createdFrom:'',createdTo:'',interactedFrom:'',interactedTo:''})}>{tr('Clear filters')}</button></div>
          {(['email','phone'] as const).map(key=><label className={css.filterField} key={key}>{tr(key==='email'?'Email':'Phone')}<select value={filters[key]||'all'} onChange={e=>update({[key]:e.target.value})}><option value="all">{tr('All contacts')}</option><option value="has">{tr(key==='email'?'Has Email':'Has Phone')}</option><option value="missing">{tr(key==='email'?'No email':'No phone')}</option></select></label>)}
          {(['interacted','created'] as const).map(key=><fieldset key={key}><legend>{tr(key==='interacted'?'Last interacted on':'Created on')}</legend><div className={css.dateRange}><label>{tr('From')}<input aria-label={tr(`${key==='interacted'?'Last interacted on':'Created on'} from`)} type="date" value={filters[`${key}From`]||''} onChange={e=>update({[`${key}From`]:e.target.value})}/></label><label>{tr('To')}<input aria-label={tr(`${key==='interacted'?'Last interacted on':'Created on'} to`)} type="date" value={filters[`${key}To`]||''} onChange={e=>update({[`${key}To`]:e.target.value})}/></label></div></fieldset>)}
        </PopoverContent>
      </Popover>
      {activeFilters>0&&<button type="button" className={css.clear} onClick={()=>update({email:'all',phone:'all',createdFrom:'',createdTo:'',interactedFrom:'',interactedTo:''})}><X size={14}/>{tr('Clear filters')}</button>}
      <label className={css.mobileSort}>{tr('Sort by')}<select aria-label={tr('Sort contacts by')} value={filters.sort} onChange={e=>update({sort:e.target.value as ContactFilters['sort']})}>{columns.map(([key,label])=><option key={key} value={key}>{tr(label)}</option>)}</select><button type="button" aria-label={tr('Reverse sort order')} onClick={()=>update({direction:filters.direction==='asc'?'desc':'asc'})}>{sortIcon(filters.sort)}</button></label>
    </div>
    <div className={css.tableWrap}><table className={css.table}><thead><tr>{columns.map(([key,label])=><th key={key} scope="col" aria-sort={filters.sort===key?(filters.direction==='asc'?'ascending':'descending'):'none'}><button type="button" onClick={()=>sort(key)}>{tr(label)}{sortIcon(key)}</button></th>)}</tr></thead>
      <tbody>{rows.map(c=><tr key={c.id}>
        <td data-label={tr('Username')}><div className={css.username}>{c.recipientUsername?<a href={`https://www.instagram.com/${encodeURIComponent(c.recipientUsername.replace(/^@/,''))}/`} target="_blank" rel="noopener noreferrer">@{c.recipientUsername.replace(/^@/,'')}</a>:<span>{tr('Instagram user')}</span>}{c.conversationId&&<Link className={css.chat} href={`/dashboard/${encodeURIComponent(slug)}/inbox?conversation=${encodeURIComponent(c.conversationId)}`} aria-label={tr('Open chat')}><MessageCircle size={16}/></Link>}</div></td>
        <td data-label={tr('Last interacted on')}><time dateTime={contactTime(c.lastInteractedAt)?new Date(contactTime(c.lastInteractedAt)).toISOString():undefined}>{date(c.lastInteractedAt)}</time></td>
        <td data-label={tr('Created on')}><time dateTime={contactTime(c.createdAt)?new Date(contactTime(c.createdAt)).toISOString():undefined}>{date(c.createdAt)}</time></td>
        <td data-label={tr('Email')}>{c.email||'—'}</td><td data-label={tr('Phone')}><bdi>{c.phone||'—'}</bdi></td>
      </tr>)}</tbody></table>
      {!rows.length&&<div className={css.empty}><UsersRound size={32}/><h2>{tr(filters.query||activeFilters?'No matching contacts':'No contacts yet')}</h2><p>{tr('Contacts appear after an Instagram interaction reaches AP3K.')}</p></div>}
    </div>
    {pages>1&&<nav className={css.pagination} aria-label={tr('Contacts pagination')}><button disabled={current===1} onClick={()=>setPage(current-1)}><ChevronLeft size={17}/>{tr('Previous')}</button><span>{current} / {pages}</span><button disabled={current===pages} onClick={()=>setPage(current+1)}>{tr('Next')}<ChevronRight size={17}/></button></nav>}
    <UpgradeDialog open={upgrade} onOpenChange={setUpgrade}/>
  </div>;
}
