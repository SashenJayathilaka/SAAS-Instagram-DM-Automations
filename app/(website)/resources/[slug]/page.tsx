import Breadcrumbs from "@/components/seo/breadcrumbs";
import WebsiteFooter from "@/components/global/website-footer";
import WebsiteNav from "@/components/global/website-nav";
import { getSeoResource, SEO_RESOURCES } from "@/lib/seo-resources";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return SEO_RESOURCES.map(resource => ({ slug: resource.slug }));
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const resource = getSeoResource(params.slug);
  if (!resource) return {};
  return {
    title: `${resource.title} | Free AP3K Resource`,
    description: resource.description,
    alternates: { canonical: `/resources/${resource.slug}`, languages: { en: `https://ap3k.com/resources/${resource.slug}`, "x-default": `https://ap3k.com/resources/${resource.slug}` } },
    openGraph: { title: resource.title, description: resource.description, url: `https://ap3k.com/resources/${resource.slug}`, type: "article", images: ["https://ap3k.com/opengraph-image"] },
    twitter: { card: "summary_large_image", title: resource.title, description: resource.description, images: ["https://ap3k.com/opengraph-image"] },
  };
}

export default async function ResourcePage(props: Props) {
  const params = await props.params;
  const resource = getSeoResource(params.slug);
  if (!resource) notFound();
  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: resource.title,
    description: resource.description,
    url: `https://ap3k.com/resources/${resource.slug}`,
    publisher: { "@type": "Organization", "@id": "https://ap3k.com/#organization", name: "AP3K", url: "https://ap3k.com" },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: resource.sections.flatMap(section => section.items).map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item,
      })),
    },
  };
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-[#070808] dark:text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />
      <WebsiteNav />
      <main className="mx-auto max-w-4xl px-4 pb-24 pt-16 sm:px-8">
        <Breadcrumbs items={[{ name: "Resources", path: "/resources" }, { name: resource.title, path: `/resources/${resource.slug}` }]} />
        <p className="ap3k-kicker">{resource.eyebrow}</p>
        <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-6xl">{resource.title}</h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600 dark:text-slate-300">{resource.description}</p>
        <div id="campaign-examples" className="mt-12 scroll-mt-28 space-y-10">
          {resource.sections.map(section => <section key={section.title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.04] sm:p-8">
            <h2 className="text-2xl font-black tracking-tight">{section.title}</h2>
            {section.intro ? <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">{section.intro}</p> : null}
            <ol className="mt-5 space-y-3">
              {section.items.map((item, index) => <li key={item} className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 dark:border-white/10 dark:bg-white/[0.03]">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-violet-600 text-xs font-black text-white">{index + 1}</span>
                <span>{item}</span>
              </li>)}
            </ol>
          </section>)}
        </div>
        <aside className="mt-12 rounded-3xl bg-gradient-to-r from-violet-700 to-fuchsia-600 p-7 text-white sm:p-9">
          <h2 className="text-2xl font-black">Put the resource into practice.</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-white/80">Build one focused Instagram comment-to-DM automation, test it with a second account, and measure delivery separately from clicks and sales.</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link href="/sign-up" className="rounded-full bg-white px-5 py-3 text-center text-sm font-black text-violet-700">Build my first campaign</Link>
            <Link href="/instagram-comment-to-dm" className="rounded-full bg-white px-5 py-3 text-center text-sm font-black text-violet-700">See comment-to-DM automation</Link>
            <Link href="/blog/instagram-comment-to-dm-automation" className="rounded-full border border-white/30 px-5 py-3 text-center text-sm font-black">Read the complete guide</Link>
          </div>
        </aside>
      </main>
      <WebsiteFooter />
    </div>
  );
}
