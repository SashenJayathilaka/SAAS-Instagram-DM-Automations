import type { Locale } from "./config";
import { PRODUCT_PHRASE_TRANSLATIONS } from "./product-phrase-translations";

const en = {
  "Automation": "Automation", "Channel": "Channel", "Trigger": "Trigger", "Actions": "Actions", "Runs": "Runs", "Leads": "Leads", "Status": "Status", "Manage": "Manage",
  "Search automations, keywords, or content…": "Search automations, keywords, or content…", "Sort automations": "Sort automations", "Newest first": "Newest first", "Active first": "Active first", "Name A–Z": "Name A–Z",
  "Untitled automation": "Untitled automation", "Any message": "Any message", "Keyword": "Keyword", "Any post": "Any post", "Specific post": "Specific post", "Any comment": "Any comment", "Keyword trigger": "Keyword trigger",
  "Manage automation": "Manage automation", "Open automation": "Open automation", "More automation actions": "More automation actions", "Review setup": "Review setup", "Edit automation": "Edit automation", "Pause automation": "Pause automation", "Start automation": "Start automation", "Duplicate automation": "Duplicate automation", "Delete automation": "Delete automation",
  "AI DM replies active": "AI DM replies active", "Saved DM replies active": "Saved DM replies active", "Story": "Story", "Post": "Post", "Any DM": "Any DM", "Any": "Any", "No trigger": "No trigger", "Edit": "Edit", "Pause": "Pause", "Start": "Start", "More actions": "More actions", "View detail": "View detail", "Duplicate": "Duplicate", "Delete": "Delete",
  "Previous": "Previous", "Next": "Next", "Automation post": "Automation post", "No automations match your search.": "No automations match your search.", "Archived": "Archived", "Needs review": "Needs review", "Draft": "Draft", "Live": "Live", "Paused": "Paused", "Reaction": "Reaction", "Reply": "Reply", "Mention": "Mention",
  "Comment + DM": "Comment + DM", "Both": "Both", "Comment reply": "Comment reply", "Comment": "Comment", "Not set": "Not set", "Off": "Off",
  "Preferences": "Preferences", "Appearance": "Appearance", "Theme": "Theme", "Switch AP3K between light and dark mode.": "Switch AP3K between light and dark mode.", "Account & authentication": "Account & authentication", "Signed-in email": "Signed-in email", "Email notifications": "Email notifications", "Danger zone": "Danger zone",
} as const;

type Phrase = keyof typeof en;
type Catalog = Record<Phrase, string>;
const fr: Catalog = {
  "Automation": "Automatisation", "Channel": "Canal", "Trigger": "Déclencheur", "Actions": "Actions", "Runs": "Exécutions", "Leads": "Prospects", "Status": "Statut", "Manage": "Gérer",
  "Search automations, keywords, or content…": "Rechercher des automatisations, mots-clés ou contenus…", "Sort automations": "Trier les automatisations", "Newest first": "Plus récentes", "Active first": "Actives d’abord", "Name A–Z": "Nom A–Z",
  "Untitled automation": "Automatisation sans titre", "Any message": "Tout message", "Keyword": "Mot-clé", "Any post": "Toute publication", "Specific post": "Publication précise", "Any comment": "Tout commentaire", "Keyword trigger": "Déclencheur par mot-clé",
  "Manage automation": "Gérer l’automatisation", "Open automation": "Ouvrir l’automatisation", "More automation actions": "Autres actions", "Review setup": "Vérifier la configuration", "Edit automation": "Modifier l’automatisation", "Pause automation": "Mettre en pause", "Start automation": "Démarrer l’automatisation", "Duplicate automation": "Dupliquer l’automatisation", "Delete automation": "Supprimer l’automatisation",
  "AI DM replies active": "Réponses DM par IA actives", "Saved DM replies active": "Réponses DM enregistrées actives", "Story": "Story", "Post": "Publication", "Any DM": "Tout DM", "Any": "Tous", "No trigger": "Aucun déclencheur", "Edit": "Modifier", "Pause": "Pause", "Start": "Démarrer", "More actions": "Autres actions", "View detail": "Voir le détail", "Duplicate": "Dupliquer", "Delete": "Supprimer",
  "Previous": "Précédent", "Next": "Suivant", "Automation post": "Publication de l’automatisation", "No automations match your search.": "Aucune automatisation ne correspond à votre recherche.", "Archived": "Archivée", "Needs review": "À vérifier", "Draft": "Brouillon", "Live": "Active", "Paused": "En pause", "Reaction": "Réaction", "Reply": "Réponse", "Mention": "Mention",
  "Comment + DM": "Commentaire + DM", "Both": "Les deux", "Comment reply": "Réponse au commentaire", "Comment": "Commentaire", "Not set": "Non défini", "Off": "Désactivé",
  "Preferences": "Préférences", "Appearance": "Apparence", "Theme": "Thème", "Switch AP3K between light and dark mode.": "Passez AP3K du mode clair au mode sombre.", "Account & authentication": "Compte et authentification", "Signed-in email": "Adresse de connexion", "Email notifications": "Notifications par e-mail", "Danger zone": "Zone sensible",
};

const es: Catalog = {
  "Automation": "Automatización", "Channel": "Canal", "Trigger": "Activador", "Actions": "Acciones", "Runs": "Ejecuciones", "Leads": "Contactos", "Status": "Estado", "Manage": "Gestionar",
  "Search automations, keywords, or content…": "Buscar automatizaciones, palabras clave o contenido…", "Sort automations": "Ordenar automatizaciones", "Newest first": "Más recientes", "Active first": "Activas primero", "Name A–Z": "Nombre A–Z",
  "Untitled automation": "Automatización sin título", "Any message": "Cualquier mensaje", "Keyword": "Palabra clave", "Any post": "Cualquier publicación", "Specific post": "Publicación concreta", "Any comment": "Cualquier comentario", "Keyword trigger": "Activador por palabra clave",
  "Manage automation": "Gestionar automatización", "Open automation": "Abrir automatización", "More automation actions": "Más acciones", "Review setup": "Revisar configuración", "Edit automation": "Editar automatización", "Pause automation": "Pausar automatización", "Start automation": "Iniciar automatización", "Duplicate automation": "Duplicar automatización", "Delete automation": "Eliminar automatización",
  "AI DM replies active": "Respuestas de DM con IA activas", "Saved DM replies active": "Respuestas de DM guardadas activas", "Story": "Historia", "Post": "Publicación", "Any DM": "Cualquier DM", "Any": "Todos", "No trigger": "Sin activador", "Edit": "Editar", "Pause": "Pausar", "Start": "Iniciar", "More actions": "Más acciones", "View detail": "Ver detalle", "Duplicate": "Duplicar", "Delete": "Eliminar",
  "Previous": "Anterior", "Next": "Siguiente", "Automation post": "Publicación de la automatización", "No automations match your search.": "Ninguna automatización coincide con tu búsqueda.", "Archived": "Archivada", "Needs review": "Requiere revisión", "Draft": "Borrador", "Live": "Activa", "Paused": "Pausada", "Reaction": "Reacción", "Reply": "Respuesta", "Mention": "Mención",
  "Comment + DM": "Comentario + DM", "Both": "Ambos", "Comment reply": "Respuesta al comentario", "Comment": "Comentario", "Not set": "Sin configurar", "Off": "Desactivado",
  "Preferences": "Preferencias", "Appearance": "Apariencia", "Theme": "Tema", "Switch AP3K between light and dark mode.": "Cambia AP3K entre el modo claro y oscuro.", "Account & authentication": "Cuenta y autenticación", "Signed-in email": "Correo de inicio de sesión", "Email notifications": "Notificaciones por correo", "Danger zone": "Zona de peligro",
};

const de: Catalog = {
  "Automation": "Automatisierung", "Channel": "Kanal", "Trigger": "Auslöser", "Actions": "Aktionen", "Runs": "Ausführungen", "Leads": "Leads", "Status": "Status", "Manage": "Verwalten",
  "Search automations, keywords, or content…": "Automatisierungen, Keywords oder Inhalte suchen…", "Sort automations": "Automatisierungen sortieren", "Newest first": "Neueste zuerst", "Active first": "Aktive zuerst", "Name A–Z": "Name A–Z",
  "Untitled automation": "Unbenannte Automatisierung", "Any message": "Jede Nachricht", "Keyword": "Keyword", "Any post": "Jeder Beitrag", "Specific post": "Bestimmter Beitrag", "Any comment": "Jeder Kommentar", "Keyword trigger": "Keyword-Auslöser",
  "Manage automation": "Automatisierung verwalten", "Open automation": "Automatisierung öffnen", "More automation actions": "Weitere Aktionen", "Review setup": "Einrichtung prüfen", "Edit automation": "Automatisierung bearbeiten", "Pause automation": "Automatisierung pausieren", "Start automation": "Automatisierung starten", "Duplicate automation": "Automatisierung duplizieren", "Delete automation": "Automatisierung löschen",
  "AI DM replies active": "KI-DM-Antworten aktiv", "Saved DM replies active": "Gespeicherte DM-Antworten aktiv", "Story": "Story", "Post": "Beitrag", "Any DM": "Jede DM", "Any": "Alle", "No trigger": "Kein Auslöser", "Edit": "Bearbeiten", "Pause": "Pausieren", "Start": "Starten", "More actions": "Weitere Aktionen", "View detail": "Details ansehen", "Duplicate": "Duplizieren", "Delete": "Löschen",
  "Previous": "Zurück", "Next": "Weiter", "Automation post": "Automatisierungsbeitrag", "No automations match your search.": "Keine Automatisierung entspricht deiner Suche.", "Archived": "Archiviert", "Needs review": "Prüfung erforderlich", "Draft": "Entwurf", "Live": "Aktiv", "Paused": "Pausiert", "Reaction": "Reaktion", "Reply": "Antwort", "Mention": "Erwähnung",
  "Comment + DM": "Kommentar + DM", "Both": "Beides", "Comment reply": "Kommentarantwort", "Comment": "Kommentar", "Not set": "Nicht eingerichtet", "Off": "Aus",
  "Preferences": "Einstellungen", "Appearance": "Darstellung", "Theme": "Design", "Switch AP3K between light and dark mode.": "Wechsle AP3K zwischen hellem und dunklem Modus.", "Account & authentication": "Konto und Anmeldung", "Signed-in email": "Anmelde-E-Mail", "Email notifications": "E-Mail-Benachrichtigungen", "Danger zone": "Gefahrenbereich",
};

const pt: Catalog = {
  "Automation": "Automação", "Channel": "Canal", "Trigger": "Acionador", "Actions": "Ações", "Runs": "Execuções", "Leads": "Contactos", "Status": "Estado", "Manage": "Gerir",
  "Search automations, keywords, or content…": "Pesquisar automações, palavras-chave ou conteúdo…", "Sort automations": "Ordenar automações", "Newest first": "Mais recentes", "Active first": "Ativas primeiro", "Name A–Z": "Nome A–Z",
  "Untitled automation": "Automação sem título", "Any message": "Qualquer mensagem", "Keyword": "Palavra-chave", "Any post": "Qualquer publicação", "Specific post": "Publicação específica", "Any comment": "Qualquer comentário", "Keyword trigger": "Acionador por palavra-chave",
  "Manage automation": "Gerir automação", "Open automation": "Abrir automação", "More automation actions": "Mais ações", "Review setup": "Rever configuração", "Edit automation": "Editar automação", "Pause automation": "Pausar automação", "Start automation": "Iniciar automação", "Duplicate automation": "Duplicar automação", "Delete automation": "Eliminar automação",
  "AI DM replies active": "Respostas de DM com IA ativas", "Saved DM replies active": "Respostas de DM guardadas ativas", "Story": "Story", "Post": "Publicação", "Any DM": "Qualquer DM", "Any": "Todos", "No trigger": "Sem acionador", "Edit": "Editar", "Pause": "Pausar", "Start": "Iniciar", "More actions": "Mais ações", "View detail": "Ver detalhes", "Duplicate": "Duplicar", "Delete": "Eliminar",
  "Previous": "Anterior", "Next": "Seguinte", "Automation post": "Publicação da automação", "No automations match your search.": "Nenhuma automação corresponde à pesquisa.", "Archived": "Arquivada", "Needs review": "Precisa de revisão", "Draft": "Rascunho", "Live": "Ativa", "Paused": "Pausada", "Reaction": "Reação", "Reply": "Resposta", "Mention": "Menção",
  "Comment + DM": "Comentário + DM", "Both": "Ambos", "Comment reply": "Resposta ao comentário", "Comment": "Comentário", "Not set": "Não configurado", "Off": "Desativado",
  "Preferences": "Preferências", "Appearance": "Aspeto", "Theme": "Tema", "Switch AP3K between light and dark mode.": "Alterne o AP3K entre o modo claro e escuro.", "Account & authentication": "Conta e autenticação", "Signed-in email": "E-mail de início de sessão", "Email notifications": "Notificações por e-mail", "Danger zone": "Zona de perigo",
};

export const PHRASE_TRANSLATIONS: Record<Locale, Record<string, string>> = {
  en: { ...en, ...PRODUCT_PHRASE_TRANSLATIONS.en },
  fr: { ...fr, ...PRODUCT_PHRASE_TRANSLATIONS.fr },
  es: { ...es, ...PRODUCT_PHRASE_TRANSLATIONS.es },
  de: { ...de, ...PRODUCT_PHRASE_TRANSLATIONS.de },
  pt: { ...pt, ...PRODUCT_PHRASE_TRANSLATIONS.pt },
};
