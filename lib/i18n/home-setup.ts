import type { Locale } from "./config";

type SetupCopy = {
  title: readonly [string, string, string];
  description: string;
  trigger: string;
  cards: readonly { title: string; description: string }[];
};
export const HOME_SETUP_COPY: Record<Locale, SetupCopy> = {
  en: {
    title: ["Set up", "automation", "in minutes"],
    description: "Automatically reply to comments and DMs on Instagram while you focus on content, not chats.",
    trigger: "Trigger",
    cards: [
      { title: "Choose Keywords", description: "Pick comments or keywords that instantly trigger a message" },
      { title: "Create your reply", description: "Add messages, links, or offers you want to send automatically" },
      { title: "Let it run on autopilot", description: "Every comment gets a reply while you focus on content" },
    ],
  },
  fr: {
    title: ["Configurez", "l’automatisation", "en quelques minutes"],
    description: "Répondez automatiquement aux commentaires et aux DM sur Instagram pendant que vous vous concentrez sur le contenu, pas sur les conversations.",
    trigger: "Déclencheur",
    cards: [
      { title: "Choisissez les mots-clés", description: "Choisissez les commentaires ou mots-clés qui déclenchent instantanément un message" },
      { title: "Créez votre réponse", description: "Ajoutez les messages, liens ou offres à envoyer automatiquement" },
      { title: "Laissez faire l’automatisation", description: "Chaque commentaire reçoit une réponse pendant que vous créez du contenu" },
    ],
  },
  es: {
    title: ["Configura", "automatizaciones", "en minutos"],
    description: "Responde automáticamente a comentarios y mensajes directos en Instagram mientras te centras en el contenido, no en los chats.",
    trigger: "Activador",
    cards: [
      { title: "Elige palabras clave", description: "Elige comentarios o palabras clave que activen un mensaje al instante" },
      { title: "Crea tu respuesta", description: "Añade mensajes, enlaces u ofertas que quieras enviar automáticamente" },
      { title: "Déjalo en piloto automático", description: "Cada comentario recibe una respuesta mientras te centras en el contenido" },
    ],
  },
  de: {
    title: ["Richte deine", "Automatisierung", "in Minuten ein"],
    description: "Beantworte Kommentare und DMs auf Instagram automatisch, während du dich auf Inhalte statt auf Chats konzentrierst.",
    trigger: "Auslöser",
    cards: [
      { title: "Keywords auswählen", description: "Wähle Kommentare oder Keywords, die sofort eine Nachricht auslösen" },
      { title: "Antwort erstellen", description: "Füge Nachrichten, Links oder Angebote hinzu, die automatisch gesendet werden sollen" },
      { title: "Auf Autopilot laufen lassen", description: "Jeder Kommentar erhält eine Antwort, während du dich auf Inhalte konzentrierst" },
    ],
  },
  pt: {
    title: ["Configure", "a automação", "em minutos"],
    description: "Responda automaticamente a comentários e mensagens diretas no Instagram enquanto se concentra no conteúdo, não nas conversas.",
    trigger: "Gatilho",
    cards: [
      { title: "Escolha palavras-chave", description: "Escolha comentários ou palavras-chave que acionem uma mensagem imediatamente" },
      { title: "Crie a sua resposta", description: "Adicione mensagens, links ou ofertas que queira enviar automaticamente" },
      { title: "Deixe no piloto automático", description: "Cada comentário recebe uma resposta enquanto se concentra no conteúdo" },
    ],
  },
};
