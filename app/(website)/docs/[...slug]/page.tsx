import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound,permanentRedirect} from 'next/navigation';
import {ArrowRight} from 'lucide-react';
import {DOCS_ARTICLES,getDocsArticle} from '@/lib/docs';
import {articleWithScreenshots} from '@/lib/docs/screenshots';
import {ArticleInteractions,TableOfContents} from '@/components/docs/article-interactions';
import {TutorialVideo} from '@/components/docs/tutorial-video';
import styles from '@/components/docs/docs.module.css';
type Props={params: Promise<{slug:string[]}>};
export function generateStaticParams(){return DOCS_ARTICLES.map(a=>({slug:a.slug.split('/')}))}
export async function generateMetadata(props:Props):Promise<Metadata> {
 const params = await props.params;
 const article=getDocsArticle(params.slug.join('/').replace(/linktodm/gi,'ap3k'));if(!article)return{};return{title:`${article.title} | AP3K Docs`,description:article.description,authors:[{name:'AP3K'}],alternates:{canonical:`/docs/${article.slug}`,languages:{en:`/docs/${article.slug}`,'x-default':`/docs/${article.slug}`}},openGraph:{title:article.title,description:article.description,url:`https://ap3k.com/docs/${article.slug}`,type:'article'}}
}
export default async function DocsArticlePage(props:Props) {
 const params = await props.params;
 const raw=params.slug.join('/');const slug=raw.replace(/linktodm/gi,'ap3k');const article=getDocsArticle(slug);if(!article)notFound();if(raw!==slug)permanentRedirect(`/docs/${slug}`);const index=DOCS_ARTICLES.indexOf(article);const related=DOCS_ARTICLES.filter(a=>a.group===article.group&&a.slug!==slug).slice(0,3);const words=article.html.replace(/<[^>]+>/g,' ').split(/\s+/).length;
 const schema={'@context':'https://schema.org','@graph':[{'@type':'TechArticle',headline:article.title,description:article.description,dateModified:article.updated,author:{'@type':'Organization',name:'AP3K'},mainEntityOfPage:`https://ap3k.com/docs/${slug}`},{'@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'Documentation',item:'https://ap3k.com/docs'},{'@type':'ListItem',position:2,name:article.title,item:`https://ap3k.com/docs/${slug}`}]}]};
 return <div className={styles.articleLayout}><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema).replace(/</g,'\\u003c')}}/><article className={styles.article}><h1>{article.title}</h1><p className={styles.metadata}><span>{Math.max(1,Math.ceil(words/220))} min read</span><span>·</span><span>Updated <time dateTime={article.updated}>{new Intl.DateTimeFormat('en',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'}).format(new Date(`${article.updated}T00:00:00Z`))}</time></span><span>·</span><span>AP3K</span></p><details className={styles.mobileToc}><summary>On this page</summary>{article.headings.filter(h=>h.level===2).map(h=><a key={h.id} href={`#${h.id}`}>{h.text}</a>)}</details>{article.video&&<TutorialVideo/>}<div id="docs-article-content" className={styles.prose} dangerouslySetInnerHTML={{__html:articleWithScreenshots(slug,article.html)}}/><ArticleInteractions slug={slug}/>{related.length>0&&<section className={styles.related}><h2>Related articles</h2>{related.map(a=><Link key={a.slug} href={`/docs/${a.slug}`}>{a.title}<ArrowRight size={16}/></Link>)}</section>}<nav className={styles.pager} aria-label="Article navigation">{DOCS_ARTICLES[index-1]&&<Link href={`/docs/${DOCS_ARTICLES[index-1].slug}`}><small>← Previous</small>{DOCS_ARTICLES[index-1].title}</Link>}{DOCS_ARTICLES[index+1]&&<Link href={`/docs/${DOCS_ARTICLES[index+1].slug}`}><small>Next →</small>{DOCS_ARTICLES[index+1].title}</Link>}</nav></article><TableOfContents headings={article.headings}/></div>;
}
