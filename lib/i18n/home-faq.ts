import { HOME_FAQ as SOURCE_FAQ } from "./home-faq-catalog";
import type { Locale } from "./config";
const REVISIONS: Record<Locale, { accounts: string; backtrack: string }> = {
  en: { accounts: "Free includes one Instagram account, Pro supports up to three, and Business supports up to 6. Each account has its own automations, contacts, and inbox.", backtrack: "Yes. Use Backtrack comments separately to process eligible comments from the previous seven days on supported selected posts. Free includes three attempts; Pro and Business have no attempt cap. Account permissions, usage and delivery protections still apply." },
  fr: { accounts: "Free inclut un compte Instagram, Pro en prend en charge jusqu’à trois et Business jusqu’à 6. Chaque compte possède ses propres automatisations, contacts et boîte de réception.", backtrack: "Oui. Utilisez séparément le rattrapage des commentaires pour traiter les commentaires éligibles des sept derniers jours sur les publications sélectionnées prises en charge. Free inclut trois essais ; Pro et Business n’ont pas de plafond d’essais. Les permissions, limites d’usage et protections d’envoi restent applicables." },
  es: { accounts: "Free incluye una cuenta, Pro admite hasta tres y Business hasta 6. Cada cuenta tiene sus propias automatizaciones, contactos y bandeja de entrada.", backtrack: "Sí. Usa por separado la función de comentarios anteriores para procesar comentarios aptos de los últimos siete días en publicaciones seleccionadas compatibles. Free incluye tres intentos; Pro y Business no tienen límite de intentos. Siguen aplicándose los permisos, límites de uso y controles de entrega." },
  de: { accounts: "Free umfasst ein Instagram-Konto, Pro bis zu drei und Business bis zu 6. Jedes Konto hat eigene Automatisierungen, Kontakte und einen Posteingang.", backtrack: "Ja. Verarbeite frühere Kommentare separat, um geeignete Kommentare der letzten sieben Tage für unterstützte ausgewählte Beiträge zu beantworten. Free enthält drei Versuche; Pro und Business haben kein Versuchslimit. Berechtigungen, Nutzungslimits und Zustellschutz gelten weiterhin." },
  nl: { accounts: "Free bevat één Instagram-account, Pro ondersteunt er maximaal drie en Business maximaal 6. Elk account heeft eigen automatiseringen, contacten en een inbox.", backtrack: "Ja. Gebruik Eerdere reacties om geschikte reacties van de afgelopen zeven dagen op ondersteunde geselecteerde berichten te verwerken. Free bevat drie pogingen; Pro en Business hebben geen poginglimiet. Machtigingen, gebruikslimieten en bezorgingsbeveiliging blijven gelden." },
  pt: { accounts: "Free inclui uma conta Instagram, Pro suporta até três e Business até 6. Cada conta tem as suas próprias automatizações, contactos e caixa de entrada.", backtrack: "Sim. Use separadamente a função de comentários anteriores para processar comentários elegíveis dos últimos sete dias em publicações selecionadas suportadas. Free inclui três tentativas; Pro e Business não têm limite de tentativas. Continuam a aplicar-se permissões, limites de utilização e proteções de envio." },
};
const CSV_COPY: Record<Locale, string> = {
  en: "Pro and Business include CSV export. Open Contacts, apply any filters you need, then choose Download CSV to export the matching contacts. Free users can review contacts in their workspace.",
  fr: "Pro et Business incluent l’export CSV. Ouvrez Contacts, appliquez vos filtres, puis choisissez Télécharger CSV pour exporter les contacts correspondants. Les utilisateurs Free peuvent consulter leurs contacts.",
  es: "Pro y Business incluyen la exportación CSV. Abre Contactos, aplica los filtros y elige Descargar CSV para exportar los contactos coincidentes. En Free puedes consultar tus contactos.",
  de: "Pro und Business enthalten den CSV-Export. Öffne Kontakte, wende Filter an und wähle CSV herunterladen, um passende Kontakte zu exportieren. Mit Free kannst du deine Kontakte ansehen.",
  nl: "Pro en Business bevatten CSV-export. Open Contacten, pas filters toe en kies CSV downloaden om de overeenkomende contacten te exporteren. Met Free kun je contacten in je werkruimte bekijken.",
  pt: "Pro e Business incluem exportação CSV. Abra Contactos, aplique os filtros e escolha Transferir CSV para exportar os contactos correspondentes. No Free pode consultar os seus contactos.",
};
function revisedFaq(locale: Locale) {
  const copy = SOURCE_FAQ[locale];
  const revision = REVISIONS[locale];
  return { ...copy, items: copy.items.map(([question, answer], index) => [
    question, index === 2 ? revision.accounts : index === 8 ? revision.backtrack : index === 14 ? CSV_COPY[locale] : answer,
  ] as const) };
}
export const HOME_FAQ = {
  en: revisedFaq("en"), fr: revisedFaq("fr"), es: revisedFaq("es"),
  de: revisedFaq("de"), nl: revisedFaq("nl"), pt: revisedFaq("pt"),
};
