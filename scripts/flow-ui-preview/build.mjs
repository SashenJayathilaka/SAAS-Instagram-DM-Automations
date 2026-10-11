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
const mocks = {
 '@/actions/automation/flow': `export const saveAutomationFlow=async()=>({status:400,error:'Isolated preview: nothing is saved or sent.'});`,
 'next/link': `import React from 'react';export default function Link({children,...props}){return <a {...props} onClick={e=>{e.preventDefault();window.location.search=new URL(props.href,window.location.href).search}}>{children}</a>}`,
 'next/navigation': `export const useRouter=()=>({push:()=>{},refresh:()=>{}});`,
 '@tanstack/react-query': `export const useQueryClient=()=>({invalidateQueries:async()=>{}});`,
 '@/actions/automation': `export const saveMessageAutomation=async()=>({status:400,data:'Preview fixture — no changes are saved.'});`,
 '@/actions/ai-conversation': `export const generateConversationPlan=async()=>({ok:true,tasks:['Ask what the customer wants to create','Recommend the relevant prompt collection','Share the approved link when useful']});export const previewAiConversation=async()=>({ok:true,reply:'You can explore the prompt library at Ceptice. What kind of image would you like to create?',linkButton:{label:'Explore prompts',url:'https://ceptice.com'}});`,
 'next/image': `import React from 'react';export default function Image({src,priority,unoptimized,fill,sizes,...p}){return <img src={src} {...p}/>}`,
 '@/components/i18n/use-ui': `export const useUi=()=>s=>s;`,
 '@/components/i18n/localized-copy': `import React from 'react';export const UiText=({children})=><>{children}</>;`,
 '@/components/i18n/dashboard-values': `import React from 'react';export const UiMessage=({source})=><>{source}</>;`,
};
await build({entryPoints:['scripts/flow-ui-preview/main.tsx'],outfile:path.join(out,'app.js'),bundle:true,jsx:'automatic',define:{'process.env.NODE_ENV':'"development"'},plugins:[{name:'fixtures',setup(b){b.onResolve({filter:/.*/},args=>mocks[args.path]?{path:args.path,namespace:'fixture'}:undefined);b.onLoad({filter:/.*/,namespace:'fixture'},args=>({contents:mocks[args.path],loader:'jsx',resolveDir:process.cwd()}));}}]});
const css=(await fs.readFile('app/globals.css','utf8'));
const processed=await postcss([tailwind('./tailwind.config.ts')]).process(css,{from:path.join(out,'app.css')});
const js=await fs.readFile(path.join(out,'app.js'),'utf8');
await fs.writeFile(path.join(out,'index.html'),`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AP3K Automation UI fixture</title><style>${processed.css}</style></head><body><div id="root"></div><script>${js.replaceAll('</script','<\\/script')}</script></body></html>`);
console.log('UI fixture built');
