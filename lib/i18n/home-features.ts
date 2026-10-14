import { HOME_FEATURES_COPY as SOURCE_COPY } from "./home-features-catalog";
import type { Locale } from "./config";
const BACKTRACK: Record<Locale, string> = {
  en: "Reply to eligible comments from the previous seven days on supported selected posts. Review the rule and delivery results before expanding your campaign.",
  fr: "Répondez aux commentaires éligibles des sept derniers jours sur les publications sélectionnées prises en charge. Vérifiez la règle et les résultats d’envoi.",
  es: "Responde a comentarios aptos de los últimos siete días en publicaciones seleccionadas compatibles. Revisa la regla y los resultados de entrega.",
  de: "Beantworte geeignete Kommentare der letzten sieben Tage für unterstützte ausgewählte Beiträge. Prüfe die Regel und die Zustellergebnisse.",
  nl: "Beantwoord geschikte reacties van de afgelopen zeven dagen op ondersteunde geselecteerde berichten. Controleer de regel en de bezorgresultaten voordat je opschaalt.",
  pt: "Responda a comentários elegíveis dos últimos sete dias em publicações selecionadas suportadas. Verifique a regra e os resultados de envio.",
};
const LAUNCH_COPY: Record<Locale, [string, string]> = {
  en: ["Prepare replies for your next published post or Reel. Activate the automation first; AP3K keeps it attached to that publication.", "See unique visitors to automation link buttons, compare destinations and review daily click activity."],
  fr: ["Préparez les réponses pour votre prochaine publication ou Reel. Activez d’abord l’automatisation ; elle reste liée à cette publication.", "Suivez les visiteurs uniques des boutons de lien, comparez les destinations et consultez les clics quotidiens."],
  es: ["Prepara respuestas para tu próxima publicación o Reel. Activa primero la automatización; quedará vinculada a esa publicación.", "Consulta visitantes únicos de los botones de enlace, compara destinos y revisa los clics diarios."],
  de: ["Bereite Antworten für deinen nächsten Beitrag oder dein nächstes Reel vor. Aktiviere zuerst die Automation; sie bleibt diesem Beitrag zugeordnet.", "Sieh eindeutige Besucher deiner Link-Buttons, vergleiche Ziele und prüfe tägliche Klicks."],
  nl: ["Bereid antwoorden voor je volgende bericht of Reel voor. Activeer eerst de automatisering; AP3K houdt deze aan die publicatie gekoppeld.", "Bekijk unieke bezoekers van linkknoppen, vergelijk bestemmingen en controleer de dagelijkse klikken."],
  pt: ["Prepare respostas para sua próxima publicação ou Reel. Ative a automação primeiro; ela continuará vinculada à publicação.", "Veja visitantes únicos dos botões de link, compare destinos e acompanhe os cliques diários."],
};
function revisedFeatures(locale: Locale): (typeof SOURCE_COPY)[Locale] {
  const copy = SOURCE_COPY[locale];
  return { ...copy, cards: [
    copy.cards[0], { ...copy.cards[1], description: LAUNCH_COPY[locale][0] }, copy.cards[2],
    { ...copy.cards[3], description: BACKTRACK[locale] },
    copy.cards[4], { ...copy.cards[5], description: LAUNCH_COPY[locale][1] }, copy.cards[6], copy.cards[7],
  ] };
}
export const HOME_FEATURES_COPY = {
  en: revisedFeatures("en"), fr: revisedFeatures("fr"), es: revisedFeatures("es"),
  de: revisedFeatures("de"), nl: revisedFeatures("nl"), pt: revisedFeatures("pt"),
};
