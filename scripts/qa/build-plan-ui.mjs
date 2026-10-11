// Generates a static fixture for preview-only visual checks; remove before merge.
import {build,transform} from 'esbuild';import loadConfig from 'tailwindcss/loadConfig.js';import fs from 'node:fs/promises';import postcss from 'postcss';import tailwind from 'tailwindcss';
const mocks={
 '@/lib/i18n/translate':`export const translateUi=s=>s;`,
 'next/image':`import React from 'react';export default function Image({src,priority,unoptimized,fill,sizes,...p}){return <img src={src} {...p}/>}`,
 'next/link':`import React from 'react';export default function Link({children,...p}){return <a {...p}>{children}</a>}`,
 'next/navigation':`export const useRouter=()=>({refresh(){}});`,
 '@/providers/i18n-provider':`export const useI18n=()=>({locale:'en'});`,
 '@/components/i18n/localized-copy':`import React from 'react';export const UiText=({children})=><>{children}</>;`,
 '@/components/i18n/dashboard-values':`import React from 'react';export const MetricValue=({value})=><>{value}</>;export const UiMessage=({source})=><>{source}</>;`,
 '@/actions/automation':`export const activateAutomation=async()=>({status:200});export const deleteAutomation=async()=>({status:200});export const duplicateAutomation=async()=>({status:200});`,
 '@/actions/automation-tools':`export const getBacktrackInfo=async()=>null;`,
 '@/components/automations/saved-automation-tools':`export default ()=>null;export const showPublishedTools=()=>false;`,
};
await build({entryPoints:['scripts/qa/plan-ui.tsx'],outfile:'/tmp/ap3k-plan-ui.js',bundle:true,minify:true,jsx:'automatic',define:{'process.env.NODE_ENV':'"production"','process.env':'{}'},plugins:[{name:'fixture',setup(b){b.onResolve({filter:/.*/},args=>mocks[args.path]?{path:args.path,namespace:'fixture'}:undefined);b.onLoad({filter:/.*/,namespace:'fixture'},args=>({contents:mocks[args.path],loader:'jsx',resolveDir:process.cwd()}));}}]});
const css=(await postcss([tailwind({...loadConfig(process.cwd()+'/tailwind.config.ts'),content:['components/dashboard/automation-table.tsx','scripts/qa/plan-ui.tsx','components/ui/dropdown-menu.tsx']})]).process(await fs.readFile('app/globals.css','utf8'),{from:undefined})).css;
const js=await fs.readFile('/tmp/ap3k-plan-ui.js','utf8');
await fs.mkdir('public/__plan-review',{recursive:true});
await fs.writeFile('public/__plan-review/table.html',`<!doctype html><html><head><meta name="robots" content="noindex,nofollow"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AP3K plan pause review</title><style>${(await transform(css,{loader:"css",minify:true})).code}</style></head><body><div id="root"></div><script>${js.replaceAll('</script','<\\/script')}</script></body></html>`);
await fs.writeFile('public/__plan-review/index.html',`<!doctype html><html><head><meta name="robots" content="noindex,nofollow"><title>AP3K responsive review</title></head><body style="margin:0;background:#555"><iframe title="Automation table preview" style="display:block;height:1000px;margin:auto;border:0"></iframe><script>const p=new URLSearchParams(location.search);const f=document.querySelector('iframe');f.style.width=(Number(p.get('width'))||1440)+'px';f.src='table.html?theme='+encodeURIComponent(p.get('theme')||'light');</script></body></html>`);
