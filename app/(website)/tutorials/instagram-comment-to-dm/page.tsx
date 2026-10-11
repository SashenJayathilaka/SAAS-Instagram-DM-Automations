import type { Metadata } from 'next';
import Link from 'next/link';
import WebsiteNav from '@/components/global/website-nav';
import WebsiteFooter from '@/components/global/website-footer';
import Breadcrumbs from '@/components/seo/breadcrumbs';
import { POST_AUTOMATION_VIDEO as video } from '@/lib/tutorial-video';
const url = `https://ap3k.com${video.path}`;
export const metadata: Metadata = {
  title: `${video.title} — Video Tutorial | AP3K`, description: video.description,
  alternates: {canonical: url, languages: {en:url,'x-default':url}},
  openGraph: {title:video.title,description:video.description,url,type:'video.other',images:[video.thumbnail]},
  twitter: {card:'summary_large_image',title:video.title,description:video.description,images:[video.thumbnail]},
};
export default function Page(){
 const schema = {'@context':'https://schema.org','@type':'VideoObject',name:video.title,description:video.description,thumbnailUrl:[video.thumbnail],uploadDate:video.uploaded,duration:video.duration,embedUrl:video.embed,url,mainEntityOfPage:url,publisher:{'@type':'Organization',name:'AP3K',url:'https://ap3k.com'}};
 return <div className="min-h-screen bg-white text-slate-950 dark:bg-slate-950 dark:text-white"><WebsiteNav/><main className="mx-auto max-w-5xl px-4 py-10 sm:px-8"><Breadcrumbs items={[{name:'Documentation',path:'/docs'},{name:'Comment-to-DM video',path:video.path}]}/><h1 className="my-5 text-3xl font-bold tracking-tight sm:text-5xl">{video.title}</h1><p className="mb-6 text-slate-600 dark:text-slate-300">A complete AP3K walkthrough · 3 minutes 4 seconds</p><div className="aspect-video overflow-hidden rounded-2xl bg-black"><iframe className="h-full w-full border-0" src={video.embed} title={video.title} allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen/></div><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema).replace(/</g,'\\u003c')}}/><section className="mt-10 space-y-5 leading-8"><h2 className="text-2xl font-bold">What you’ll learn</h2><p>{video.description}</p><ol className="list-decimal space-y-3 pl-6"><li>Create a Post automation and choose the Instagram post or Reel.</li><li>Choose Any comment or add keywords such as LINK, GUIDE or INFO.</li><li>Write public comment replies or use AI to generate variations.</li><li>Add the automatic DM, a Get the Link button and your destination URL.</li><li>Review the phone preview, publish and test with a fresh comment from another account.</li></ol><p>Publishing AI replies requires a paid plan. The video demonstrates the editor; successful delivery also depends on Instagram permissions and an eligible interaction.</p><p><Link className="font-semibold text-violet-600 dark:text-violet-300" href="/docs/post-automation/create-instagram-comment-to-dm-automation">Read the full step-by-step guide →</Link></p><p><Link className="font-semibold text-violet-600 dark:text-violet-300" href="/manychat-alternative">Comparing tools? Read AP3K vs ManyChat →</Link></p><p><Link className="inline-flex rounded-xl bg-violet-600 px-6 py-3 font-semibold text-white" href="/sign-up">Create your AP3K account</Link></p></section></main><WebsiteFooter/></div>
}
