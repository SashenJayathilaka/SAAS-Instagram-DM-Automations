// Explicit UI fixture. Generated assets are temporary and removed before merge.
import {build} from 'esbuild';import fs from 'node:fs/promises';import path from 'node:path';import postcss from 'postcss';import tailwind from 'tailwindcss';
const mocks={
 'next/image':`import React from 'react';export default function Image({src,priority,unoptimized,fill,sizes,...p}){return <img src={src} {...p} style={fill?{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover'}:undefined}/>}`,
 'next/link':`import React from 'react';export default function Link({children,...p}){return <a {...p}>{children}</a>}`,
 'next/font/google':`export const Inter=()=>({className:''});`,
 '@/components/i18n/use-ui':`export const useUi=()=>s=>s;`,
 '@/providers/i18n-provider':`export const useI18n=()=>({locale:'en'});`,
 '@/components/i18n/localized-copy':`import React from 'react';export const UiText=({children})=><>{children}</>;`,
 '@/components/i18n/dashboard-values':`import React from 'react';export const UiMessage=({source})=><>{source}</>;`,
 '@/components/global/language-switcher':`import React from 'react';export default ()=> <button>EN</button>;`,
 '@/components/global/theme-toggle':`import React from 'react';export default ()=> <button aria-label='Toggle theme' onClick={()=>document.documentElement.classList.toggle('dark')}>◐</button>;`,
 '@/actions/automation-copy':`let n=0;export const generateAutomationCopyAction=async({mode,count})=>({ok:true,items:mode==='COMMENT_PROMPT'?['Thank Username warmly and invite them to check DMs. Use one friendly emoji.']:mode==='COMMENT_REPLIES'?['Thanks for your interest! Check your DMs 😊']:mode==='COMMENT_SAMPLES'?['Thanks {{username}}! Check your DMs 😊']:Array.from({length:count===1?1:5},()=>['Thanks for your interest! Tap below for the guide.','Your guide is ready below. Enjoy!','Here is your guide — tap the button below.','Explore the guide with the button below.','Tap below to open your copy of the guide.','Ready to explore? Your guide is one tap away.','Happy reading! Open the guide using the button below.'][n++%7])});`,
};
await build({entryPoints:['scripts/copy-ui-preview/main.tsx'],outfile:'/tmp/ap3k-copy-ui.js',bundle:true,minify:true,jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'fixture',setup(b){b.onResolve({filter:/.*/},args=>mocks[args.path]?{path:args.path,namespace:'fixture'}:undefined);b.onLoad({filter:/.*/,namespace:'fixture'},args=>({contents:mocks[args.path],loader:'jsx',resolveDir:process.cwd()}));}}]});
const css=(await postcss([tailwind('./tailwind.config.ts')]).process(await fs.readFile('app/globals.css','utf8'),{from:undefined})).css;
const localCss=await fs.readFile('/tmp/ap3k-copy-ui.css','utf8');const js=await fs.readFile('/tmp/ap3k-copy-ui.js','utf8');
await fs.writeFile('public/copy-editor-fixture.html',`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>AP3K editor UI review</title><style>${css}\n${localCss}</style></head><body><div id="root"></div><script>${js.replaceAll('</script','<\\/script')}</script></body></html>`);
await fs.writeFile('public/copy-editor-review.html',`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>AP3K responsive review</title></head><body style="margin:0;background:#555"><iframe title="Editor preview" style="display:block;height:900px;margin:auto;border:0"></iframe><script>const w=Number(new URLSearchParams(location.search).get('width'))||1440;const f=document.querySelector('iframe');f.style.width=w+'px';f.src='/copy-editor-fixture.html';</script></body></html>`);
