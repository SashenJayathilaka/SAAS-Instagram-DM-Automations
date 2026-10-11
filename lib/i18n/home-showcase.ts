import type { Locale } from "./config";

type ShowcaseCopy = { login: string; join: string; automatically: string; labels: readonly string[] };
export const HOME_SHOWCASE_COPY: Record<Locale, ShowcaseCopy> = {
  en: { login: "Login", join: "Join for free", automatically: "Automatically", labels: ["Send links", "Reply to comments", "Reply to DM", "Send a follow-up message", "Get new followers", "Collect contact details", "Reply to story mentions", "Reply to shared post"] },
  fr: { login: "Connexion", join: "S’inscrire gratuitement", automatically: "Automatiquement", labels: ["Envoyez des liens", "Répondez aux commentaires", "Répondez aux DM", "Envoyez un message de suivi", "Gagnez de nouveaux abonnés", "Collectez des coordonnées", "Répondez aux mentions en story", "Répondez aux publications partagées"] },
  es: { login: "Iniciar sesión", join: "Únete gratis", automatically: "Automáticamente", labels: ["Envía enlaces", "Responde a comentarios", "Responde a mensajes directos", "Envía un mensaje de seguimiento", "Consigue nuevos seguidores", "Recopila datos de contacto", "Responde a menciones en historias", "Responde a publicaciones compartidas"] },
  de: { login: "Anmelden", join: "Kostenlos starten", automatically: "Automatisch", labels: ["Links senden", "Auf Kommentare antworten", "Auf DMs antworten", "Eine Folgenachricht senden", "Neue Follower gewinnen", "Kontaktdaten sammeln", "Auf Story-Erwähnungen antworten", "Auf geteilte Beiträge antworten"] },
  pt: { login: "Entrar", join: "Comece grátis", automatically: "Automaticamente", labels: ["Envie links", "Responda a comentários", "Responda a mensagens diretas", "Envie uma mensagem de seguimento", "Ganhe novos seguidores", "Recolha dados de contacto", "Responda a menções em stories", "Responda a publicações partilhadas"] },
};
