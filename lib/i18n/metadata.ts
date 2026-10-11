import type { Locale } from "./config";

export const SITE_METADATA: Record<
  Locale,
  { title: string; description: string }
> = {
  en: {
    title: "AP3K — Instagram Comment & DM Automation",
    description:
      "Automate Instagram comment replies and DMs with AP3K. Send links, collect leads and track your campaigns. Start free with 500 automated actions per month.",
  },
  fr: {
    title: "AP3K — Automatisation des commentaires et DM Instagram",
    description:
      "Répondez automatiquement aux commentaires Instagram, envoyez le lien promis par DM et suivez chaque prospect, sans flux complexes ni code.",
  },
  es: {
    title: "AP3K — Automatización de comentarios y DM de Instagram",
    description:
      "Responde automáticamente a comentarios de Instagram, envía el enlace prometido por DM y registra cada contacto, sin flujos complejos ni código.",
  },
  de: {
    title: "AP3K — Automatisierung für Instagram-Kommentare und DMs",
    description:
      "Beantworte Instagram-Kommentare automatisch, sende den versprochenen Link per DM und erfasse jeden Lead – ohne komplizierte Abläufe oder Code.",
  },
  pt: {
    title: "AP3K — Automação de comentários e DMs do Instagram",
    description:
      "Responda automaticamente a comentários do Instagram, envie o link prometido por DM e acompanhe cada contacto, sem fluxos complexos nem código.",
  },
};
