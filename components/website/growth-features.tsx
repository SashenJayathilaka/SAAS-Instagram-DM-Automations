import Link from "next/link";
import { ArrowRight, MessageCircle, Sparkles, ShoppingBag, Users } from "lucide-react";
import { UiText } from "@/components/i18n/localized-copy";
import { FadeIn } from "@/components/global/motion/fade-in";
import { getServerLocale } from "@/lib/i18n/server";
import { localizePublicPath } from "@/lib/i18n/config";
const features = [
  { icon: MessageCircle, title: "Comment automation", body: "Turn a comment into a useful conversation.", href: "/instagram-comment-to-dm", steps: ["Comment", "Reply", "DM"] },
  { icon: Sparkles, title: "AI conversations", body: "Answer questions and guide customers", href: "/instagram-dm-automation", steps: ["Question", "AI", "Answer"] },
  { icon: ShoppingBag, title: "Product links", body: "Share a photo and your offer", href: "/instagram-automation-for-ecommerce", steps: ["Product", "Photo", "Link"] },
  { icon: Users, title: "Lead capture", body: "Keep interested people and their details in one place.", href: "/instagram-automation-for-creators", steps: ["Conversation", "Email", "Contact"] },
];
export default function GrowthFeatures() {
  const locale = getServerLocale();
  return <section className="px-4 py-14 sm:px-8 sm:py-20" aria-labelledby="growth-features-title"><div className="mx-auto max-w-6xl"><FadeIn className="mb-9"><p className="ap3k-kicker"><UiText>Built for the next conversation</UiText></p><h2 id="growth-features-title" className="mt-3 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl"><UiText>Less inbox work. More possibilities.</UiText></h2></FadeIn>
    <div className="grid gap-4 sm:grid-cols-2">{features.map(({icon: Icon, ...item}, index) => <FadeIn delay={index * 0.035} key={item.title}><Link href={localizePublicPath(item.href,locale)} className="group flex h-full flex-col rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm transition-[border-color,box-shadow,transform] duration-200 hover:border-violet-300 hover:shadow-lg motion-safe:hover:-translate-y-1 dark:border-white/10 dark:bg-[#111320] dark:hover:border-violet-400/40 sm:p-8"><div className="flex items-center justify-between"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-violet-50 text-violet-700 dark:bg-violet-400/10 dark:text-violet-300"><Icon className="h-5 w-5" /></span><ArrowRight className="h-4 w-4 text-slate-400" /></div><h3 className="mt-5 text-xl font-bold"><UiText>{item.title}</UiText></h3><p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400"><UiText>{item.body}</UiText></p><div aria-hidden="true" className="mt-6 flex flex-wrap items-center gap-2 rounded-2xl bg-slate-50 p-4 dark:bg-white/[0.03]">{item.steps.map((step,i)=><span key={step} className="contents">{i > 0 && <ArrowRight className="h-3 w-3 text-slate-400" />}<span className="rounded-lg border border-slate-200/60 bg-white px-3 py-2 text-xs font-semibold text-slate-600 dark:border-white/5 dark:bg-white/5 dark:text-slate-300"><UiText>{step}</UiText></span></span>)}</div></Link></FadeIn>)}</div>
  </div></section>;
}
