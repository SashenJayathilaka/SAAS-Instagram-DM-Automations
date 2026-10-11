import type { Locale } from "./config";

type HeroScene = {
  keyword: string;
  comment: string;
  message: string;
  button: string;
};

export type HomeHeroCopy = {
  eyebrow: string;
  titleTop: string;
  titleBottom: string;
  description: string;
  cta: string;
  secondary: string;
  allowance: string;
  audience: string;
  api: string;
  keywordPrefix: string;
  keywordSuffix: string;
  demoLabel: string;
  demoDescription: string;
  reply: string;
  sent: string;
  dmTitle: string;
  active: string;
  message: string;
  openLink: string;
  commentRequest: string;
  pause: string;
  play: string;
  scenes: [HeroScene, HeroScene, HeroScene];
};

export const HOME_HERO_COPY: Record<Locale, HomeHeroCopy> = {
  en: {
    eyebrow: "Instagram comment & DM automation",
    titleTop: "Answer every Instagram",
    titleBottom: "comment with a DM",
    description: "Automate comments, DMs, and story replies on Instagram.",
    cta: "Get Started for Free",
    secondary: "See how it works",
    allowance: "500 automated actions every month. No credit card required.",
    audience: "Built for creators on Instagram",
    api: "Official Instagram API",
    keywordPrefix: "Comment",
    keywordSuffix: "and let AP3K take it from here.",
    demoLabel: "Example automation",
    demoDescription: "Someone comments with a keyword on your Instagram post. AP3K automatically sends the requested link in a direct message.",
    reply: "Reply",
    sent: "Sent by AP3K",
    dmTitle: "Your Instagram inbox",
    active: "Active now",
    message: "Here’s the link I promised! ✨",
    openLink: "Get the link",
    commentRequest: "Please send me the link!",
    pause: "Pause animation",
    play: "Play animation",
    scenes: [
      { keyword: "GUIDE", comment: "GUIDE — I’d love a copy! 🙌", message: "Your guide is ready! Tap below to get it. ✨", button: "Get the guide" },
      { keyword: "LINK", comment: "LINK — please send it my way! 🔗", message: "Here’s the link I promised! ✨", button: "Get the link" },
      { keyword: "OFFER", comment: "OFFER — I’d love the details! 💜", message: "Here’s the offer you asked about! Take a look below. 🎁", button: "See the offer" },
    ],
  },
  fr: {
    eyebrow: "Automatisez vos commentaires et messages Instagram",
    titleTop: "À chaque commentaire Instagram",
    titleBottom: "une réponse en message privé",
    description: "Automatisez les commentaires, les messages privés et les réponses aux stories sur Instagram.",
    cta: "Commencer gratuitement",
    secondary: "Voir comment ça marche",
    allowance: "500 actions automatisées chaque mois. Sans carte bancaire.",
    audience: "Pensé pour les créateurs sur Instagram",
    api: "API officielle Instagram",
    keywordPrefix: "Commentez",
    keywordSuffix: "et laissez AP3K prendre le relais.",
    demoLabel: "Exemple d’automatisation",
    demoDescription: "Une personne commente votre publication Instagram avec un mot-clé. AP3K lui envoie automatiquement le lien demandé en message privé.",
    reply: "Répondre",
    sent: "Envoyé par AP3K",
    dmTitle: "Votre messagerie Instagram",
    active: "En ligne",
    message: "Voici le lien promis ! ✨",
    openLink: "Obtenir le lien",
    commentRequest: "Envoyez-moi le lien, s’il vous plaît !",
    pause: "Mettre l’animation en pause",
    play: "Lancer l’animation",
    scenes: [
      { keyword: "GUIDE", comment: "GUIDE — j’aimerais le recevoir ! 🙌", message: "Votre guide est prêt ! Appuyez ci-dessous pour le recevoir. ✨", button: "Obtenir le guide" },
      { keyword: "LIEN", comment: "LIEN — envoyez-le-moi ! 🔗", message: "Voici le lien promis ! ✨", button: "Obtenir le lien" },
      { keyword: "OFFRE", comment: "OFFRE — j’aimerais en savoir plus ! 💜", message: "Voici l’offre qui vous intéresse ! Découvrez-la ci-dessous. 🎁", button: "Voir l’offre" },
    ],
  },
  es: {
    eyebrow: "Automatiza comentarios y mensajes de Instagram",
    titleTop: "Responde a cada comentario",
    titleBottom: "con un mensaje privado",
    description: "Automatiza comentarios, mensajes directos y respuestas a historias en Instagram.",
    cta: "Empieza gratis",
    secondary: "Descubre cómo funciona",
    allowance: "500 acciones automatizadas al mes. Sin tarjeta de crédito.",
    audience: "Para creadores en Instagram",
    api: "API oficial de Instagram",
    keywordPrefix: "Comenta",
    keywordSuffix: "y deja que AP3K se encargue del resto.",
    demoLabel: "Ejemplo de automatización",
    demoDescription: "Alguien comenta una palabra clave en tu publicación de Instagram. AP3K le envía automáticamente el enlace solicitado por mensaje directo.",
    reply: "Responder",
    sent: "Enviado por AP3K",
    dmTitle: "Tu bandeja de entrada de Instagram",
    active: "En línea",
    message: "¡Aquí tienes el enlace prometido! ✨",
    openLink: "Obtener el enlace",
    commentRequest: "¡Envíame el enlace, por favor!",
    pause: "Pausar animación",
    play: "Reproducir animación",
    scenes: [
      { keyword: "GUÍA", comment: "GUÍA — ¡me encantaría recibirla! 🙌", message: "¡Tu guía está lista! Toca abajo para obtenerla. ✨", button: "Obtener la guía" },
      { keyword: "ENLACE", comment: "ENLACE — ¡envíamelo, por favor! 🔗", message: "¡Aquí tienes el enlace prometido! ✨", button: "Obtener el enlace" },
      { keyword: "OFERTA", comment: "OFERTA — ¡quiero saber más! 💜", message: "¡Aquí tienes la oferta que te interesa! Descúbrela abajo. 🎁", button: "Ver la oferta" },
    ],
  },
  de: {
    eyebrow: "Instagram-Kommentare und Direktnachrichten automatisieren",
    titleTop: "Auf jeden Instagram-Kommentar",
    titleBottom: "mit einer DM antworten",
    description: "Automatisiere Kommentare, Direktnachrichten und Story-Antworten auf Instagram.",
    cta: "Kostenlos starten",
    secondary: "So funktioniert’s",
    allowance: "500 automatisierte Aktionen pro Monat. Keine Kreditkarte erforderlich.",
    audience: "Für Creator auf Instagram",
    api: "Offizielle Instagram-API",
    keywordPrefix: "Kommentiere",
    keywordSuffix: "und lass AP3K den Rest übernehmen.",
    demoLabel: "Beispiel einer Automatisierung",
    demoDescription: "Jemand kommentiert deinen Instagram-Beitrag mit einem Schlüsselwort. AP3K sendet den gewünschten Link automatisch per Direktnachricht.",
    reply: "Antworten",
    sent: "Gesendet von AP3K",
    dmTitle: "Dein Instagram-Postfach",
    active: "Jetzt aktiv",
    message: "Hier ist der versprochene Link! ✨",
    openLink: "Link öffnen",
    commentRequest: "Schick mir bitte den Link!",
    pause: "Animation pausieren",
    play: "Animation abspielen",
    scenes: [
      { keyword: "ANLEITUNG", comment: "ANLEITUNG — die hätte ich gerne! 🙌", message: "Deine Anleitung ist bereit! Tippe unten, um sie zu öffnen. ✨", button: "Anleitung öffnen" },
      { keyword: "LINK", comment: "LINK — schick ihn mir bitte! 🔗", message: "Hier ist der versprochene Link! ✨", button: "Link öffnen" },
      { keyword: "ANGEBOT", comment: "ANGEBOT — ich möchte mehr erfahren! 💜", message: "Hier ist das Angebot, das dich interessiert! Schau es dir unten an. 🎁", button: "Angebot ansehen" },
    ],
  },
  pt: {
    eyebrow: "Automatize comentários e mensagens do Instagram",
    titleTop: "Responda a cada comentário",
    titleBottom: "com uma mensagem privada",
    description: "Automatize comentários, mensagens diretas e respostas a stories no Instagram.",
    cta: "Comece grátis",
    secondary: "Veja como funciona",
    allowance: "500 ações automatizadas por mês. Sem cartão de crédito.",
    audience: "Para criadores no Instagram",
    api: "API oficial do Instagram",
    keywordPrefix: "Comente",
    keywordSuffix: "e deixe a AP3K tratar do resto.",
    demoLabel: "Exemplo de automatização",
    demoDescription: "Alguém comenta uma palavra-chave na sua publicação do Instagram. A AP3K envia automaticamente o link pedido por mensagem direta.",
    reply: "Responder",
    sent: "Enviado pela AP3K",
    dmTitle: "A sua caixa de entrada do Instagram",
    active: "Online agora",
    message: "Aqui está o link prometido! ✨",
    openLink: "Abrir o link",
    commentRequest: "Envie-me o link, por favor!",
    pause: "Pausar animação",
    play: "Reproduzir animação",
    scenes: [
      { keyword: "GUIA", comment: "GUIA — adorava recebê-lo! 🙌", message: "O seu guia está pronto! Toque abaixo para o abrir. ✨", button: "Abrir o guia" },
      { keyword: "LINK", comment: "LINK — envie-mo, por favor! 🔗", message: "Aqui está o link prometido! ✨", button: "Abrir o link" },
      { keyword: "OFERTA", comment: "OFERTA — quero saber mais! 💜", message: "Aqui está a oferta que lhe interessa! Veja os detalhes abaixo. 🎁", button: "Ver a oferta" },
    ],
  },
};
