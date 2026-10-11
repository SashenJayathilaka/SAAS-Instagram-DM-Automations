import type { BlogPost } from './blog';
import compactSteps from './content/blog-cover-steps.json';

export type CoverKind = 'flow' | 'calendar' | 'clocks' | 'approval' | 'reel' | 'reschedule' | 'lifecycle' | 'incident' | 'batch' | 'matrix' | 'chat' | 'decision' | 'funnel' | 'report' | 'document';
export type CoverPlan = {
  title: string; category: string; kind: CoverKind; note: string;
  items: { label: string; detail: string }[];
};
type CoverPost = Pick<BlogPost, 'slug' | 'title'> & Partial<Pick<BlogPost, 'category' | 'sections' | 'description'>>;
const item = (label: string, detail: string) => ({ label, detail });
// These cover diagrams explain the published article; they are not product screenshots.
const editorial: Record<string, Omit<CoverPlan, 'category'>> = {
  'instagram-comment-to-dm-automation': { title: 'One comment. A useful next step.', kind: 'flow', note: 'An eligible request → a configured response → the promised resource', items: [item('COMMENT', '“Send me the GUIDE”'), item('MATCH', 'Keyword + post'), item('DELIVER', 'Open the guide')] },
  'instagram-scheduler-launch-handoff': { title: 'The post is live. Is the DM ready?', kind: 'flow', note: 'Publishing tool → launch owner → AP3K reply campaign', items: [item('PUBLISH', 'Live post URL'), item('CONNECT', 'Caption keyword'), item('TEST', 'Delivered link')] },
  'instagram-content-calendar-dm-offers': { title: 'Give every offer a place in the calendar', kind: 'calendar', note: 'Plan the audience question, resource and destination together.', items: [item('TUTORIAL', 'Sizing guide · GUIDE'), item('FOUNDER STORY', 'Discussion · no DM offer'), item('LAUNCH CHECK', 'Owner · link · test')] },
  'instagram-scheduling-time-zone-checklist': { title: 'One launch. Two time references.', kind: 'clocks', note: 'Illustrative clocks · Verify the named zones and actual date.', items: [item('AUDIENCE TIME', 'Event announcement'), item('PUBLISHING TIME', 'Team launch check'), item('VERIFY', 'Compare the actual timestamp')] },
  'instagram-scheduler-approval-workflow': { title: 'Approve the whole promise', kind: 'approval', note: 'A caption change must reach the trigger, DM and destination.', items: [item('CREATIVE + CAPTION', 'One clear resource promise'), item('KEYWORD + MESSAGE', 'The same approved wording'), item('BUTTON + DESTINATION', 'A working, relevant next step')] },
  'instagram-scheduler-reel-cover-caption': { title: 'Review more than the Reel', kind: 'reel', note: 'Cover, video, caption and resource should make the same promise.', items: [item('COVER', 'Lighting checklist'), item('CAPTION', 'Comment LIGHTING'), item('DM LINK', 'Open the lighting checklist')] },
  'instagram-scheduled-post-reschedule-checklist': { title: 'Move the date. Recheck the dependencies.', kind: 'reschedule', note: 'A new publication time needs a new launch check.', items: [item('OFFER DATES', 'Check the registration deadline'), item('LAUNCH OWNER', 'Confirm coverage at the new time'), item('LIVE POST', 'Select the actual media and test')] },
  'instagram-evergreen-scheduling-offer-decay': { title: 'Evergreen content needs a current offer', kind: 'lifecycle', note: 'A working URL can still lead to an outdated promise.', items: [item('REVIEW', 'Resource + dates'), item('MAINTAIN', 'Message + link'), item('RETIRE', 'Pause stale offers')] },
  'instagram-scheduler-publishing-failure-runbook': { title: 'When publishing fails, pause the promise', kind: 'incident', note: 'Confirm the failed stage before changing your reply campaign.', items: [item('CHECK', 'Did the intended post go live?'), item('REPAIR', 'Resolve the publishing issue'), item('RETEST', 'Use the actual post and a fresh comment')] },
  'instagram-content-batching-reply-planning': { title: 'Batch the content. Keep each reply relevant.', kind: 'batch', note: 'Each caption needs its own matching resource and response.', items: [item('POST A', 'Audience question → offer A'), item('POST B', 'Audience question → offer B'), item('POST C', 'Audience question → offer C')] },
  'instagram-scheduler-vendor-test-plan': { title: 'Test a scheduler before you commit', kind: 'matrix', note: 'A publishing evaluation worksheet — not an AP3K scheduler.', items: [item('PUBLISHING', 'Format and account support'), item('OPERATIONS', 'Approval and failure recovery'), item('HANDOFF', 'Live post verification')] },
  'instagram-quick-reply-price-request': { title: 'Price replies need context', kind: 'chat', note: 'Verify the price and inclusions before saving your reply.', items: [item('CUSTOMER', '“How much does it cost?”'), item('YOUR REPLY', 'Name the option and what is included'), item('NEXT STEP', 'Link to current pricing')] },
  'instagram-quick-reply-availability': { title: 'Answer availability without guessing', kind: 'chat', note: 'A saved reply is not a live inventory check.', items: [item('CUSTOMER', '“Is this still available?”'), item('CHECK', 'Confirm the current source'), item('YOUR REPLY', 'Share verified availability or route to a person')] },
  'instagram-quick-reply-delivery-question': { title: 'Make delivery answers useful', kind: 'chat', note: 'Use the relevant destination and verified delivery policy.', items: [item('CUSTOMER', '“Do you deliver to my area?”'), item('CONTEXT', 'Ask for the destination'), item('YOUR REPLY', 'Explain the supported delivery next step')] },
  'instagram-quick-reply-booking-question': { title: 'One booking question. One next step.', kind: 'chat', note: 'A booking link is not a confirmed appointment.', items: [item('CUSTOMER', '“How do I book?”'), item('YOUR REPLY', 'Name the service and next step'), item('BOOKING PAGE', 'Confirm current availability')] },
  'compare-instagram-dm-automation-tools': { title: 'Compare the workflow, not the promises', kind: 'matrix', note: 'Verify current capabilities and limits before choosing a tool.', items: [item('TRIGGERS', 'The interactions you actually need'), item('ACTIONS', 'Public reply, DM and human follow-up'), item('LIMITS', 'Account access, usage and support')] },
  'instagram-post-scheduler-vs-instagram-automation': { title: 'Publishing and responding are different jobs', kind: 'decision', note: 'AP3K handles supported interactions after publication.', items: [item('SCHEDULER', 'Prepare and publish'), item('LIVE POST', 'Confirm the media'), item('DM AUTOMATION', 'Eligible interactions')] },
};
const short = (s: string, max = 100) => {
  const clean = s.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const end = clean.slice(0, max + 1).lastIndexOf(' ');
  return clean.slice(0, end > 0 ? end : max).replace(/[,:;.]$/, '') + '…';
};
function chooseKind(post: CoverPost): CoverKind {
  const topic = post.slug;
  if (/quick-reply|message-template|reply-template|final-message|opening-message|button-label/.test(topic)) return 'chat';
  if (/vs-|alternative|compar|tool-|test-case|scorecard|evaluation/.test(topic)) return 'matrix';
  if (/report|metric|attribution|measurement|date-range|cost-model|cohort|sample|traffic/.test(topic)) return 'report';
  if (/lead-|leads-|qualification|consultation/.test(topic)) return 'funnel';
  if (/failure|failed|not-|missing|incident|troubleshoot|error/.test(topic)) return 'incident';
  if (/boundar|fallback|scope|decision|tone-|human-handoff/.test(topic)) return 'decision';
  if (/calendar|schedul|launch|campaign|webinar/.test(topic)) return 'calendar';
  if (/reel|carousel|portfolio|preview/.test(topic)) return 'reel';
  if (/pdf|checklist|knowledge|library|resource|audit|template|review/.test(topic)) return 'document';
  if (/retire|sunset|pause|evergreen|update|change|version/.test(topic)) return 'lifecycle';
  return 'flow';
}
export function buildCoverPlan(post: CoverPost): CoverPlan {
  const category = short(post.category || 'Instagram field notes', 52);
  if (Object.prototype.hasOwnProperty.call(editorial, post.slug)) return { ...editorial[post.slug], category };
  const sections = post.sections || [];
  const workflow = sections.flatMap(s => s.steps || []);
  const headings = sections.filter(s => !/where ap3k fits|continue with|related|worked example|what to avoid|the decision|practical workflow|how to judge/i.test(s.heading));
  let items = workflow.length >= 3 ? workflow.slice(0, 3).map((s, i) => item(['PREPARE', 'CONFIGURE', 'VERIFY'][i], short(s.body, 78))) : headings.slice(0, 3).map(s => item(short(s.heading.replace(/^\d+[.)]\s*/, ''), 53), short(s.bullets?.[0] || s.paragraphs[0] || s.heading, 78)));
  const compact = Object.prototype.hasOwnProperty.call(compactSteps, post.slug)
    ? (compactSteps as Record<string, string[]>)[post.slug] : undefined;
  if (compact) items = compact.map(step => { const [label, detail] = step.split('|'); return item(label, detail); });
  while (items.length < 3) items.push(item(['THE QUESTION', 'THE WORKFLOW', 'THE NEXT STEP'][items.length], ['Explore this article’s topic', 'Read the practical guide', 'Apply the relevant checks'][items.length]));
  const title = short(post.title.replace(/: The Practical Guide$/, ''), 110);
  const note = post.sections?.length ? 'Article workflow · Read the guide for the full steps and limitations.' : 'AP3K field notes · Practical Instagram automation guides';
  return { title, category, kind: chooseKind(post), note, items };
}
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
function text(s: string, x: number, y: number, size: number, fill = '#f7f5ff', weight = 500, maxChars = 45, lineHeight = 1.24, maxLines = 3) {
  const lines: string[] = [];
  for (const word of s.split(/\s+/)) {
    if (!lines.length || `${lines[lines.length - 1]} ${word}`.length > maxChars) lines.push(word);
    else lines[lines.length - 1] += ` ${word}`;
  }
  if (lines.length > maxLines) { lines.splice(maxLines); lines[maxLines - 1] = short(lines[maxLines - 1], maxChars - 1).replace(/[….,;:]$/, '') + '…'; }
  return `<text x="${x}" y="${y}" fill="${fill}" font-size="${size}" font-weight="${weight}" font-family="DejaVu Sans,Arial,sans-serif">${lines.map((line, i) => `<tspan x="${x}" dy="${i ? size * lineHeight : 0}">${esc(line)}</tspan>`).join('')}</text>`;
}
const rect = (x: number, y: number, w: number, h: number, fill = '#222036', radius = 20, stroke = '#45405e') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`;
const line = (x1: number,y1: number,x2: number,y2: number, stroke='#a78bfa', dash='') => `<path d="M${x1} ${y1}L${x2} ${y2}" fill="none" stroke="${stroke}" stroke-width="4" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`;
const arrow = (x: number, y: number) => `<path d="M${x} ${y}h40m-12-12 12 12-12 12" fill="none" stroke="#bda6ff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`;
function icon(kind: string, x: number, y: number, color = '#c4b5fd') {
  const paths: Record<string, string> = {
    flow: '<path d="M4 8h44v30H24L12 48V38H4Z"/><path d="M13 18h25M13 26h18"/>',
    calendar:'<rect x="5" y="9" width="42" height="38" rx="6"/><path d="M5 20h42M16 3v12M36 3v12M16 28h4M29 28h6M16 37h4M29 37h6"/>',
    document:'<path d="M12 3h22l10 10v36H12Z M34 3v12h10M20 24h16M20 32h16M20 40h10"/>',
    check:'<circle cx="26" cy="26" r="22"/><path d="m15 26 8 8 15-17"/>',
    clock:'<circle cx="26" cy="26" r="23"/><path d="M26 10v16l12 8"/>',
    link:'<path d="m22 15 6-6a11 11 0 0 1 16 16l-8 8M30 37l-6 6A11 11 0 0 1 8 27l8-8M18 34l17-17"/>',
    report:'<path d="M6 3v44h43M16 37V25M28 37V16M40 37V7"/>',
    shield:'<path d="m26 3 20 8v16q0 14-20 24Q6 41 6 27V11Z"/><path d="m16 25 7 8 14-17"/>',
    person:'<circle cx="26" cy="15" r="10"/><path d="M7 48v-8a19 19 0 0 1 38 0v8"/>',
  };
  return `<g transform="translate(${x} ${y})" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${paths[kind] || paths.document}</g>`;
}
function card(i: CoverPlan['items'][number], x: number, y: number, width: number, height: number, n: number, kind='document') {
  return rect(x,y,width,height) + `<g transform="translate(${x+24} ${y+24}) scale(1.55)">${icon(kind,0,0)}</g>` + text(String(n+1).padStart(2,'0'),x+width-62,y+54,24,'#9387b0',700) + text(i.label,x+24,y+158,28,'#e0d3fb',700,Math.floor((width-48)/18),1.15,3) + text(i.detail,x+24,y+height-35,20,'#f7f5ff',500,27,1.15,1);
}
export function renderCoverSvg(p: CoverPlan): string {
  let body = '';
  const a = p.items;
  if (p.kind === 'clocks') {
    for (let i=0;i<2;i++) {
      const x = 330+i*530;
      body += `<circle cx="${x}" cy="393" r="94" fill="#211d34" stroke="#a78bfa" stroke-width="4"/>`;
      for (let j=0;j<12;j++) {const angle=j*Math.PI/6; body+=line(x+Math.sin(angle)*76,393-Math.cos(angle)*76,x+Math.sin(angle)*84,393-Math.cos(angle)*84,'#817394');}
      body+=line(x,393,x,341,'#f4edff')+line(x,393,x+(i ? -36 : 36),417,'#f4edff')+text(a[i].label,x-174,532,29,'#d8c9ff',700)+text(a[i].detail,x-160,574,25,'#ded9eb',500,26);
    }
    body+=text('ZONE + DATE',484,386,24,'#c4b5fd',700)+text('VERIFY',525,421,22,'#a99bbf',600)+text(a[2].detail,340,640,24,'#e2dcef',500,58);
  } else if (p.kind === 'chat') {
    a.forEach((v,i)=> {const x=i===0?420:i===1?80:220; const y=264+i*131; body+=rect(x,y,700,112,i===0?'#45306f':'#232137',20,i===0?'#a78bfa':'#45405e')+text(v.label,x+23,y+34,20,'#cdbbf7',700,47)+text(v.detail,x+23,y+71,25,'#fff',500,45);});
  } else if (p.kind === 'calendar') {
    body+=rect(70,265,1060,376,'#1d1c2c',22)+text('CONTENT',98,309,20,'#a99bbf',700)+text('OFFER / LAUNCH CHECK',440,309,20,'#a99bbf',700);
    a.forEach((v,i)=> {const y=334+i*96; body+=rect(89,y,300,79,'#35264f',13,'#53426e')+text(v.label,110,y+31,21,'#ede3ff',700,22)+text(v.detail,429,y+34,25,'#eeeaf6',500,43);});
  } else if (p.kind === 'matrix' || p.kind === 'report') {
    body+=rect(70,264,1060,380,'#1d1c2c',22)+text(p.kind==='matrix'?'EVALUATION WORKSHEET':'MEASUREMENT NOTES',98,310,21,'#c7b3f2',700)+text(p.kind==='matrix'?'VERIFY':'SOURCE',966,310,19,'#a99bbf',700);
    a.forEach((v,i)=> {const y=329+i*99; body+=line(94,y,1106,y,'#3d3650')+text(v.label,103,y+31,20,'#d9caff',700,58)+text(v.detail,103,y+65,24,'#faf8ff',500,57)+icon(p.kind==='matrix'?'check':'report',995,y+24);});
  } else if (p.kind === 'reel') {
    body+=rect(84,263,260,382,'#171523',34,'#a78bfa')+rect(105,287,218,201,'#42305f',18,'#42305f')+`<path d="m188 349 55 34-55 34Z" fill="#dbcaff"/>`+text('RESOURCE',121,532,22,'#e6dcfa',700)+text('PREVIEW',121,563,22,'#e6dcfa',700)+rect(116,588,191,30,'#7c3aed',10,'#7c3aed');
    a.forEach((v,i)=>{const y=266+i*126;body+=rect(407,y,720,108)+text(v.label,430,y+34,20,'#c8b3f7',700,48)+text(v.detail,430,y+72,25,'#f7f5ff',500,44);});
  } else if (p.kind === 'reschedule') {
    body+=rect(82,271,295,340,'#292236')+icon('calendar',202,291)+text('FRI',126,416,59,'#a79bb8',700)+line(120,394,312,428,'#b69dd6')+text('MON',121,508,59,'#ece1ff',700)+text('NEW LAUNCH',126,559,21,'#baa6d4',700);
    a.forEach((v,i)=> {const y=265+i*125;body+=rect(422,y,704,108)+text(v.label,445,y+33,21,'#d7c8f5',700,44)+text(v.detail,445,y+72,24,'#f8f5ff',500,43);});
  } else if (p.kind === 'funnel') {
    a.forEach((v,i)=> {const x=90+i*85,y=264+i*128,w=1020-i*170;body+=rect(x,y,w,112,i===2?'#483168':'#282138')+text(v.label,x+25,y+33,21,'#e0d1fc',700,Math.floor(w/14))+text(v.detail,x+25,y+73,24,'#fcfaff',500,Math.floor((w-50)/13));});
  } else if (p.kind === 'approval' || p.kind === 'document' || p.kind === 'incident') {
    body+=rect(85,262,1030,388,'#211e31',24)+icon(p.kind==='incident'?'shield':'document',105,282);
    a.forEach((v,i)=> {const y=280+i*116;body+=`<circle cx="${p.kind==='incident'?190:190}" cy="${y+35}" r="19" fill="#5b3c88"/>`+text(String(i+1),183,y+43,22,'#fff',700)+text(v.label,232,y+29,23,'#dacaf9',700,57)+text(v.detail,232,y+70,24,'#f7f5ff',500,58);});
  } else if (p.kind === 'decision') {
    body+=card(a[0],70,271,313,335,0,'shield')+card(a[1],444,305,312,335,1,'flow')+card(a[2],817,271,313,335,2,'person')+arrow(393,431)+arrow(766,431);
  } else if (p.kind === 'batch') {
    a.forEach((v,i)=>{const x=72+i*377;body+=rect(x,278,304,345,'#272036')+rect(x+20,298,264,82,'#503074',14)+text(v.label,x+42,349,30,'#fff',700)+icon('link',x+128,405)+text(v.detail,x+25,505,26,'#f7f5ff',500,18);});
  } else if (p.kind === 'lifecycle') {
    a.forEach((v,i)=>{const x=73+i*379;body+=card(v,x,280,302,333,i,['clock','link','shield'][i]);if(i<2)body+=arrow(x+315,443);});
    body+=`<path d="M981 630v20H222v-20" fill="none" stroke="#837091" stroke-width="3" stroke-dasharray="8 8"/>`;
  } else {
    a.forEach((v,i)=>{const x=70+i*378;body+=card(v,x,281,306,340,i,['flow','shield','link'][i]);if(i<2)body+=arrow(x+316,447);});
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#191426"/><stop offset="1" stop-color="#0d111b"/></linearGradient></defs><rect width="1200" height="675" fill="url(#bg)"/><rect x="0" y="0" width="1200" height="7" fill="#8b5cf6"/>${text('AP3K',64,59,29,'#fff',800)}${text(p.category.toUpperCase(),188,56,18,'#aa9abc',600,85)}${text(p.title,64,124,p.title.length>83?38:43,'#fcfaff',700,p.title.length>83?42:38,1.16)}${body}${rect(0,648,1200,27,'#171221',0,'#171221')}${text(p.note,65,667,14,'#b8a9c9',500,150)}</svg>`;
}
