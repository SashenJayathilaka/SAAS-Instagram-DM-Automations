import { describe,it,expect } from 'vitest';
import { mergeContacts,filterContacts,contactsCsv,type Contact } from './contacts';
const row=(id:string,extra:Partial<Contact>={}):Contact=>({id,recipientIgId:id,recipientUsername:id,createdAt:'2026-10-01T00:00:00Z',lastInteractedAt:'2026-10-05T10:00:00Z',...extra});
describe('contact records and export',()=>{
 it('merges both captured fields across automations without losing the earliest creation date',()=>{
  const result=mergeContacts([{id:'c',recipientIgId:'r',recipientUsername:null,email:'current@example.com',phone:null,createdAt:'2026-10-03',lastInboundAt:'2026-10-05'}],[{id:'l2',igUserId:'r',igUsername:'creator',phone:'+1234567890',createdAt:'2026-10-02'},{id:'l1',igUserId:'r',email:'old@example.com',createdAt:'2026-10-01'}]);
  expect(result).toHaveLength(1);expect(result[0]).toMatchObject({conversationId:'c',recipientUsername:'creator',email:'current@example.com',phone:'+1234567890',createdAt:'2026-10-01',lastInteractedAt:'2026-10-05'});
 });
 it('combines presence, search and inclusive date filters with deterministic sorting',()=>{
  const data=[row('a',{email:'a@example.com',phone:'+1234567890'}),row('b',{email:'b@example.com',lastInteractedAt:'2026-10-05T23:59:59Z'}),row('c',{lastInteractedAt:'2026-10-06T00:00:00Z'})];
  expect(filterContacts(data,{email:'has',phone:'missing',interactedFrom:'2026-10-05',interactedTo:'2026-10-05',query:'example'}).map(c=>c.id)).toEqual(['b']);
  expect(filterContacts(data,{sort:'email',direction:'desc'}).map(c=>c.id)).toEqual(['b','a','c']);
  expect(filterContacts(data,{createdFrom:'2026-10-02'})).toEqual([]);
 });
 // Benign spreadsheet expressions exercise PayloadsAllTheThings CSV prefixes;
 // no formula is executed and no contact record is written.
 it.each(['=1+1', '+1+1', '-1+1', '@SUM(1,1)', '\t=1+1', '\r=1+1', '\n=1+1', '  =1+1', '\t\r\n=1+1'])(
  'neutralizes formula/control prefixes in every exported contact text field: %j',
  value=>{
   const escaped='"\''+value.replace(/"/g,'""')+'"';
   const csv=contactsCsv([row('contact',{recipientUsername:value,email:value,phone:value})]);
   expect(csv).toContain([escaped,'"2026-10-05T10:00:00.000Z"','"2026-10-01T00:00:00.000Z"',escaped,escaped].join(',')+'\r\n');
  }
 );
 it('exports all matches rather than the visible page and escapes spreadsheet formulas, commas and quotes',()=>{
  const data=Array.from({length:510},(_,i)=>row(String(i)));data[0]=row('formula',{recipientUsername:'=HYPERLINK("x")',email:'a,"b"@example.com',phone:'+1234567890'});
  const csv=contactsCsv(data);expect(csv.startsWith('\uFEFF"Username","Last interacted on","Created on","Email","Phone"')).toBe(true);
  expect(csv).toContain('"\'=HYPERLINK(""x"")"');expect(csv).toContain('"\'+1234567890"');expect(csv).toContain('"a,""b""@example.com"');expect(csv.split('\r\n')).toHaveLength(512);
 });
});
