// Local-only UI fixture. Never imported by the application or deployed as a route.
import { build } from 'esbuild';
import fs from 'node:fs/promises';
import path from 'node:path';
import postcss from 'postcss';
import tailwind from 'tailwindcss';
const out = process.argv[2];
if (!out) throw new Error('Pass an output directory outside public/');
if (path.resolve(out).startsWith(path.resolve('public'))) throw new Error('Keep fixtures outside public/');
await fs.mkdir(out, {recursive:true});
const sample = `export const getAdminV2Stats=async()=>({totalUsers:128,connectedAccounts:96,activeCampaigns:247,repliesToday:1842,leadsToday:83,failedToday:3}); export const getAdminV2SystemHealth=async()=>({attentionAccounts:2,campaignsNeedingReview:1}); export const getAdminV2RecentActivity=async()=>[];`;
const mocks = {
 'next/link': `import React from 'react';export default React.forwardRef(function Link({href,children,...p},ref){return <a ref={ref} href={href} {...p}>{children}</a>})`,
 'next/image': `import React from 'react';export default function Image({src,priority,unoptimized,fill,...p}){return <img src={'https://ap3k.com'+src} {...p}/>}`,
 'next/navigation': `export const usePathname=()=>'/admin/'+(new URLSearchParams(location.search).get('page')||'overview');export const useRouter=()=>({refresh(){},replace(){},push(){}});`,
 '@/lib/admin': `export const requireOwnerAdmin=async()=>({});`,
  '@/lib/admin-v2/queries': sample + `
 export const getAdminV2Users=async()=>[{id:'sample',email:'alex@example.com',firstname:'Alex',lastname:'Martin',createdAt:new Date('2026-09-24'),plan:'PRO',status:'ACTIVE',accounts:[{id:'ig',instagramUsername:'sample_creator',status:'CONNECTED',expiresAt:null}],automationCount:12,repliesToday:84,leadsToday:21,lastActivity:new Date('2026-09-24')}]; export const getAdminV2UserCount=async()=>1;
 export const getAdminV2Campaigns=async()=>[{id:'sample',name:'Guide delivery',ownerEmail:'alex@example.com',instagramUsername:'sample_creator',active:true,needsReview:false,archivedAt:null,triggerMode:'KEYWORD',keywords:['GUIDE'],postScope:'Specific post',hasPublicReply:true,replyCount:84,leadCount:21,lastActivity:new Date('2026-09-24')}]; export const getAdminV2CampaignCount=async()=>1;`,
 '@/actions/admin/campaign-actions': `export const adminPauseCampaignAction=async()=>({ok:true});export const adminResumeCampaignAction=async()=>({ok:true});`,
 '@/lib/admin-v2/launch-metrics': `export const getLaunchMetrics=async()=>({signups:42,connected:31,firstSend:25,usedThisWeek:18});`,
 '@/lib/admin-v2/analytics': `export const getAdminAnalytics=async()=>({days:7,series:Array.from({length:7},(_,i)=>({date:'2026-09-'+(17+i),signups:4+i,sent:100+i*25,failed:i%3,leads:12+i})),totals:{signups:49,sent:1225,failed:6,leads:105},plans:[],updatedAt:'2026-09-23T12:00:00Z'});`,
 '@/actions/admin/editorial': `export const saveEditorialPost=async()=>({ok:true,version:1,message:'Fixture only: draft was not saved.'});`,
 '@/actions/admin/assistant': `export const adminAssistantAction=async()=>({ok:true,message:'Fixture only: no AI request was sent.'});`,
 '@/components/global/local-time': `import React from 'react';export default function LocalTime({value}){return <time>{new Date(value).toLocaleString('en')}</time>}`,
 '@/components/i18n/use-ui': `export const useUi=()=>s=>s;`,
};
await build({entryPoints:['scripts/admin-ui-preview/main.tsx'],outfile:path.join(out,'app.js'),bundle:true,jsx:'automatic',define:{'process.env.NODE_ENV':'"development"'},plugins:[{name:'fixtures',setup(b){b.onResolve({filter:/.*/},args=>mocks[args.path]?{path:args.path,namespace:'fixture'}:undefined);b.onLoad({filter:/.*/,namespace:'fixture'},args=>({contents:mocks[args.path],loader:'jsx',resolveDir:process.cwd()}));}}]});
const css=(await fs.readFile('app/globals.css','utf8'))+'\n'+(await fs.readFile('app/(protected)/admin/admin.css','utf8'));
const processed=await postcss([tailwind('./tailwind.config.ts')]).process(css,{from:path.join(out,'app.css')});
const js=await fs.readFile(path.join(out,'app.js'),'utf8');
await fs.writeFile(path.join(out,'index.html'),`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AP3K Admin UI fixture</title><style>${processed.css}</style></head><body><div id="root"></div><script>${js.replaceAll('</script','<\\/script')}</script></body></html>`);
console.log('UI fixture built');
