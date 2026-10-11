import type { Locale } from "./config";

type Card = { title: string; description: string };
type FeaturesCopy = {
  kicker: string;
  title: string;
  unavailable: string;
  featured: readonly [Card, Card];
  cards: readonly [Card, Card, Card, Card, Card, Card, Card, Card];
};

export const HOME_FEATURES_COPY: Record<Locale, FeaturesCopy> = {
  en: {
    kicker: "Powerful features to",
    title: "Elevate your Instagram strategy",
    unavailable: "Not yet available",
    featured: [
      { title: "Ask to follow", description: "Grow your audience from each conversation. AP3K can ask people to follow your account and check their follow status before delivering your link or resource." },
      { title: "AI auto reply", description: "Keep conversations moving with relevant, AI-written comment replies. Choose your tone and instructions, then let AP3K respond while you focus on creating." },
    ],
    cards: [
      { title: "Story automation", description: "Automatically reply to eligible story interactions and keep your audience engaged." },
      { title: "Next Post", description: "Feature preview: prepare an automation specifically for your next published post." },
      { title: "Universal automation", description: "Use any-post comment rules and story triggers to keep conversations moving across your content." },
      { title: "Backtrack", description: "Feature preview: revisit earlier comments. AP3K currently responds to new eligible events only." },
      { title: "Story Mention", description: "Send an automatic response when someone mentions your account in their story." },
      { title: "Link Tracking", description: "Feature preview: measure clicks on the links shared by your automations." },
      { title: "Boosted posts and Ad", description: "Feature preview: dedicated automation for interactions with ads and boosted content." },
      { title: "Team access link", description: "Feature preview: share secure dashboard access with your team through an invitation link." },
    ],
  },
  fr: {
    kicker: "Des fonctionnalités puissantes pour",
    title: "Améliorer votre stratégie Instagram",
    unavailable: "Pas encore disponible",
    featured: [
      { title: "Demander à s’abonner", description: "Développez votre audience à chaque conversation. AP3K peut inviter les personnes à s’abonner et vérifier leur abonnement avant de leur envoyer votre lien ou ressource." },
      { title: "Réponse automatique par IA", description: "Poursuivez les échanges avec des réponses pertinentes rédigées par l’IA. Choisissez votre ton et vos consignes, puis laissez AP3K répondre pendant que vous créez." },
    ],
    cards: [
      { title: "Automatisation des stories", description: "Répondez automatiquement aux interactions éligibles avec vos stories pour maintenir l’engagement." },
      { title: "Prochaine publication", description: "Aperçu : préparer une automatisation dédiée à votre prochaine publication." },
      { title: "Automatisation universelle", description: "Utilisez des règles pour toutes les publications et des déclencheurs de stories pour poursuivre les échanges." },
      { title: "Rattrapage des commentaires", description: "Aperçu : reprendre les anciens commentaires. AP3K répond actuellement aux nouveaux événements éligibles uniquement." },
      { title: "Mention en story", description: "Envoyez une réponse automatique lorsqu’une personne mentionne votre compte dans sa story." },
      { title: "Suivi des liens", description: "Aperçu : mesurer les clics sur les liens partagés par vos automatisations." },
      { title: "Publications sponsorisées et publicités", description: "Aperçu : une automatisation dédiée aux interactions avec vos publicités et contenus sponsorisés." },
      { title: "Lien d’accès pour l’équipe", description: "Aperçu : partager un accès sécurisé au tableau de bord grâce à un lien d’invitation." },
    ],
  },
  es: {
    kicker: "Funciones potentes para",
    title: "Mejorar tu estrategia de Instagram",
    unavailable: "Aún no disponible",
    featured: [
      { title: "Pedir que te sigan", description: "Haz crecer tu audiencia con cada conversación. AP3K puede pedir que sigan tu cuenta y comprobarlo antes de entregar tu enlace o recurso." },
      { title: "Respuesta automática con IA", description: "Mantén las conversaciones con respuestas relevantes escritas por IA. Elige el tono y las instrucciones y deja que AP3K responda mientras creas contenido." },
    ],
    cards: [
      { title: "Automatización de historias", description: "Responde automáticamente a las interacciones aptas con tus historias y conecta con tu audiencia." },
      { title: "Próxima publicación", description: "Vista previa: preparar una automatización específica para tu próxima publicación." },
      { title: "Automatización universal", description: "Usa reglas para cualquier publicación y activadores de historias para mantener las conversaciones." },
      { title: "Comentarios anteriores", description: "Vista previa: retomar comentarios anteriores. AP3K solo responde a nuevos eventos aptos actualmente." },
      { title: "Mención en historias", description: "Envía una respuesta automática cuando alguien mencione tu cuenta en su historia." },
      { title: "Seguimiento de enlaces", description: "Vista previa: medir los clics en los enlaces compartidos por tus automatizaciones." },
      { title: "Publicaciones promocionadas y anuncios", description: "Vista previa: automatización específica para interacciones con anuncios y contenido promocionado." },
      { title: "Enlace de acceso para el equipo", description: "Vista previa: compartir acceso seguro al panel con tu equipo mediante una invitación." },
    ],
  },
  de: {
    kicker: "Leistungsstarke Funktionen für",
    title: "Deine Instagram-Strategie",
    unavailable: "Noch nicht verfügbar",
    featured: [
      { title: "Zum Folgen auffordern", description: "Gewinne mit jedem Gespräch neue Follower. AP3K kann zum Folgen auffordern und den Follow-Status prüfen, bevor dein Link oder deine Ressource versendet wird." },
      { title: "Automatische KI-Antworten", description: "Halte Gespräche mit passenden KI-Kommentarantworten am Laufen. Wähle Ton und Anweisungen und lass AP3K antworten, während du Inhalte erstellst." },
    ],
    cards: [
      { title: "Story-Automatisierung", description: "Antworte automatisch auf geeignete Story-Interaktionen und bleibe mit deiner Zielgruppe in Kontakt." },
      { title: "Nächster Beitrag", description: "Funktionsvorschau: eine Automatisierung speziell für deinen nächsten Beitrag vorbereiten." },
      { title: "Universelle Automatisierung", description: "Nutze Kommentarregeln für alle Beiträge und Story-Auslöser, um Gespräche fortzuführen." },
      { title: "Frühere Kommentare", description: "Funktionsvorschau: frühere Kommentare aufgreifen. AP3K reagiert derzeit nur auf neue geeignete Ereignisse." },
      { title: "Story-Erwähnung", description: "Antworte automatisch, wenn jemand dein Konto in einer Story erwähnt." },
      { title: "Link-Tracking", description: "Funktionsvorschau: Klicks auf die von deinen Automatisierungen geteilten Links messen." },
      { title: "Beworbene Beiträge und Anzeigen", description: "Funktionsvorschau: spezielle Automatisierung für Interaktionen mit Anzeigen und beworbenen Inhalten." },
      { title: "Team-Zugangslink", description: "Funktionsvorschau: sicheren Dashboard-Zugang über einen Einladungslink mit deinem Team teilen." },
    ],
  },
  pt: {
    kicker: "Funcionalidades poderosas para",
    title: "Melhorar a sua estratégia no Instagram",
    unavailable: "Ainda não disponível",
    featured: [
      { title: "Pedir para seguir", description: "Faça crescer o seu público em cada conversa. O AP3K pode pedir que sigam a sua conta e verificar o estado antes de enviar o seu link ou recurso." },
      { title: "Resposta automática com IA", description: "Mantenha as conversas com respostas relevantes escritas por IA. Escolha o tom e as instruções e deixe o AP3K responder enquanto cria conteúdo." },
    ],
    cards: [
      { title: "Automatização de stories", description: "Responda automaticamente às interações elegíveis com os seus stories e envolva o seu público." },
      { title: "Próxima publicação", description: "Pré-visualização: preparar uma automatização específica para a sua próxima publicação." },
      { title: "Automatização universal", description: "Use regras para qualquer publicação e gatilhos de stories para manter as conversas." },
      { title: "Comentários anteriores", description: "Pré-visualização: retomar comentários anteriores. Atualmente, o AP3K só responde a novos eventos elegíveis." },
      { title: "Menção em story", description: "Envie uma resposta automática quando alguém mencionar a sua conta num story." },
      { title: "Rastreio de links", description: "Pré-visualização: medir os cliques nos links partilhados pelas suas automatizações." },
      { title: "Publicações promovidas e anúncios", description: "Pré-visualização: automatização dedicada às interações com anúncios e conteúdos promovidos." },
      { title: "Link de acesso da equipa", description: "Pré-visualização: partilhar acesso seguro ao painel com a sua equipa através de um convite." },
    ],
  },
};
