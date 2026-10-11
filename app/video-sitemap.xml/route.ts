import { POST_AUTOMATION_VIDEO as video } from '@/lib/tutorial-video';
export const dynamic = 'force-static';
const escape = (value:string) => value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!));
export function GET(){
 const xml=`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"><url><loc>https://ap3k.com${video.path}</loc><video:video><video:thumbnail_loc>${escape(video.thumbnail)}</video:thumbnail_loc><video:title>${escape(video.title)}</video:title><video:description>${escape(video.description)}</video:description><video:player_loc>${escape(video.embed)}</video:player_loc><video:duration>184</video:duration><video:publication_date>${video.uploaded}</video:publication_date></video:video></url></urlset>`;
 return new Response(xml,{headers:{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'public, max-age=3600'}});
}
