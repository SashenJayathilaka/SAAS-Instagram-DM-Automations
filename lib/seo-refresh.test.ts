import {describe,it,expect} from 'vitest';
import {readFileSync,existsSync} from 'node:fs';
import {buildSitemap} from './sitemap';
import {GET} from '@/app/video-sitemap.xml/route';
import {POST_AUTOMATION_VIDEO} from './tutorial-video';
import {isServiceReturn} from './google-analytics';
import {DOCS_ARTICLES} from './docs';
import {BLOG_POSTS} from './blog';
describe('October SEO refresh',()=>{
 it('excludes retired resources and includes the canonical tutorial and comparison article',()=>{
  const urls=buildSitemap().map(p=>p.url);
  for(const slug of ['instagram-growth-library','instagram-comment-to-dm-templates'])expect(urls.some(u=>u.includes(`/resources/${slug}`))).toBe(false);
  expect(urls).toContain('https://ap3k.com'+POST_AUTOMATION_VIDEO.path);
  expect(urls).toContain('https://ap3k.com/blog/manychat-vs-ap3k-pricing-for-instagram');
 });
 it('provides discoverable, consistent video metadata with a watchable page',async()=>{
  const response=GET();const xml=await response.text();
  expect(response.headers.get('content-type')).toContain('application/xml');
  for(const value of [POST_AUTOMATION_VIDEO.path,POST_AUTOMATION_VIDEO.embed,POST_AUTOMATION_VIDEO.uploaded,POST_AUTOMATION_VIDEO.thumbnail])expect(xml).toContain(value);
  const page=readFileSync('app/(website)/tutorials/instagram-comment-to-dm/page.tsx','utf8');
  expect(page).toContain("'@type':'VideoObject'");expect(page).toContain('<iframe');
 });
 it('keeps pricing article links useful and local screenshots present',()=>{
  const article=BLOG_POSTS.find(p=>p.slug==='manychat-vs-ap3k-pricing-for-instagram')!;
  for(const link of article.sections.flatMap(s=>s.links||[]))if(link.href.startsWith('/docs/'))expect(DOCS_ARTICLES.some(a=>'/docs/'+a.slug===link.href)).toBe(true);
  for(const name of ['dashboard','automations','contacts','inbox','ai-overview','ai-knowledge','ai-behavior','ai-playground','billing','referrals','settings'])expect(existsSync(`public/images/docs/${name}.webp`)).toBe(true);
 });
 it('ignores only known authentication and payment return referrers',()=>{
  expect(isServiceReturn('https://accounts.google.com/')).toBe(true);
  expect(isServiceReturn('https://checkout.stripe.com/')).toBe(true);
  expect(isServiceReturn('https://google.com/search')).toBe(false);
  expect(isServiceReturn('https://accounts.google.com.evil.example')).toBe(false);
  expect(isServiceReturn('bad url')).toBe(false);
 });
});
