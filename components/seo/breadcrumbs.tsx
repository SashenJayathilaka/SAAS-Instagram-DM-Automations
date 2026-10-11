import Link from "next/link";
import { getServerLocale } from "@/lib/i18n/server";
import { localizePublicPath } from "@/lib/i18n/config";
import { translateUi } from "@/lib/i18n/translate";

type Crumb = { name: string; path: string };

/** Render the same localized trail for readers and search engines. */
export default function Breadcrumbs({ items }: { items: Crumb[] }) {
  const locale = getServerLocale();
  const trail = [{ name: "AP3K", path: "/" }, ...items].map(item => ({
    name: translateUi(item.name, locale),
    href: localizePublicPath(item.path, locale),
  }));
  const label = { en: "Breadcrumb", fr: "Fil d’Ariane", es: "Ruta de navegación", de: "Navigationspfad", pt: "Caminho de navegação" }[locale];
  const schema = {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: trail.map((item, index) => ({
      "@type": "ListItem", position: index + 1, name: item.name,
      item: `https://ap3k.com${item.href}`,
    })),
  };
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />
    <nav aria-label={label} className="mb-6 text-xs leading-6">
      <ol className="flex flex-wrap items-center gap-x-2">
        {trail.map((item, index) => <li key={item.href} className="inline-flex items-center gap-2">
          {index > 0 && <span aria-hidden="true">/</span>}
          {index === trail.length - 1 ? <span aria-current="page">{item.name}</span> : <Link href={item.href} className="underline-offset-4 hover:underline">{item.name}</Link>}
        </li>)}
      </ol>
    </nav>
  </>;
}
