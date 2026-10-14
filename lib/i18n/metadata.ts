import type { Locale } from "./config";

export const SITE_METADATA: Record<
  Locale,
  { title: string; description: string }
> = {
  en: {
    title: "AP3K — Instagram DM Automation Tool (Free Plan)",
    description:
      "Turn Instagram comments into automatic DMs with AP3K. Send links, collect leads and track results. Start free with 500 automated actions each month.",
  },
  fr: {
    title: "AP3K — Outil d’automatisation des DM Instagram (gratuit)",
    description:
      "Transformez les commentaires Instagram en DM automatiques avec AP3K. Envoyez des liens, collectez des prospects et commencez gratuitement.",
  },
  es: {
    title: "AP3K — Herramienta de automatización de DM de Instagram (gratis)",
    description:
      "Convierte comentarios de Instagram en mensajes directos automáticos. Envía enlaces, capta contactos y empieza gratis con AP3K.",
  },
  de: {
    title: "AP3K — Tool für Instagram-DM-Automatisierung (kostenlos)",
    description:
      "Verwandle Instagram-Kommentare automatisch in DMs. Sende Links, erfasse Leads und starte AP3K kostenlos mit 500 Aktionen pro Monat.",
  },
  nl: {
    title: "AP3K — Tool voor Instagram DM-automatisering (gratis)",
    description:
      "Zet Instagram-reacties automatisch om in DM’s. Verstuur links, verzamel leads en start gratis met AP3K en 500 acties per maand.",
  },
  pt: {
    title: "AP3K — Ferramenta de automação de DMs do Instagram (grátis)",
    description:
      "Transforme comentários do Instagram em DMs automáticas. Envie links, recolha contactos e comece grátis com 500 ações por mês.",
  },
};
