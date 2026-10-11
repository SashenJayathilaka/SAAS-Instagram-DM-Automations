import Link from "next/link";
import { getServerLocale } from "@/lib/i18n/server";
import { localizePublicPath } from "@/lib/i18n/config";
import intents from "@/lib/content/growth/search-intents.json";
import { GROWTH_SOURCES } from "@/lib/content/growth/sources";

const copy = {
  en: ["Official sources", "Ready to automate Instagram?", "Start free, compare the plans, or review the setup guide before connecting your professional Instagram account.", "Explore Instagram DM automation", "Setup and troubleshooting", "Compare plans"],
  fr: ["Sources officielles", "Prêt à automatiser Instagram ?", "Commencez gratuitement, comparez les offres ou consultez le guide de configuration avant de connecter votre compte Instagram professionnel.", "Découvrir l’automatisation des DM Instagram", "Configuration et dépannage", "Comparer les offres"],
  es: ["Fuentes oficiales", "¿Listo para automatizar Instagram?", "Empieza gratis, compara los planes o revisa la guía de configuración antes de conectar tu cuenta profesional de Instagram.", "Explorar la automatización de mensajes de Instagram", "Configuración y solución de problemas", "Comparar planes"],
  de: ["Offizielle Quellen", "Bereit für Instagram-Automatisierung?", "Starte kostenlos, vergleiche die Tarife oder lies die Einrichtungsanleitung, bevor du dein professionelles Instagram-Konto verbindest.", "Instagram-DM-Automatisierung entdecken", "Einrichtung und Fehlerbehebung", "Tarife vergleichen"],
  pt: ["Fontes oficiais", "Pronto para automatizar o Instagram?", "Comece gratuitamente, compare os planos ou consulte o guia de configuração antes de ligar a sua conta profissional do Instagram.", "Explorar a automação de DM do Instagram", "Configuração e resolução de problemas", "Comparar planos"],
};

export function GrowthSectionSources({ slug, index }: { slug: string; index: number }) {
  const sources = GROWTH_SOURCES[slug]?.[index];
  if (!sources) return null;
  const labels = copy[getServerLocale()];
  return <p className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-500 dark:text-slate-400">
    <span>{labels[0]}:</span>
    {sources.map(source => <a key={source.url} href={source.url} className="font-semibold text-violet-600 underline underline-offset-4 dark:text-violet-300">{source.name}</a>)}
  </p>;
}

export default function GrowthGuideExtras({ slug }: { slug: string }) {
  if (!Object.prototype.hasOwnProperty.call(intents, slug)) return null;
  const locale = getServerLocale();
  const labels = copy[locale];
  return <section className="mt-12 rounded-3xl border border-violet-500/20 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 p-5 dark:from-violet-500/10 dark:via-white/[0.03] dark:to-fuchsia-500/10 sm:p-8">
    <h2 className="text-2xl font-black">{labels[1]}</h2>
    <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">{labels[2]}</p>
    <nav className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
      <Link href={localizePublicPath("/pricing", locale)} className="inline-flex min-h-11 items-center justify-center rounded-full bg-violet-700 px-5 text-sm font-black text-white transition hover:bg-violet-800">{labels[5]}</Link>
      <Link href={localizePublicPath("/instagram-dm-automation", locale)} className="inline-flex min-h-11 items-center justify-center rounded-full border border-violet-300 px-5 text-sm font-black text-violet-700 transition hover:bg-violet-50 dark:border-violet-400/30 dark:text-violet-200 dark:hover:bg-violet-400/10">{labels[3]}</Link>
      <Link href={localizePublicPath("/help", locale)} className="inline-flex min-h-11 items-center justify-center px-3 text-sm font-bold text-slate-600 underline underline-offset-4 dark:text-slate-300">{labels[4]}</Link>
    </nav>
  </section>;
}
