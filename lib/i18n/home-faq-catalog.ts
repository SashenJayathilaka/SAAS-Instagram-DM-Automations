import type { Locale } from "./config";

type FaqCopy = { eyebrow: string; title: string; trust: string; items: readonly (readonly [string, string])[] };

export const HOME_FAQ = {
  "en": {
    "eyebrow": "Frequently asked questions",
    "title": "Everything you need to know",
    "trust": "AP3K connects through Instagram’s official API. You control the automations you activate.",
    "items": [
      [
        "What is AP3K?",
        "AP3K automates Instagram comments, direct messages, and story interactions so creators and businesses can respond to their audience and collect leads."
      ],
      [
        "How does AP3K work?",
        "Connect your Instagram account, choose a trigger, and write your response. When an eligible new comment, story interaction, or DM matches, AP3K runs your automation."
      ],
      [
        "How many Instagram accounts can I connect to AP3K?",
        "Free includes one Instagram account, Pro supports up to three, and Business supports up to ten. Each account has its own automations, contacts, and inbox."
      ],
      [
        "What is the Comment-to-DM feature?",
        "It sends a private message when someone comments on your post or reel. You can match specific keywords or any eligible comment, add a public reply, and deliver a link or offer."
      ],
      [
        "Is AP3K safe to use?",
        "AP3K connects through Instagram’s official authorization and API. You control its permissions and can disconnect at any time. Your automations must still follow Instagram’s policies and messaging limits."
      ],
      [
        "What is the Ask to Follow feature?",
        "Ask people to follow your account before receiving your link or resource. AP3K checks their follow status when Instagram provides it and delivers the message after the follow check succeeds."
      ],
      [
        "Can I automate responses to Instagram Stories?",
        "Yes. Story automation responds to eligible story replies, reactions, and mentions using the triggers and messages you configure."
      ],
      [
        "What is Universal Automation?",
        "An any-post rule applies a comment automation across your posts instead of one selected post. Story and chat automations use their own triggers."
      ],
      [
        "Can AP3K recover missed comments?",
        "AP3K responds to new eligible interactions received after activation. It does not currently backtrack through older comments."
      ],
      [
        "Is AP3K free?",
        "Yes. Free includes 500 automated actions per month, one Instagram account, and up to five active automations. Pro and Business add higher limits and AI features."
      ],
      [
        "How do I set up AP3K?",
        "Create an account, connect an Instagram Business or Creator account, and choose Post, Story, or Chat automation. Configure the trigger and response, activate it, and test from another Instagram account."
      ],
      [
        "Does AP3K work with any Instagram account?",
        "AP3K supports Instagram Business and Creator accounts. Switch a personal account to a professional account before connecting."
      ],
      [
        "Does AP3K store my Instagram login details?",
        "AP3K does not ask for or store your Instagram password. You authorize access through Instagram; AP3K stores the access credentials needed to run the features you permit."
      ],
      [
        "How do I set up a Chat Automation?",
        "Choose Chat automation on your dashboard. Set a keyword or any-message trigger, write your reply, and activate it. Test it by sending a DM from another Instagram account."
      ],
      [
        "How do I export captured leads?",
        "You can review captured contacts in Contacts. CSV export is not currently available in AP3K."
      ],
      [
        "How do I contact AP3K customer support if I need help?",
        "Email support@ap3k.com or open the Support center for setup guides and troubleshooting."
      ]
    ]
  },
  "fr": {
    "eyebrow": "Questions fréquentes",
    "title": "Tout ce que vous devez savoir",
    "trust": "AP3K se connecte via l’API officielle d’Instagram. Vous contrôlez les automatisations que vous activez.",
    "items": [
      [
        "Qu’est-ce qu’AP3K ?",
        "AP3K automatise les commentaires, les messages privés et les interactions avec les stories Instagram pour aider les créateurs et les entreprises à répondre à leur audience et à recueillir des prospects."
      ],
      [
        "Comment fonctionne AP3K ?",
        "Connectez votre compte Instagram, choisissez un déclencheur et rédigez votre réponse. AP3K lance l’automatisation lorsqu’un nouveau commentaire, une interaction avec une story ou un message privé admissible correspond."
      ],
      [
        "Combien de comptes Instagram puis-je connecter à AP3K ?",
        "Free inclut un compte Instagram, Pro en prend en charge jusqu’à trois et Business jusqu’à dix. Chaque compte possède ses propres automatisations, contacts et boîte de réception."
      ],
      [
        "Qu’est-ce que la fonctionnalité Commentaire vers DM ?",
        "Elle envoie un message privé lorsqu’une personne commente votre publication ou Reel. Vous pouvez cibler des mots-clés ou tout commentaire admissible, ajouter une réponse publique et transmettre un lien ou une offre."
      ],
      [
        "AP3K est-il sûr ?",
        "AP3K utilise l’autorisation et l’API officielles d’Instagram. Vous contrôlez les permissions et pouvez déconnecter votre compte à tout moment. Vos automatisations doivent respecter les règles et limites de messagerie d’Instagram."
      ],
      [
        "Qu’est-ce que la demande d’abonnement ?",
        "Demandez aux personnes de suivre votre compte avant de recevoir votre lien ou ressource. AP3K vérifie leur abonnement lorsque cette information est fournie par Instagram et envoie le message après une vérification réussie."
      ],
      [
        "Puis-je automatiser les réponses aux stories Instagram ?",
        "Oui. L’automatisation des stories répond aux réponses, réactions et mentions admissibles selon vos déclencheurs et messages."
      ],
      [
        "Qu’est-ce que l’automatisation universelle ?",
        "Une règle sur toutes les publications applique une automatisation de commentaires à vos publications plutôt qu’à une seule. Les automatisations des stories et des conversations utilisent leurs propres déclencheurs."
      ],
      [
        "AP3K peut-il récupérer les commentaires manqués ?",
        "AP3K répond aux nouvelles interactions admissibles reçues après activation. Il ne traite pas rétroactivement les anciens commentaires."
      ],
      [
        "AP3K est-il gratuit ?",
        "Oui. Free comprend 500 actions automatisées par mois, un compte Instagram et jusqu’à cinq automatisations actives. Pro et Business proposent des limites supérieures et des fonctions IA."
      ],
      [
        "Comment configurer AP3K ?",
        "Créez un compte, connectez un compte Instagram Business ou Creator, puis choisissez une automatisation de publications, de stories ou de conversations. Configurez le déclencheur et la réponse, activez-la et testez depuis un autre compte Instagram."
      ],
      [
        "AP3K fonctionne-t-il avec tous les comptes Instagram ?",
        "AP3K prend en charge les comptes Instagram Business et Creator. Passez votre compte personnel en compte professionnel avant de le connecter."
      ],
      [
        "AP3K conserve-t-il mes identifiants Instagram ?",
        "AP3K ne demande ni ne conserve votre mot de passe Instagram. Vous autorisez l’accès via Instagram ; AP3K conserve les identifiants d’accès nécessaires aux fonctions que vous autorisez."
      ],
      [
        "Comment créer une automatisation de conversations ?",
        "Choisissez Automatisation des conversations dans le tableau de bord. Définissez un mot-clé ou un déclencheur pour tout message, rédigez la réponse et activez-la. Testez en envoyant un DM depuis un autre compte Instagram."
      ],
      [
        "Comment exporter les prospects recueillis ?",
        "Vous pouvez consulter les contacts recueillis dans Contacts. L’export CSV n’est pas encore disponible dans AP3K."
      ],
      [
        "Comment contacter le support AP3K ?",
        "Écrivez à support@ap3k.com ou ouvrez le centre d’aide pour consulter les guides de configuration et de dépannage."
      ]
    ]
  },
  "es": {
    "eyebrow": "Preguntas frecuentes",
    "title": "Todo lo que necesitas saber",
    "trust": "AP3K se conecta mediante la API oficial de Instagram. Tú controlas las automatizaciones que activas.",
    "items": [
      [
        "¿Qué es AP3K?",
        "AP3K automatiza comentarios, mensajes directos e interacciones con historias de Instagram para que creadores y empresas respondan a su audiencia y capten contactos."
      ],
      [
        "¿Cómo funciona AP3K?",
        "Conecta tu cuenta de Instagram, elige un activador y escribe tu respuesta. AP3K ejecuta la automatización cuando coincide un nuevo comentario, interacción con historias o mensaje directo válido."
      ],
      [
        "¿Cuántas cuentas de Instagram puedo conectar a AP3K?",
        "Free incluye una cuenta, Pro admite hasta tres y Business hasta diez. Cada cuenta tiene sus propias automatizaciones, contactos y bandeja de entrada."
      ],
      [
        "¿Qué es la función de comentario a DM?",
        "Envía un mensaje privado cuando alguien comenta en tu publicación o reel. Puedes usar palabras clave o cualquier comentario válido, añadir una respuesta pública y enviar un enlace u oferta."
      ],
      [
        "¿Es seguro usar AP3K?",
        "AP3K se conecta mediante la autorización y la API oficiales de Instagram. Controlas los permisos y puedes desconectar tu cuenta cuando quieras. Tus automatizaciones deben respetar las políticas y los límites de mensajería de Instagram."
      ],
      [
        "¿Qué es la función de pedir que te sigan?",
        "Pide que sigan tu cuenta antes de recibir tu enlace o recurso. AP3K comprueba si te siguen cuando Instagram facilita esa información y envía el mensaje tras una verificación correcta."
      ],
      [
        "¿Puedo automatizar respuestas a historias de Instagram?",
        "Sí. La automatización de historias responde a respuestas, reacciones y menciones válidas según los activadores y mensajes que configures."
      ],
      [
        "¿Qué es la automatización universal?",
        "Una regla para todas las publicaciones aplica una automatización de comentarios a tus publicaciones en vez de a una sola. Las historias y el chat usan sus propios activadores."
      ],
      [
        "¿Puede AP3K recuperar comentarios perdidos?",
        "AP3K responde a nuevas interacciones válidas recibidas después de activarlo. Actualmente no procesa comentarios anteriores."
      ],
      [
        "¿AP3K es gratis?",
        "Sí. Free incluye 500 acciones automatizadas al mes, una cuenta de Instagram y hasta cinco automatizaciones activas. Pro y Business ofrecen límites superiores y funciones de IA."
      ],
      [
        "¿Cómo configuro AP3K?",
        "Crea una cuenta, conecta una cuenta de Instagram Business o Creator y elige automatización de publicaciones, historias o chat. Configura el activador y la respuesta, actívala y prueba desde otra cuenta de Instagram."
      ],
      [
        "¿AP3K funciona con cualquier cuenta de Instagram?",
        "AP3K admite cuentas de Instagram Business y Creator. Convierte una cuenta personal en profesional antes de conectarla."
      ],
      [
        "¿AP3K guarda mis datos de inicio de sesión de Instagram?",
        "AP3K no solicita ni guarda tu contraseña de Instagram. Autorizas el acceso desde Instagram; AP3K almacena las credenciales de acceso necesarias para las funciones que permites."
      ],
      [
        "¿Cómo configuro una automatización de chat?",
        "Elige Automatización del chat en tu panel. Configura una palabra clave o cualquier mensaje como activador, escribe tu respuesta y actívala. Prueba enviando un DM desde otra cuenta de Instagram."
      ],
      [
        "¿Cómo exporto los contactos captados?",
        "Puedes consultar los contactos captados en Contactos. La exportación CSV aún no está disponible en AP3K."
      ],
      [
        "¿Cómo contacto con el soporte de AP3K?",
        "Escribe a support@ap3k.com o abre el centro de ayuda para consultar guías de configuración y solución de problemas."
      ]
    ]
  },
  "de": {
    "eyebrow": "Häufig gestellte Fragen",
    "title": "Alles, was du wissen musst",
    "trust": "AP3K verbindet sich über die offizielle Instagram-API. Du entscheidest, welche Automatisierungen du aktivierst.",
    "items": [
      [
        "Was ist AP3K?",
        "AP3K automatisiert Instagram-Kommentare, Direktnachrichten und Story-Interaktionen, damit Creator und Unternehmen ihrer Zielgruppe antworten und Kontakte gewinnen können."
      ],
      [
        "Wie funktioniert AP3K?",
        "Verbinde dein Instagram-Konto, wähle einen Auslöser und schreibe deine Antwort. AP3K startet die Automatisierung, sobald ein zulässiger neuer Kommentar, eine Story-Interaktion oder eine DM dazu passt."
      ],
      [
        "Wie viele Instagram-Konten kann ich mit AP3K verbinden?",
        "Free enthält ein Konto, Pro unterstützt bis zu drei und Business bis zu zehn. Jedes Konto hat eigene Automatisierungen, Kontakte und einen eigenen Posteingang."
      ],
      [
        "Was ist die Kommentar-zu-DM-Funktion?",
        "Sie sendet eine private Nachricht, wenn jemand deinen Beitrag oder dein Reel kommentiert. Du kannst Schlüsselwörter oder jeden zulässigen Kommentar verwenden, öffentlich antworten und einen Link oder ein Angebot senden."
      ],
      [
        "Ist AP3K sicher?",
        "AP3K nutzt die offizielle Autorisierung und API von Instagram. Du kontrollierst die Berechtigungen und kannst die Verbindung jederzeit trennen. Deine Automatisierungen müssen weiterhin die Richtlinien und Nachrichtenlimits von Instagram beachten."
      ],
      [
        "Was ist die Funktion „Zum Folgen auffordern“?",
        "Bitte Personen, deinem Konto zu folgen, bevor sie deinen Link oder Inhalt erhalten. AP3K prüft den Follow-Status, wenn Instagram ihn bereitstellt, und sendet die Nachricht nach erfolgreicher Prüfung."
      ],
      [
        "Kann ich Antworten auf Instagram-Stories automatisieren?",
        "Ja. Story-Automatisierungen beantworten zulässige Story-Antworten, Reaktionen und Erwähnungen anhand deiner Auslöser und Nachrichten."
      ],
      [
        "Was ist universelle Automatisierung?",
        "Eine Regel für alle Beiträge wendet eine Kommentarautomatisierung auf deine Beiträge statt auf einen einzelnen Beitrag an. Story- und Chat-Automatisierungen verwenden eigene Auslöser."
      ],
      [
        "Kann AP3K verpasste Kommentare nachträglich beantworten?",
        "AP3K reagiert auf neue zulässige Interaktionen, die nach der Aktivierung eingehen. Ältere Kommentare werden derzeit nicht nachträglich verarbeitet."
      ],
      [
        "Ist AP3K kostenlos?",
        "Ja. Free enthält 500 automatisierte Aktionen pro Monat, ein Instagram-Konto und bis zu fünf aktive Automatisierungen. Pro und Business bieten höhere Limits und KI-Funktionen."
      ],
      [
        "Wie richte ich AP3K ein?",
        "Erstelle ein Konto, verbinde ein Instagram-Business- oder Creator-Konto und wähle eine Beitrags-, Story- oder Chat-Automatisierung. Richte Auslöser und Antwort ein, aktiviere sie und teste sie von einem anderen Instagram-Konto aus."
      ],
      [
        "Funktioniert AP3K mit jedem Instagram-Konto?",
        "AP3K unterstützt Business- und Creator-Konten. Stelle ein persönliches Konto vor dem Verbinden auf ein professionelles Konto um."
      ],
      [
        "Speichert AP3K meine Instagram-Anmeldedaten?",
        "AP3K fragt nicht nach deinem Instagram-Passwort und speichert es nicht. Du autorisierst den Zugriff über Instagram. AP3K speichert die Zugangsdaten, die für die von dir erlaubten Funktionen erforderlich sind."
      ],
      [
        "Wie richte ich eine Chat-Automatisierung ein?",
        "Wähle im Dashboard Chat-Automatisierung. Lege ein Schlüsselwort oder jede Nachricht als Auslöser fest, schreibe die Antwort und aktiviere sie. Teste sie mit einer DM von einem anderen Instagram-Konto."
      ],
      [
        "Wie exportiere ich erfasste Kontakte?",
        "Erfasste Kontakte kannst du unter Kontakte ansehen. Ein CSV-Export ist in AP3K derzeit nicht verfügbar."
      ],
      [
        "Wie erreiche ich den AP3K-Support?",
        "Schreibe an support@ap3k.com oder öffne das Hilfe-Center für Einrichtungsanleitungen und Hilfe bei Problemen."
      ]
    ]
  },
  "pt": {
    "eyebrow": "Perguntas frequentes",
    "title": "Tudo o que precisa de saber",
    "trust": "O AP3K liga-se através da API oficial do Instagram. Controla as automações que ativa.",
    "items": [
      [
        "O que é o AP3K?",
        "O AP3K automatiza comentários, mensagens diretas e interações com histórias do Instagram para ajudar criadores e empresas a responder ao público e recolher contactos."
      ],
      [
        "Como funciona o AP3K?",
        "Ligue a sua conta do Instagram, escolha um acionador e escreva a resposta. O AP3K executa a automatização quando corresponde um novo comentário, interação com histórias ou mensagem direta elegível."
      ],
      [
        "Quantas contas do Instagram posso ligar ao AP3K?",
        "O Free inclui uma conta, o Pro permite até três e o Business até dez. Cada conta tem as suas próprias automatizações, contactos e caixa de entrada."
      ],
      [
        "O que é a funcionalidade de comentário para DM?",
        "Envia uma mensagem privada quando alguém comenta uma publicação ou Reel. Pode usar palavras-chave ou qualquer comentário elegível, adicionar uma resposta pública e enviar um link ou oferta."
      ],
      [
        "É seguro utilizar o AP3K?",
        "O AP3K utiliza a autorização e a API oficiais do Instagram. Controla as permissões e pode desligar a conta a qualquer momento. As automatizações devem respeitar as políticas e os limites de mensagens do Instagram."
      ],
      [
        "O que é a funcionalidade de pedir para seguir?",
        "Peça às pessoas para seguirem a sua conta antes de receberem o link ou recurso. O AP3K verifica se seguem a conta quando o Instagram fornece essa informação e envia a mensagem após a verificação bem-sucedida."
      ],
      [
        "Posso automatizar respostas às histórias do Instagram?",
        "Sim. A automatização de histórias responde a respostas, reações e menções elegíveis com os acionadores e mensagens que configurar."
      ],
      [
        "O que é a automatização universal?",
        "Uma regra para todas as publicações aplica uma automatização de comentários às suas publicações em vez de a uma só. As automatizações de histórias e conversas usam os seus próprios acionadores."
      ],
      [
        "O AP3K pode recuperar comentários perdidos?",
        "O AP3K responde a novas interações elegíveis recebidas após a ativação. Atualmente não processa comentários antigos."
      ],
      [
        "O AP3K é gratuito?",
        "Sim. O Free inclui 500 ações automatizadas por mês, uma conta do Instagram e até cinco automatizações ativas. O Pro e o Business oferecem limites superiores e funções de IA."
      ],
      [
        "Como configuro o AP3K?",
        "Crie uma conta, ligue uma conta Instagram Business ou Creator e escolha automatização de publicações, histórias ou conversas. Configure o acionador e a resposta, ative-a e teste a partir de outra conta do Instagram."
      ],
      [
        "O AP3K funciona com qualquer conta do Instagram?",
        "O AP3K suporta contas Instagram Business e Creator. Converta uma conta pessoal em profissional antes de a ligar."
      ],
      [
        "O AP3K guarda os meus dados de início de sessão do Instagram?",
        "O AP3K não pede nem guarda a sua palavra-passe do Instagram. Autoriza o acesso através do Instagram; o AP3K guarda as credenciais de acesso necessárias às funções que permite."
      ],
      [
        "Como configuro uma automatização de conversas?",
        "Escolha Automatização de conversas no painel. Defina uma palavra-chave ou qualquer mensagem como acionador, escreva a resposta e ative-a. Teste enviando uma DM a partir de outra conta do Instagram."
      ],
      [
        "Como exporto os contactos recolhidos?",
        "Pode consultar os contactos recolhidos em Contactos. A exportação CSV ainda não está disponível no AP3K."
      ],
      [
        "Como contacto o suporte do AP3K?",
        "Envie um email para support@ap3k.com ou abra o centro de ajuda para consultar guias de configuração e resolução de problemas."
      ]
    ]
  }
} satisfies Record<Locale, FaqCopy>;
