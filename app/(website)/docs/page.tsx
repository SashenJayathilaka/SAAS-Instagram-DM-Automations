import type {Metadata} from 'next';
import Link from 'next/link';
import {ArrowRight,BookOpen,Clapperboard,MessagesSquare,Workflow,LifeBuoy,Rocket,PlayCircle} from 'lucide-react';
import {DOCS_ARTICLES,DOCS_GROUPS} from '@/lib/docs';
import ProductVideo from '@/components/website/product-video';
import {TutorialVideo} from '@/components/docs/tutorial-video';
import styles from '@/components/docs/docs.module.css';
export const metadata:Metadata={title:'AP3K Documentation',description:'Step-by-step guides for connecting Instagram, creating automations, sending DMs, and troubleshooting AP3K.',alternates:{canonical:'/docs',languages:{en:'/docs','x-default':'/docs'}},openGraph:{title:'AP3K Documentation',url:'https://ap3k.com/docs'}};
const icons=[Rocket,Clapperboard,PlayCircle,MessagesSquare,Workflow,LifeBuoy];
const featured=['getting-started','post-automation','story-automation','chat-automation','flow-builder','troubleshoot'];
export default function DocsPage(){return <>
 <section className={styles.startHere} aria-labelledby="start-here"><h2 id="start-here">What would you like to do?</h2><div className={styles.questions}>{[
 ['getting-started/connect-instagram-account','Connect your Instagram account'],
 ['post-automation/create-instagram-comment-to-dm-automation','Send a DM from a comment'],
 ['post-automation/ai-public-comment-replies','Set up AI comment replies'],
 ['troubleshoot/fix-instagram-automation-not-working','Fix an automation that is not replying'],
 ].map(([slug,title])=><Link key={slug} href={`/docs/${slug}`}>{title}<ArrowRight size={16}/></Link>)}</div></section>
 <section className={styles.homeSection}><h2>Browse by topic</h2><div className={styles.topics}>{featured.map((id,index)=>{const group=DOCS_GROUPS.find(g=>g.id===id)!;const articles=DOCS_ARTICLES.filter(a=>a.group===id);const Icon=icons[index]||BookOpen;return <Link key={id} className={styles.topic} href={`/docs/${articles[0].slug}`}><div className={styles.topicArt}><Icon size={27} strokeWidth={1.5}/></div><div className={styles.topicCopy}><h3>{group.title}</h3><p>{group.description}</p><small>{articles.length} articles</small></div></Link>})}</div></section>
 <section className={styles.homeSection}><h2>Create your first automation</h2><p>Follow the complete walkthrough using the AP3K Instagram account.</p><TutorialVideo/><Link href="/docs/post-automation/create-instagram-comment-to-dm-automation">Read the step-by-step guide →</Link></section>
 <section className={styles.homeSection}><h2>AP3K in 36 seconds</h2><ProductVideo/></section>
 <section className={styles.homeSection}><h2>Advanced integrations</h2><p>Already comfortable with AP3K? Connect an AI client to supported workspace tools.</p><div className={styles.questions}>{DOCS_ARTICLES.filter(a=>a.group==='ai-connectors-mcp').map(a=><Link key={a.slug} href={`/docs/${a.slug}`}>{a.title}<ArrowRight size={16}/></Link>)}</div></section>
 <section className={styles.homeSection}><h2>Common questions</h2><div className={styles.questions}>{['getting-started/connect-instagram-account','post-automation/instagram-automation-triggers','troubleshoot/fix-instagram-automation-not-working','getting-started/ap3k-plans-and-pricing','post-automation/ai-public-comment-replies','queue/how-the-dm-queue-works'].map(slug=>{const a=DOCS_ARTICLES.find(a=>a.slug===slug);return a&&<Link key={slug} href={`/docs/${slug}`}>{a.title}<ArrowRight size={16}/></Link>})}</div></section>
 </>}
