export type Contact = {
  id:string; conversationId?:string|null; recipientIgId:string; recipientUsername?:string|null;
  profilePictureUrl?:string|null; email?:string|null; phone?:string|null;
  createdAt:Date|string|null; lastInteractedAt:Date|string|null;
};
export type ContactFilters = { query?:string; email?:"all"|"has"|"missing"; phone?:"all"|"has"|"missing"; createdFrom?:string; createdTo?:string; interactedFrom?:string; interactedTo?:string; sort?:"recipientUsername"|"lastInteractedAt"|"createdAt"|"email"|"phone"; direction?:"asc"|"desc" };
export function contactTime(value:unknown) { const time=value?new Date(value as string).getTime():NaN; return Number.isFinite(time)?time:0; }
function earlier(a:any,b:any){return !a?b:!b?a:contactTime(a)<contactTime(b)?a:b;}
function later(a:any,b:any){return contactTime(a)>contactTime(b)?a:b;}
export function mergeContacts(conversations:any[],leads:any[]):Contact[] {
  const contacts=new Map<string,Contact>();
  for(const lead of leads){
    const old=contacts.get(lead.igUserId);
    contacts.set(lead.igUserId,{id:old?.id||`lead:${lead.id}`,conversationId:null,recipientIgId:lead.igUserId,recipientUsername:old?.recipientUsername||lead.igUsername,email:old?.email||lead.email,phone:old?.phone||lead.phone,createdAt:earlier(old?.createdAt,lead.createdAt),lastInteractedAt:later(old?.lastInteractedAt,lead.createdAt)});
  }
  for(const c of conversations){
    const old=contacts.get(c.recipientIgId);
    contacts.set(c.recipientIgId,{id:c.id,conversationId:c.id,recipientIgId:c.recipientIgId,recipientUsername:c.recipientUsername||old?.recipientUsername,profilePictureUrl:c.profilePictureUrl,email:c.email||old?.email,phone:c.phone||old?.phone,createdAt:earlier(c.createdAt,old?.createdAt)||null,lastInteractedAt:later(c.lastInboundAt||c.lastMessageAt,old?.lastInteractedAt)||null});
  }
  return Array.from(contacts.values());
}
export function filterContacts(contacts:Contact[],input:ContactFilters={}) {
  const query=String(input.query||"").trim().slice(0,250).toLowerCase();
  const within=(value:unknown,from?:string,to?:string)=>{
    const stamp=contactTime(value);
    const valid=(s?:string)=>typeof s==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(s);
    // Inclusive UTC day boundaries are identical for the table and CSV export.
    return (!valid(from)||stamp>=Date.parse(from+"T00:00:00Z"))&&(!valid(to)||stamp<Date.parse(to+"T00:00:00Z")+86400000);
  };
  const present=(v:unknown,mode?:string)=>mode==="has"?Boolean(v):mode==="missing"?!v:true;
  const keys=["recipientUsername","lastInteractedAt","createdAt","email","phone"] as const;
  const key=keys.includes(input.sort as any)?input.sort!:"lastInteractedAt";
  const direction=input.direction==="asc"?1:-1;
  return contacts.filter(c=>(!query||`${c.recipientUsername||""} ${c.email||""} ${c.phone||""}`.toLowerCase().includes(query))&&present(c.email,input.email)&&present(c.phone,input.phone)&&within(c.createdAt,input.createdFrom,input.createdTo)&&within(c.lastInteractedAt,input.interactedFrom,input.interactedTo)).sort((a,b)=>{
    const av=a[key],bv=b[key];
    if(!av&&!bv)return a.recipientIgId.localeCompare(b.recipientIgId);
    if(!av)return 1;if(!bv)return -1;
    return direction*(key==="createdAt"||key==="lastInteractedAt"?contactTime(av)-contactTime(bv):String(av).localeCompare(String(bv),undefined,{sensitivity:"base"}))||a.recipientIgId.localeCompare(b.recipientIgId);
  });
}
function csvCell(value:unknown){let s=String(value??"");if(/^\s*[=+@\-\t\r\n]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}
export function contactsCsv(contacts:Contact[]){
  const date=(v:unknown)=>contactTime(v)?new Date(contactTime(v)).toISOString():"";
  const rows=[["Username","Last interacted on","Created on","Email","Phone"],...contacts.map(c=>[c.recipientUsername||c.recipientIgId,date(c.lastInteractedAt),date(c.createdAt),c.email,c.phone])];
  return "\uFEFF"+rows.map(row=>row.map(csvCell).join(",")).join("\r\n")+"\r\n";
}
