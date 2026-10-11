import { LOCALE_SOURCE_COLUMN, SUPPORTED_LOCALES, type Locale } from "./config";

export const SETUP_ROWS: readonly (readonly [string, string, string, string, string])[] = [
  [
    "← Back to automations", "← Retour aux automatisations",
    "← Volver a automatizaciones",
    "← Zurück zu Automatisierungen",
    "← Voltar às automatizações"
  ],
  [
    "Back to automations", "Retour aux automatisations",
    "Volver a automatizaciones",
    "Zurück zu Automatisierungen",
    "Voltar às automatizações"
  ],
  [
    "What should start the conversation?", "Qu’est-ce qui doit lancer la conversation ?",
    "¿Qué debe iniciar la conversación?",
    "Was soll das Gespräch starten?",
    "O que deve iniciar a conversa?"
  ],
  [
    "Choose one starting point. You can fine-tune the trigger, message, and delivery rules next.", "Choisissez un point de départ. Vous pourrez ensuite affiner le déclencheur, le message et les règles d’envoi.",
    "Elige un punto de partida. Después podrás ajustar el activador, el mensaje y las reglas de envío.",
    "Wähle einen Ausgangspunkt. Anschließend kannst du Auslöser, Nachricht und Versandregeln anpassen.",
    "Escolha um ponto de partida. Depois poderá ajustar o acionador, a mensagem e as regras de envio."
  ],
  [
    "Posts & Reels", "Publications et Reels",
    "Publicaciones y Reels",
    "Beiträge und Reels",
    "Publicações e Reels"
  ],
  [
    "Comment automation", "Automatisation des commentaires",
    "Automatización de comentarios",
    "Kommentarautomatisierung",
    "Automatização de comentários"
  ],
  [
    "Story automation", "Automatisation des stories",
    "Automatización de historias",
    "Story-Automatisierung",
    "Automatização de histórias"
  ],
  [
    "DM automation", "Automatisation des DM",
    "Automatización de mensajes directos",
    "DM-Automatisierung",
    "Automatização de mensagens diretas"
  ],
  [
    "Reply publicly, send a DM, or do both when someone comments.", "Répondez publiquement, envoyez un DM ou faites les deux lorsqu’une personne commente.",
    "Responde públicamente, envía un mensaje directo o haz ambas cosas cuando alguien comente.",
    "Antworte öffentlich, sende eine DM oder beides, wenn jemand kommentiert.",
    "Responda publicamente, envie uma mensagem direta ou faça ambas as coisas quando alguém comentar."
  ],
  [
    "Respond to mentions, emoji reactions, or text replies in DMs.", "Répondez aux mentions, aux réactions emoji ou aux réponses textuelles par DM.",
    "Responde a menciones, reacciones con emojis o respuestas de texto por mensaje directo.",
    "Reagiere per DM auf Erwähnungen, Emoji-Reaktionen oder Textantworten.",
    "Responda a menções, reações com emojis ou respostas de texto por mensagem direta."
  ],
  [
    "Send a saved response when a new DM contains a keyword—or any message arrives.", "Envoyez une réponse enregistrée lorsqu’un nouveau DM contient un mot-clé, ou à chaque message reçu.",
    "Envía una respuesta guardada cuando un nuevo mensaje directo contenga una palabra clave o cuando llegue cualquier mensaje.",
    "Sende eine gespeicherte Antwort, wenn eine neue DM ein Schlüsselwort enthält oder eine beliebige Nachricht eingeht.",
    "Envie uma resposta guardada quando uma nova mensagem direta contiver uma palavra-chave ou sempre que chegar uma mensagem."
  ],
  [
    "Build this flow", "Créer ce parcours",
    "Crear este flujo",
    "Diesen Ablauf erstellen",
    "Criar este fluxo"
  ],
  [
    "Step {current} of {total}", "Étape {current} sur {total}",
    "Paso {current} de {total}",
    "Schritt {current} von {total}",
    "Passo {current} de {total}"
  ],
  [
    "Choose a post or Reel", "Choisissez une publication ou un Reel",
    "Elige una publicación o un Reel",
    "Wähle einen Beitrag oder ein Reel",
    "Escolha uma publicação ou um Reel"
  ],
  [
    "Select where AP3K should listen for comments.", "Choisissez où AP3K doit surveiller les commentaires.",
    "Elige dónde debe detectar comentarios AP3K.",
    "Wähle, wo AP3K auf Kommentare achten soll.",
    "Escolha onde o AP3K deve detetar comentários."
  ],
  [
    "Example: AI guide automation", "Exemple : automatisation du guide IA",
    "Ejemplo: automatización de la guía de IA",
    "Beispiel: Automatisierung für den KI-Leitfaden",
    "Exemplo: automatização do guia de IA"
  ],
  [
    "Listen on every post and Reel.", "Surveiller chaque publication et Reel.",
    "Detectar comentarios en todas las publicaciones y Reels.",
    "Alle Beiträge und Reels überwachen.",
    "Detetar comentários em todas as publicações e Reels."
  ],
  [
    "Choose a post", "Choisissez une publication",
    "Elige una publicación",
    "Wähle einen Beitrag",
    "Escolha uma publicação"
  ],
  [
    "Any post or Reel", "Toute publication ou tout Reel",
    "Cualquier publicación o Reel",
    "Beliebiger Beitrag oder Reel",
    "Qualquer publicação ou Reel"
  ],
  [
    "Your selected Instagram media appears here instantly.", "Le contenu Instagram sélectionné apparaît ici immédiatement.",
    "El contenido de Instagram que elijas aparecerá aquí al instante.",
    "Deine ausgewählten Instagram-Medien erscheinen hier sofort.",
    "O conteúdo do Instagram selecionado aparece aqui imediatamente."
  ],
  [
    "Your Instagram caption and automation trigger preview will appear here.", "La légende Instagram et l’aperçu du déclencheur apparaîtront ici.",
    "Aquí aparecerán el texto de tu publicación y la vista previa del activador.",
    "Hier erscheinen deine Instagram-Bildunterschrift und die Vorschau des Auslösers.",
    "A legenda do Instagram e a pré-visualização do acionador aparecerão aqui."
  ],
  [
    "Any post - triggers on all Instagram posts", "Toute publication — se déclenche sur toutes les publications Instagram",
    "Cualquier publicación: se activa en todas las publicaciones de Instagram",
    "Beliebiger Beitrag – wird bei allen Instagram-Beiträgen ausgelöst",
    "Qualquer publicação — acionado em todas as publicações do Instagram"
  ],
  [
    "View all comments", "Voir tous les commentaires",
    "Ver todos los comentarios",
    "Alle Kommentare ansehen",
    "Ver todos os comentários"
  ],
  [
    "Posts", "Publications",
    "Publicaciones",
    "Beiträge",
    "Publicações"
  ],
  [
    "Post", "Publication",
    "Publicación",
    "Beitrag",
    "Publicação"
  ],
  [
    "Comments", "Commentaires",
    "Comentarios",
    "Kommentare",
    "Comentários"
  ],
  [
    "DM", "DM",
    "Mensaje directo",
    "DM",
    "Mensagem direta"
  ],
  [
    "Stories", "Stories",
    "Historias",
    "Stories",
    "Histórias"
  ],
  [
    "What comment starts this automation?", "Quel commentaire déclenche cette automatisation ?",
    "¿Qué comentario inicia esta automatización?",
    "Welcher Kommentar startet diese Automatisierung?",
    "Que comentário inicia esta automatização?"
  ],
  [
    "Trigger on a keyword or on every comment.", "Déclenchez avec un mot-clé ou à chaque commentaire.",
    "Activa con una palabra clave o con cada comentario.",
    "Auslösen durch ein Schlüsselwort oder jeden Kommentar.",
    "Acione com uma palavra-chave ou com cada comentário."
  ],
  [
    "Every comment will trigger this automation.", "Chaque commentaire déclenchera cette automatisation.",
    "Cada comentario activará esta automatización.",
    "Jeder Kommentar löst diese Automatisierung aus.",
    "Cada comentário acionará esta automatização."
  ],
  [
    "AP3K automatically ignores your own replies to prevent loops. Use this when every commenter should get the same response.", "AP3K ignore vos propres réponses pour éviter les boucles. Utilisez cette option pour envoyer la même réponse à chaque personne qui commente.",
    "AP3K ignora tus propias respuestas para evitar bucles. Usa esta opción si todos los comentarios deben recibir la misma respuesta.",
    "AP3K ignoriert deine eigenen Antworten, um Schleifen zu vermeiden. Nutze dies, wenn alle Kommentierenden dieselbe Antwort erhalten sollen.",
    "O AP3K ignora as suas próprias respostas para evitar ciclos. Use esta opção para enviar a mesma resposta a todas as pessoas que comentam."
  ],
  [
    "Add at least one word people will comment intentionally. Example: if the post says comment GUIDE, add guide here.", "Ajoutez au moins un mot que les personnes commenteront volontairement. Par exemple, si la publication demande de commenter GUIDE, ajoutez guide ici.",
    "Añade al menos una palabra que las personas comentarán a propósito. Por ejemplo, si la publicación pide comentar GUÍA, añade guía aquí.",
    "Füge mindestens ein Wort hinzu, das Personen gezielt kommentieren. Wenn der Beitrag etwa zum Kommentar GUIDE auffordert, füge hier guide hinzu.",
    "Adicione pelo menos uma palavra que as pessoas comentarão de propósito. Por exemplo, se a publicação pedir para comentar GUIA, adicione guia aqui."
  ],
  [
    "What should AP3K do?", "Que doit faire AP3K ?",
    "¿Qué debe hacer AP3K?",
    "Was soll AP3K tun?",
    "O que deve fazer o AP3K?"
  ],
  [
    "Reply publicly, send a DM, or do both.", "Répondez publiquement, envoyez un DM ou faites les deux.",
    "Responde públicamente, envía un mensaje directo o haz ambas cosas.",
    "Antworte öffentlich, sende eine DM oder beides.",
    "Responda publicamente, envie uma mensagem direta ou faça ambas as coisas."
  ],
  [
    "Visible under the Instagram post. Add up to three variations to keep replies natural.", "Visible sous la publication Instagram. Ajoutez jusqu’à trois variantes pour des réponses naturelles.",
    "Visible bajo la publicación de Instagram. Añade hasta tres variantes para que las respuestas sean naturales.",
    "Sichtbar unter dem Instagram-Beitrag. Füge bis zu drei Varianten hinzu, damit Antworten natürlich wirken.",
    "Visível sob a publicação do Instagram. Adicione até três variantes para manter as respostas naturais."
  ],
  [
    "Reply 1", "Réponse 1",
    "Respuesta 1",
    "Antwort 1",
    "Resposta 1"
  ],
  [
    "Reply 2", "Réponse 2",
    "Respuesta 2",
    "Antwort 2",
    "Resposta 2"
  ],
  [
    "Reply 3", "Réponse 3",
    "Respuesta 3",
    "Antwort 3",
    "Resposta 3"
  ],
  [
    "Sent privately to the commenter's Instagram inbox.", "Envoyé en privé dans la messagerie Instagram de la personne qui commente.",
    "Se envía de forma privada a la bandeja de Instagram de quien comenta.",
    "Wird privat an das Instagram-Postfach der kommentierenden Person gesendet.",
    "Enviada em privado para a caixa de entrada do Instagram de quem comenta."
  ],
  [
    "The required delivery message. Add one to three link buttons.", "Le message d’envoi requis. Ajoutez un à trois boutons de lien.",
    "El mensaje de entrega obligatorio. Añade entre uno y tres botones de enlace.",
    "Die erforderliche Zustellnachricht. Füge ein bis drei Link-Schaltflächen hinzu.",
    "A mensagem de entrega obrigatória. Adicione um a três botões de ligação."
  ],
  [
    "Write the message shown above your links…", "Écrivez le message affiché au-dessus de vos liens…",
    "Escribe el mensaje que aparecerá encima de tus enlaces…",
    "Schreibe die Nachricht über deinen Links…",
    "Escreva a mensagem apresentada acima das suas ligações…"
  ],
  [
    "Links ({count}/{max})", "Liens ({count}/{max})",
    "Enlaces ({count}/{max})",
    "Links ({count}/{max})",
    "Ligações ({count}/{max})"
  ],
  [
    "Link {number}", "Lien {number}",
    "Enlace {number}",
    "Link {number}",
    "Ligação {number}"
  ],
  [
    "Remove link {number}", "Supprimer le lien {number}",
    "Eliminar enlace {number}",
    "Link {number} entfernen",
    "Remover ligação {number}"
  ],
  [
    "Each label appears as a full-width button below the DM.", "Chaque libellé apparaît sur un bouton pleine largeur sous le DM.",
    "Cada etiqueta aparece en un botón de ancho completo debajo del mensaje directo.",
    "Jede Beschriftung erscheint als Schaltfläche über die gesamte Breite unter der DM.",
    "Cada etiqueta aparece num botão de largura total abaixo da mensagem direta."
  ],
  [
    "Ask the commenter to tap before AP3K delivers the final DM. Leave off to deliver the final DM immediately.", "Demandez à la personne de cliquer avant l’envoi du DM final. Laissez désactivé pour l’envoyer immédiatement.",
    "Pide a quien comenta que pulse antes de enviar el mensaje final. Déjalo desactivado para enviarlo de inmediato.",
    "Bitte die kommentierende Person vor der finalen DM um einen Klick. Deaktiviert wird die finale DM sofort gesendet.",
    "Peça a quem comenta que toque antes do envio da mensagem final. Deixe desativado para a enviar imediatamente."
  ],
  [
    "Continue quick reply", "Réponse rapide pour continuer",
    "Respuesta rápida para continuar",
    "Schnellantwort zum Fortfahren",
    "Resposta rápida para continuar"
  ],
  [
    "Instagram uses this reply to open the conversation so AP3K can reliably deliver the next DM.", "Instagram utilise cette réponse pour ouvrir la conversation afin qu’AP3K puisse envoyer le DM suivant de façon fiable.",
    "Instagram usa esta respuesta para abrir la conversación y permitir que AP3K envíe el siguiente mensaje de forma fiable.",
    "Instagram öffnet mit dieser Antwort das Gespräch, damit AP3K die nächste DM zuverlässig zustellen kann.",
    "O Instagram usa esta resposta para abrir a conversa, permitindo ao AP3K enviar a mensagem seguinte de forma fiável."
  ],
  [
    "Leave this off to send the final DM immediately after the opening button.", "Laissez désactivé pour envoyer le DM final dès le clic sur le bouton d’ouverture.",
    "Déjalo desactivado para enviar el mensaje final justo después de pulsar el botón inicial.",
    "Lass dies deaktiviert, um die finale DM direkt nach dem Klick auf die erste Schaltfläche zu senden.",
    "Deixe desativado para enviar a mensagem final logo após o toque no botão inicial."
  ],
  [
    "Ask people to follow before sending the link", "Demander de s’abonner avant d’envoyer le lien",
    "Pedir que te sigan antes de enviar el enlace",
    "Vor dem Linkversand zum Folgen auffordern",
    "Pedir para seguir antes de enviar a ligação"
  ],
  [
    "Optional. Instagram shows Follow and verification as two full-width buttons in the same message. AP3K sends the final DM only after verification confirms the follow.", "Facultatif. Instagram affiche deux boutons pleine largeur dans le même message : abonnement et vérification. AP3K n’envoie le DM final qu’après confirmation de l’abonnement.",
    "Opcional. Instagram muestra dos botones de ancho completo en el mismo mensaje: seguir y verificar. AP3K solo envía el mensaje final tras confirmar el seguimiento.",
    "Optional. Instagram zeigt Folgen und Bestätigung als zwei Schaltflächen über die volle Breite in derselben Nachricht. AP3K sendet die finale DM erst nach bestätigtem Folgen.",
    "Opcional. O Instagram mostra dois botões de largura total na mesma mensagem: seguir e verificar. O AP3K só envia a mensagem final após confirmar que a pessoa segue a conta."
  ],
  [
    "Sent only when the person is not following yet.", "Envoyé uniquement si la personne ne vous suit pas encore.",
    "Solo se envía si la persona aún no te sigue.",
    "Wird nur gesendet, wenn die Person noch nicht folgt.",
    "Enviada apenas se a pessoa ainda não seguir a conta."
  ],
  [
    "Optional step", "Étape facultative",
    "Paso opcional",
    "Optionaler Schritt",
    "Passo opcional"
  ],
  [
    "Verification quick reply", "Réponse rapide de vérification",
    "Respuesta rápida de verificación",
    "Schnellantwort zur Bestätigung",
    "Resposta rápida de verificação"
  ],
  [
    "Rechecks follow", "Revérifie l’abonnement",
    "Vuelve a comprobar el seguimiento",
    "Prüft das Folgen erneut",
    "Verifica novamente se segue"
  ],
  [
    "Both controls appear inside the message. AP3K verifies the callback subscription before using them and falls back safely if Meta does not confirm it.", "Les deux commandes figurent dans le message. AP3K vérifie l’abonnement aux callbacks avant de les utiliser et utilise une solution de repli sûre si Meta ne le confirme pas.",
    "Ambos controles aparecen en el mensaje. AP3K verifica la suscripción a callbacks antes de usarlos y recurre a una alternativa segura si Meta no la confirma.",
    "Beide Steuerelemente erscheinen in der Nachricht. AP3K prüft vorher das Callback-Abonnement und nutzt eine sichere Alternative, falls Meta es nicht bestätigt.",
    "Ambos os controlos aparecem na mensagem. O AP3K verifica a subscrição de callbacks antes de os usar e recorre a uma alternativa segura se a Meta não a confirmar."
  ],
  [
    "Choose at least one action: Reply to comment or Send a DM.", "Choisissez au moins une action : répondre au commentaire ou envoyer un DM.",
    "Elige al menos una acción: responder al comentario o enviar un mensaje directo.",
    "Wähle mindestens eine Aktion: auf den Kommentar antworten oder eine DM senden.",
    "Escolha pelo menos uma ação: responder ao comentário ou enviar uma mensagem direta."
  ],
  [
    "Review & Activate", "Vérifier et activer",
    "Revisar y activar",
    "Prüfen und aktivieren",
    "Rever e ativar"
  ],
  [
    "Check the flow, then save or activate.", "Vérifiez le parcours, puis enregistrez ou activez.",
    "Revisa el flujo y guárdalo o actívalo.",
    "Prüfe den Ablauf und speichere oder aktiviere ihn.",
    "Reveja o fluxo e guarde ou ative."
  ],
  [
    "Saved replies: {count}", "Réponses enregistrées : {count}",
    "Respuestas guardadas: {count}",
    "Gespeicherte Antworten: {count}",
    "Respostas guardadas: {count}"
  ],
  [
    "Selected post {id}", "Publication sélectionnée {id}",
    "Publicación seleccionada {id}",
    "Ausgewählter Beitrag {id}",
    "Publicação selecionada {id}"
  ],
  [
    "Off · final DM sends immediately", "Désactivé · le DM final est envoyé immédiatement",
    "Desactivado · el mensaje final se envía de inmediato",
    "Aus · finale DM wird sofort gesendet",
    "Desativado · a mensagem final é enviada imediatamente"
  ],
  [
    "Untitled link", "Lien sans titre",
    "Enlace sin título",
    "Unbenannter Link",
    "Ligação sem título"
  ],
  [
    "Fun tone", "Ton amusant",
    "Tono divertido",
    "Lockerer Ton",
    "Tom divertido"
  ],
  [
    "Professional tone", "Ton professionnel",
    "Tono profesional",
    "Professioneller Ton",
    "Tom profissional"
  ],
  [
    "Friendly tone", "Ton amical",
    "Tono cercano",
    "Freundlicher Ton",
    "Tom amigável"
  ],
  [
    "Health warnings", "Alertes de connexion",
    "Avisos de conexión",
    "Verbindungswarnungen",
    "Avisos de ligação"
  ],
  [
    "When enabled, AP3K listens for matching comments and runs the actions you selected.", "Une fois activé, AP3K détecte les commentaires correspondants et exécute les actions choisies.",
    "Al activarlo, AP3K detecta los comentarios coincidentes y ejecuta las acciones elegidas.",
    "Wenn aktiviert, erkennt AP3K passende Kommentare und führt deine gewählten Aktionen aus.",
    "Quando ativado, o AP3K deteta comentários correspondentes e executa as ações escolhidas."
  ],
  [
    "When someone interacts with your story", "Lorsqu’une personne interagit avec votre story",
    "Cuando alguien interactúa con tu historia",
    "Wenn jemand mit deiner Story interagiert",
    "Quando alguém interage com a sua história"
  ],
  [
    "When someone sends you a DM", "Lorsqu’une personne vous envoie un DM",
    "Cuando alguien te envía un mensaje directo",
    "Wenn dir jemand eine DM sendet",
    "Quando alguém lhe envia uma mensagem direta"
  ],
  [
    "Set the conditions that launch this automation.", "Définissez les conditions de déclenchement de cette automatisation.",
    "Define las condiciones que inician esta automatización.",
    "Lege die Bedingungen fest, die diese Automatisierung starten.",
    "Defina as condições que iniciam esta automatização."
  ],
  [
    "Mentions me", "Me mentionne",
    "Me menciona",
    "Erwähnt mich",
    "Menciona-me"
  ],
  [
    "Tagged in a story", "Mention dans une story",
    "Mención en una historia",
    "In einer Story markiert",
    "Identificação numa história"
  ],
  [
    "Reacts", "Réagit",
    "Reacciona",
    "Reagiert",
    "Reage"
  ],
  [
    "Sends an emoji reaction", "Envoie une réaction emoji",
    "Envía una reacción con emoji",
    "Sendet eine Emoji-Reaktion",
    "Envia uma reação com emoji"
  ],
  [
    "Sends a text reply to your story", "Envoie une réponse textuelle à votre story",
    "Envía una respuesta de texto a tu historia",
    "Sendet eine Textantwort auf deine Story",
    "Envia uma resposta de texto à sua história"
  ],
  [
    "Specific keyword", "Mot-clé précis",
    "Palabra clave específica",
    "Bestimmtes Schlüsselwort",
    "Palavra-chave específica"
  ],
  [
    "Any incoming DM", "Tout DM reçu",
    "Cualquier mensaje directo recibido",
    "Jede eingehende DM",
    "Qualquer mensagem direta recebida"
  ],
  [
    "Launch when the DM contains one of your keywords.", "Déclencher lorsque le DM contient l’un de vos mots-clés.",
    "Iniciar cuando el mensaje contenga una de tus palabras clave.",
    "Starten, wenn die DM eines deiner Schlüsselwörter enthält.",
    "Iniciar quando a mensagem contiver uma das suas palavras-chave."
  ],
  [
    "Launch for every new conversation message.", "Déclencher à chaque nouveau message de conversation.",
    "Iniciar con cada nuevo mensaje de la conversación.",
    "Bei jeder neuen Gesprächsnachricht starten.",
    "Iniciar com cada nova mensagem da conversa."
  ],
  [
    "Type a keyword, e.g. \"guide\"", "Saisissez un mot-clé, par ex. « guide »",
    "Escribe una palabra clave, p. ej., «guía»",
    "Schlüsselwort eingeben, z. B. „guide“",
    "Escreva uma palavra-chave, por exemplo, «guia»"
  ],
  [
    "Type a keyword (e.g. \"link\", \"guide\", \"yes\")", "Saisissez un mot-clé (ex. « lien », « guide », « oui »)",
    "Escribe una palabra clave (p. ej., «enlace», «guía», «sí»)",
    "Schlüsselwort eingeben (z. B. „Link“, „Guide“, „Ja“)",
    "Escreva uma palavra-chave (por exemplo, «ligação», «guia», «sim»)"
  ],
  [
    "+ Add", "+ Ajouter",
    "+ Añadir",
    "+ Hinzufügen",
    "+ Adicionar"
  ],
  [
    "Choose the DM response", "Choisissez la réponse par DM",
    "Elige la respuesta por mensaje directo",
    "Wähle die DM-Antwort",
    "Escolha a resposta por mensagem direta"
  ],
  [
    "Send a saved message or let AP3K AI answer from your shared knowledge.", "Envoyez un message enregistré ou laissez AP3K AI répondre à partir de vos connaissances partagées.",
    "Envía un mensaje guardado o deja que AP3K AI responda con tus conocimientos compartidos.",
    "Sende eine gespeicherte Nachricht oder lasse AP3K AI mit deinem hinterlegten Wissen antworten.",
    "Envie uma mensagem guardada ou deixe o AP3K AI responder com base no seu conhecimento partilhado."
  ],
  [
    "Saved response", "Réponse enregistrée",
    "Respuesta guardada",
    "Gespeicherte Antwort",
    "Resposta guardada"
  ],
  [
    "A predictable message with up to three link buttons.", "Un message fixe avec jusqu’à trois boutons de lien.",
    "Un mensaje fijo con hasta tres botones de enlace.",
    "Eine feste Nachricht mit bis zu drei Link-Schaltflächen.",
    "Uma mensagem fixa com até três botões de ligação."
  ],
  [
    "AP3K AI reply", "Réponse AP3K AI",
    "Respuesta de AP3K AI",
    "AP3K-AI-Antwort",
    "Resposta do AP3K AI"
  ],
  [
    "Answers in your voice using AP3K AI knowledge.", "Répond avec votre ton grâce aux connaissances d’AP3K AI.",
    "Responde con tu estilo usando los conocimientos de AP3K AI.",
    "Antwortet in deinem Stil mit dem Wissen von AP3K AI.",
    "Responde no seu estilo usando o conhecimento do AP3K AI."
  ],
  [
    "Enable AI Replies in AP3K AI first", "Activez d’abord les réponses IA dans AP3K AI",
    "Activa primero las respuestas de IA en AP3K AI",
    "Aktiviere zuerst KI-Antworten in AP3K AI",
    "Ative primeiro as respostas de IA no AP3K AI"
  ],
  [
    "AI response enabled", "Réponse IA activée",
    "Respuesta de IA activada",
    "KI-Antwort aktiviert",
    "Resposta de IA ativada"
  ],
  [
    "AP3K AI uses the incoming DM plus your knowledge, behavior, and guardrails. When a saved knowledge URL answers the request, AI can attach it as one native Instagram button. The message below is sent only if the provider is unavailable.", "AP3K AI utilise le DM reçu, vos connaissances, votre comportement et vos garde-fous. Si une URL enregistrée répond à la demande, l’IA peut la joindre comme bouton Instagram natif. Le message ci-dessous n’est envoyé que si le fournisseur est indisponible.",
    "AP3K AI usa el mensaje recibido, tus conocimientos, comportamiento y límites. Si una URL guardada responde a la solicitud, la IA puede adjuntarla como un botón nativo de Instagram. El mensaje siguiente solo se envía si el proveedor no está disponible.",
    "AP3K AI nutzt die eingehende DM sowie dein Wissen, Verhalten und deine Schutzregeln. Beantwortet eine hinterlegte Wissens-URL die Anfrage, kann die KI sie als native Instagram-Schaltfläche anhängen. Die folgende Nachricht wird nur gesendet, wenn der Anbieter nicht verfügbar ist.",
    "O AP3K AI usa a mensagem recebida, o seu conhecimento, comportamento e limites. Se um URL guardado responder ao pedido, a IA pode anexá-lo como botão nativo do Instagram. A mensagem abaixo só é enviada se o fornecedor estiver indisponível."
  ],
  [
    "Safe fallback message", "Message de repli sûr",
    "Mensaje alternativo seguro",
    "Sichere Ersatznachricht",
    "Mensagem alternativa segura"
  ],
  [
    "Configure rules & name", "Configurer les règles et le nom",
    "Configurar reglas y nombre",
    "Regeln und Namen festlegen",
    "Configurar regras e nome"
  ],
  [
    "Name the automation. AI replies are sent immediately after a matching message.", "Nommez l’automatisation. Les réponses IA sont envoyées dès qu’un message correspond.",
    "Pon nombre a la automatización. Las respuestas de IA se envían en cuanto coincide un mensaje.",
    "Benenne die Automatisierung. KI-Antworten werden sofort nach einer passenden Nachricht gesendet.",
    "Dê um nome à automatização. As respostas de IA são enviadas logo após uma mensagem correspondente."
  ],
  [
    "Name the automation and decide whether the saved response is reserved for followers.", "Nommez l’automatisation et décidez si la réponse enregistrée est réservée aux abonnés.",
    "Pon nombre a la automatización y decide si la respuesta guardada es solo para seguidores.",
    "Benenne die Automatisierung und lege fest, ob die gespeicherte Antwort nur für Follower bestimmt ist.",
    "Dê um nome à automatização e decida se a resposta guardada é exclusiva para seguidores."
  ],
  [
    "Story mention welcome", "Accueil après mention dans une story",
    "Bienvenida por mención en historia",
    "Begrüßung bei Story-Erwähnung",
    "Boas-vindas por menção na história"
  ],
  [
    "Guide request DM", "DM de demande de guide",
    "Mensaje de solicitud de guía",
    "DM bei Guide-Anfrage",
    "Mensagem de pedido de guia"
  ],
  [
    "Immediate AI response", "Réponse IA immédiate",
    "Respuesta inmediata de IA",
    "Sofortige KI-Antwort",
    "Resposta imediata de IA"
  ],
  [
    "Follow requests are disabled for AI replies so AP3K never generates and hides an answer. Your saved fallback is used only if the provider is unavailable.", "Les demandes d’abonnement sont désactivées pour les réponses IA afin qu’AP3K ne génère jamais une réponse cachée. Le message de repli n’est utilisé que si le fournisseur est indisponible.",
    "Las solicitudes de seguimiento están desactivadas para las respuestas de IA, para que AP3K nunca genere y oculte una respuesta. La alternativa guardada solo se usa si el proveedor no está disponible.",
    "Folgeanfragen sind bei KI-Antworten deaktiviert, damit AP3K keine Antwort erzeugt und verbirgt. Deine gespeicherte Ersatzantwort wird nur genutzt, wenn der Anbieter nicht verfügbar ist.",
    "Os pedidos para seguir estão desativados nas respostas de IA para que o AP3K nunca gere e oculte uma resposta. A alternativa guardada só é usada se o fornecedor estiver indisponível."
  ],
  [
    "Rule logic summary", "Résumé de la logique des règles",
    "Resumen de la lógica de reglas",
    "Zusammenfassung der Regellogik",
    "Resumo da lógica das regras"
  ],
  [
    "When someone mentions you in a story, AP3K sends them a DM.", "Lorsqu’une personne vous mentionne dans une story, AP3K lui envoie un DM.",
    "Cuando alguien te menciona en una historia, AP3K le envía un mensaje directo.",
    "Wenn dich jemand in einer Story erwähnt, sendet AP3K der Person eine DM.",
    "Quando alguém o menciona numa história, o AP3K envia-lhe uma mensagem direta."
  ],
  [
    "When someone reacts to your story, AP3K sends them a DM.", "Lorsqu’une personne réagit à votre story, AP3K lui envoie un DM.",
    "Cuando alguien reacciona a tu historia, AP3K le envía un mensaje directo.",
    "Wenn jemand auf deine Story reagiert, sendet AP3K der Person eine DM.",
    "Quando alguém reage à sua história, o AP3K envia-lhe uma mensagem direta."
  ],
  [
    "When someone replies to your story, AP3K sends them a DM.", "Lorsqu’une personne répond à votre story, AP3K lui envoie un DM.",
    "Cuando alguien responde a tu historia, AP3K le envía un mensaje directo.",
    "Wenn jemand auf deine Story antwortet, sendet AP3K der Person eine DM.",
    "Quando alguém responde à sua história, o AP3K envia-lhe uma mensagem direta."
  ],
  [
    "When someone sends you a DM, AP3K sends them a DM.", "Lorsqu’une personne vous envoie un DM, AP3K lui répond par DM.",
    "Cuando alguien te envía un mensaje directo, AP3K le envía uno.",
    "Wenn dir jemand eine DM sendet, antwortet AP3K der Person per DM.",
    "Quando alguém lhe envia uma mensagem direta, o AP3K responde-lhe por mensagem direta."
  ],
  [
    "When someone sends a DM containing {keywords}, AP3K sends them a DM.", "Lorsqu’une personne envoie un DM contenant {keywords}, AP3K lui répond par DM.",
    "Cuando alguien envía un mensaje directo que contiene {keywords}, AP3K le responde por mensaje directo.",
    "Wenn jemand eine DM mit {keywords} sendet, antwortet AP3K der Person per DM.",
    "Quando alguém envia uma mensagem direta que contém {keywords}, o AP3K responde-lhe por mensagem direta."
  ],
  [
    "your keyword", "votre mot-clé",
    "tu palabra clave",
    "dein Schlüsselwort",
    "a sua palavra-chave"
  ],
  [
    "Instagram Stories", "Stories Instagram",
    "Historias de Instagram",
    "Instagram-Stories",
    "Histórias do Instagram"
  ],
  [
    "Instagram DMs", "DM Instagram",
    "Mensajes directos de Instagram",
    "Instagram-DMs",
    "Mensagens diretas do Instagram"
  ],
  [
    "mentioned you in their story", "vous a mentionné dans sa story",
    "te mencionó en su historia",
    "hat dich in einer Story erwähnt",
    "mencionou-o na sua história"
  ],
  [
    "reacted 🔥 to your story", "a réagi 🔥 à votre story",
    "reaccionó con 🔥 a tu historia",
    "hat mit 🔥 auf deine Story reagiert",
    "reagiu com 🔥 à sua história"
  ],
  [
    "replied to your story", "a répondu à votre story",
    "respondió a tu historia",
    "hat auf deine Story geantwortet",
    "respondeu à sua história"
  ],
  [
    "sent you a message", "vous a envoyé un message",
    "te envió un mensaje",
    "hat dir eine Nachricht gesendet",
    "enviou-lhe uma mensagem"
  ],
  [
    "Sent “{keyword}”", "A envoyé « {keyword} »",
    "Envió «{keyword}»",
    "Hat „{keyword}“ gesendet",
    "Enviou «{keyword}»"
  ],
  [
    "Story interaction", "Interaction avec une story",
    "Interacción con historia",
    "Story-Interaktion",
    "Interação com história"
  ],
  [
    "AP3K listens through the official Instagram webhook.", "AP3K reçoit les événements via le webhook officiel d’Instagram.",
    "AP3K detecta eventos mediante el webhook oficial de Instagram.",
    "AP3K empfängt Ereignisse über den offiziellen Instagram-Webhook.",
    "O AP3K recebe eventos através do webhook oficial do Instagram."
  ],
  [
    "Your response message", "Votre message de réponse",
    "Tu mensaje de respuesta",
    "Deine Antwortnachricht",
    "A sua mensagem de resposta"
  ],
  [
    "Your opening DM", "Votre DM d’ouverture",
    "Tu mensaje directo inicial",
    "Deine erste DM",
    "A sua mensagem direta inicial"
  ],
  [
    "Your final message", "Votre message final",
    "Tu mensaje final",
    "Deine finale Nachricht",
    "A sua mensagem final"
  ],
  [
    "Follow this account to receive the link.", "Abonnez-vous à ce compte pour recevoir le lien.",
    "Sigue esta cuenta para recibir el enlace.",
    "Folge diesem Konto, um den Link zu erhalten.",
    "Siga esta conta para receber a ligação."
  ],
  [
    "Add a comment for {handle}…", "Ajoutez un commentaire pour {handle}…",
    "Añade un comentario para {handle}…",
    "Kommentar für {handle} hinzufügen…",
    "Adicione um comentário para {handle}…"
  ],
  [
    "Now", "Maintenant",
    "Ahora",
    "Jetzt",
    "Agora"
  ],
  [
    "This looks amazing!", "C’est superbe !",
    "¡Se ve increíble!",
    "Das sieht toll aus!",
    "Isto está fantástico!"
  ],
  [
    "guide", "guide",
    "guía",
    "Leitfaden",
    "guia"
  ],
  [
    "Love this! Thanks for joining the conversation ✨", "J’adore ! Merci de participer à la conversation ✨",
    "¡Me encanta! Gracias por participar en la conversación ✨",
    "Wie schön! Danke, dass du dich am Gespräch beteiligst ✨",
    "Adoro! Obrigado por participar na conversa ✨"
  ],
  [
    "Thank you for your comment. We appreciate your interest.", "Merci pour votre commentaire. Nous apprécions votre intérêt.",
    "Gracias por tu comentario. Agradecemos tu interés.",
    "Vielen Dank für deinen Kommentar. Wir freuen uns über dein Interesse.",
    "Obrigado pelo seu comentário. Agradecemos o seu interesse."
  ],
  [
    "Thanks for your comment! Happy to help 😊", "Merci pour votre commentaire ! Avec plaisir 😊",
    "¡Gracias por tu comentario! Encantados de ayudar 😊",
    "Danke für deinen Kommentar! Wir helfen gerne 😊",
    "Obrigado pelo seu comentário! Temos todo o gosto em ajudar 😊"
  ],
  [
    "Thanks! Please see DMs.", "Merci ! Consultez vos DM.",
    "¡Gracias! Revisa tus mensajes directos.",
    "Danke! Schau in deine DMs.",
    "Obrigado! Veja as suas mensagens diretas."
  ],
  [
    "Direct message is off", "Message privé désactivé",
    "Mensaje directo desactivado",
    "Direktnachricht deaktiviert",
    "Mensagem direta desativada"
  ],
  [
    "Enable “Send a DM” to preview the private conversation.", "Activez « Envoyer un DM » pour voir l’aperçu de la conversation privée.",
    "Activa «Enviar un mensaje directo» para ver la conversación privada.",
    "Aktiviere „DM senden“, um die private Unterhaltung anzusehen.",
    "Ative «Enviar uma mensagem direta» para pré-visualizar a conversa privada."
  ],
  [
    "Selected Instagram post", "Publication Instagram sélectionnée",
    "Publicación de Instagram seleccionada",
    "Ausgewählter Instagram-Beitrag",
    "Publicação do Instagram selecionada"
  ],
  [
    "Profile picture of {name}", "Photo de profil de {name}",
    "Foto de perfil de {name}",
    "Profilbild von {name}",
    "Foto de perfil de {name}"
  ],
  [
    "Instagram live preview", "Aperçu Instagram en direct",
    "Vista previa en directo de Instagram",
    "Instagram-Live-Vorschau",
    "Pré-visualização do Instagram em direto"
  ],
  [
    "Instagram preview", "Aperçu Instagram",
    "Vista previa de Instagram",
    "Instagram-Vorschau",
    "Pré-visualização do Instagram"
  ],
  [
    "Instagram automation preview", "Aperçu de l’automatisation Instagram",
    "Vista previa de automatización de Instagram",
    "Vorschau der Instagram-Automatisierung",
    "Pré-visualização da automatização do Instagram"
  ],
  [
    "Close preview", "Fermer l’aperçu",
    "Cerrar vista previa",
    "Vorschau schließen",
    "Fechar pré-visualização"
  ],
  [
    "AI comment", "Commentaire IA",
    "Comentario de IA",
    "KI-Kommentar",
    "Comentário de IA"
  ],
  [
    "AI reply", "Réponse IA",
    "Respuesta de IA",
    "KI-Antwort",
    "Resposta de IA"
  ],
  [
    "AI replies to safe comments in your voice. This replaces saved variations for this automation.", "L’IA répond aux commentaires sûrs avec votre ton, à la place des variantes enregistrées de cette automatisation.",
    "La IA responde a comentarios seguros con tu estilo, sustituyendo las variantes guardadas de esta automatización.",
    "Die KI antwortet in deinem Stil auf sichere Kommentare und ersetzt die gespeicherten Varianten dieser Automatisierung.",
    "A IA responde a comentários seguros no seu estilo, substituindo as variantes guardadas desta automatização."
  ],
  [
    "Your Free plan includes saved replies. {upgrade} for AP3K AI.", "Votre formule gratuite inclut les réponses enregistrées. {upgrade} pour utiliser AP3K AI.",
    "Tu plan gratuito incluye respuestas guardadas. {upgrade} para usar AP3K AI.",
    "Dein kostenloser Tarif enthält gespeicherte Antworten. {upgrade}, um AP3K AI zu nutzen.",
    "O seu plano gratuito inclui respostas guardadas. {upgrade} para usar o AP3K AI."
  ],
  [
    "Enable the AI Comments master switch in {settings} before using it here.", "Activez l’option principale des commentaires IA dans {settings} avant de l’utiliser ici.",
    "Activa el interruptor principal de comentarios de IA en {settings} antes de usarlo aquí.",
    "Aktiviere zuerst den Hauptschalter für KI-Kommentare in {settings}, bevor du sie hier nutzt.",
    "Ative o interruptor principal dos comentários de IA em {settings} antes de os usar aqui."
  ],
  [
    "AP3K AI is unavailable right now.", "AP3K AI est indisponible pour le moment.",
    "AP3K AI no está disponible ahora.",
    "AP3K AI ist derzeit nicht verfügbar.",
    "O AP3K AI está indisponível neste momento."
  ],
  [
    "Uses AP3K AI settings", "Utilise les paramètres d’AP3K AI",
    "Usa la configuración de AP3K AI",
    "Nutzt die Einstellungen von AP3K AI",
    "Usa as definições do AP3K AI"
  ],
  [
    "Tone, knowledge, brand voice, guardrails, and comment protection are managed once in AP3K AI.", "Le ton, les connaissances, la voix de marque, les garde-fous et la protection des commentaires sont gérés dans AP3K AI.",
    "El tono, los conocimientos, la voz de marca, los límites y la protección de comentarios se gestionan en AP3K AI.",
    "Ton, Wissen, Markenstimme, Schutzregeln und Kommentarschutz werden zentral in AP3K AI verwaltet.",
    "O tom, o conhecimento, a voz da marca, os limites e a proteção de comentários são geridos no AP3K AI."
  ],
  [
    "Open AP3K AI", "Ouvrir AP3K AI",
    "Abrir AP3K AI",
    "AP3K AI öffnen",
    "Abrir AP3K AI"
  ],
  [
    "Automation focus", "Priorité de l’automatisation",
    "Enfoque de la automatización",
    "Schwerpunkt der Automatisierung",
    "Foco da automatização"
  ],
  [
    "(optional)", "(facultatif)",
    "(opcional)",
    "(optional)",
    "(opcional)"
  ],
  [
    "Example: Focus on this product launch. Mention the launch date only when asked.", "Exemple : concentrez-vous sur ce lancement de produit. Mentionnez la date uniquement sur demande.",
    "Ejemplo: céntrate en este lanzamiento. Menciona la fecha solo si te la preguntan.",
    "Beispiel: Konzentriere dich auf diese Produkteinführung. Nenne das Datum nur auf Nachfrage.",
    "Exemplo: concentre-se neste lançamento. Mencione a data apenas quando perguntarem."
  ],
  [
    "AP3K Support Assistant", "Assistant d’assistance AP3K",
    "Asistente de soporte de AP3K",
    "AP3K-Supportassistent",
    "Assistente de suporte do AP3K"
  ],
  [
    "Ask AP3K Support Assistant", "Demander à l’assistant AP3K",
    "Pregunta al asistente de AP3K",
    "AP3K-Supportassistenten fragen",
    "Pergunte ao assistente do AP3K"
  ],
  [
    "Answers based on AP3K", "Réponses fondées sur AP3K",
    "Respuestas basadas en AP3K",
    "Antworten auf Grundlage von AP3K",
    "Respostas baseadas no AP3K"
  ],
  [
    "Guides for every AP3K feature", "Guides pour chaque fonctionnalité AP3K",
    "Guías de todas las funciones de AP3K",
    "Anleitungen zu allen AP3K-Funktionen",
    "Guias para todas as funcionalidades do AP3K"
  ],
  [
    "Fix Instagram permissions", "Corriger les autorisations Instagram",
    "Corregir permisos de Instagram",
    "Instagram-Berechtigungen korrigieren",
    "Corrigir permissões do Instagram"
  ],
  [
    "Reconnect your professional account", "Reconnectez votre compte professionnel",
    "Vuelve a conectar tu cuenta profesional",
    "Verbinde dein professionelles Konto erneut",
    "Volte a ligar a sua conta profissional"
  ],
  [
    "Contact support@ap3k.com", "Contactez support@ap3k.com",
    "Contacta con support@ap3k.com",
    "Kontaktiere support@ap3k.com",
    "Contacte support@ap3k.com"
  ],
  [
    "Close support", "Fermer l’assistance",
    "Cerrar soporte",
    "Support schließen",
    "Fechar suporte"
  ],
  [
    "Close support assistant", "Fermer l’assistant d’assistance",
    "Cerrar asistente de soporte",
    "Supportassistenten schließen",
    "Fechar assistente de suporte"
  ],
  [
    "Hi! Ask me how to connect Instagram, build an automation, use AP3K AI, manage billing, or troubleshoot your workspace.", "Bonjour ! Demandez-moi comment connecter Instagram, créer une automatisation, utiliser AP3K AI, gérer la facturation ou résoudre un problème.",
    "¡Hola! Pregúntame cómo conectar Instagram, crear una automatización, usar AP3K AI, gestionar la facturación o resolver problemas de tu espacio de trabajo.",
    "Hallo! Frag mich, wie du Instagram verbindest, eine Automatisierung erstellst, AP3K AI nutzt, die Abrechnung verwaltest oder Probleme im Arbeitsbereich löst.",
    "Olá! Pergunte-me como ligar o Instagram, criar uma automatização, usar o AP3K AI, gerir a faturação ou resolver problemas do seu espaço de trabalho."
  ],
  [
    "Support Assistant · AI agent", "Assistant d’assistance · Agent IA",
    "Asistente de soporte · Agente de IA",
    "Supportassistent · KI-Agent",
    "Assistente de suporte · Agente de IA"
  ],
  [
    "AI can make mistakes. Never share secrets.", "L’IA peut se tromper. Ne partagez jamais de secrets.",
    "La IA puede cometer errores. No compartas secretos.",
    "KI kann Fehler machen. Teile niemals Geheimnisse.",
    "A IA pode cometer erros. Nunca partilhe segredos."
  ],
  [
    "Start over", "Recommencer",
    "Empezar de nuevo",
    "Neu beginnen",
    "Recomeçar"
  ],
  [
    "Could not load support history. Please try again.", "Impossible de charger l’historique. Veuillez réessayer.",
    "No se pudo cargar el historial. Inténtalo de nuevo.",
    "Der Supportverlauf konnte nicht geladen werden. Versuche es erneut.",
    "Não foi possível carregar o histórico. Tente novamente."
  ],
  [
    "Could not send your question. Please try again.", "Impossible d’envoyer votre question. Veuillez réessayer.",
    "No se pudo enviar tu pregunta. Inténtalo de nuevo.",
    "Deine Frage konnte nicht gesendet werden. Versuche es erneut.",
    "Não foi possível enviar a sua pergunta. Tente novamente."
  ],
  [
    "Could not clear support history. Please try again.", "Impossible d’effacer l’historique. Veuillez réessayer.",
    "No se pudo borrar el historial. Inténtalo de nuevo.",
    "Der Supportverlauf konnte nicht gelöscht werden. Versuche es erneut.",
    "Não foi possível limpar o histórico. Tente novamente."
  ],
  [
    "Could not save automation.", "Impossible d’enregistrer l’automatisation.",
    "No se pudo guardar la automatización.",
    "Die Automatisierung konnte nicht gespeichert werden.",
    "Não foi possível guardar a automatização."
  ],
  [
    "Close all posts", "Fermer toutes les publications",
    "Cerrar todas las publicaciones",
    "Alle Beiträge schließen",
    "Fechar todas as publicações"
  ],
  [
    "Pick any post or Reel", "Choisissez une publication ou un Reel",
    "Elige cualquier publicación o Reel",
    "Wähle einen beliebigen Beitrag oder ein Reel",
    "Escolha qualquer publicação ou Reel"
  ],
  [
    "Select media from the connected Instagram account.", "Sélectionnez du contenu du compte Instagram connecté.",
    "Selecciona contenido de la cuenta de Instagram conectada.",
    "Wähle Medien aus dem verbundenen Instagram-Konto.",
    "Selecione conteúdo da conta do Instagram ligada."
  ],
  [
    "No posts found. Make sure your Instagram account is connected.", "Aucune publication trouvée. Vérifiez que votre compte Instagram est connecté.",
    "No se encontraron publicaciones. Comprueba que tu cuenta de Instagram esté conectada.",
    "Keine Beiträge gefunden. Prüfe, ob dein Instagram-Konto verbunden ist.",
    "Não foram encontradas publicações. Verifique se a sua conta do Instagram está ligada."
  ],
  [
    "No posts match your search.", "Aucune publication ne correspond à votre recherche.",
    "Ninguna publicación coincide con tu búsqueda.",
    "Keine Beiträge entsprechen deiner Suche.",
    "Nenhuma publicação corresponde à sua pesquisa."
  ],
  [
    "No media loaded yet. Click Refresh posts, reconnect Instagram, or use Any post.", "Aucun contenu chargé. Actualisez les publications, reconnectez Instagram ou choisissez Toute publication.",
    "Aún no hay contenido cargado. Actualiza las publicaciones, vuelve a conectar Instagram o elige Cualquier publicación.",
    "Noch keine Medien geladen. Aktualisiere die Beiträge, verbinde Instagram erneut oder wähle Beliebiger Beitrag.",
    "Ainda não foi carregado conteúdo. Atualize as publicações, volte a ligar o Instagram ou escolha Qualquer publicação."
  ],
  [
    "Connect Instagram first", "Connectez d’abord Instagram",
    "Conecta Instagram primero",
    "Verbinde zuerst Instagram",
    "Ligue primeiro o Instagram"
  ],
  [
    "AP3K needs an official Instagram connection before it can listen for comments.", "AP3K nécessite une connexion officielle à Instagram avant de détecter les commentaires.",
    "AP3K necesita una conexión oficial con Instagram para detectar comentarios.",
    "AP3K benötigt eine offizielle Instagram-Verbindung, um Kommentare zu erkennen.",
    "O AP3K precisa de uma ligação oficial ao Instagram para detetar comentários."
  ],
  [
    "DMs are disabled for this review mode. This mode tests comment replies and lead tracking.", "Les DM sont désactivés dans ce mode de vérification, qui teste les réponses aux commentaires et le suivi des prospects.",
    "Los mensajes directos están desactivados en este modo de revisión, que prueba respuestas a comentarios y seguimiento de clientes potenciales.",
    "DMs sind in diesem Prüfmodus deaktiviert. Er testet Kommentarantworten und Lead-Erfassung.",
    "As mensagens diretas estão desativadas neste modo de revisão, que testa respostas a comentários e acompanhamento de potenciais clientes."
  ],
  [
    "This automation listens for comments on the selected media.", "Cette automatisation détecte les commentaires sur le contenu sélectionné.",
    "Esta automatización detecta comentarios en el contenido seleccionado.",
    "Diese Automatisierung erkennt Kommentare zu den ausgewählten Medien.",
    "Esta automatização deteta comentários no conteúdo selecionado."
  ],
  [
    "Edit this automation to add a private response.", "Modifiez cette automatisation pour ajouter une réponse privée.",
    "Edita esta automatización para añadir una respuesta privada.",
    "Bearbeite diese Automatisierung, um eine private Antwort hinzuzufügen.",
    "Edite esta automatização para adicionar uma resposta privada."
  ],
  [
    "Your Instagram post caption appears here.", "La légende de votre publication Instagram apparaît ici.",
    "El texto de tu publicación de Instagram aparece aquí.",
    "Hier erscheint die Bildunterschrift deines Instagram-Beitrags.",
    "A legenda da sua publicação do Instagram aparece aqui."
  ],
  [
    "Your DM message", "Votre message privé",
    "Tu mensaje directo",
    "Deine Direktnachricht",
    "A sua mensagem direta"
  ],
  [
    "Instagram post", "Publication Instagram",
    "Publicación de Instagram",
    "Instagram-Beitrag",
    "Publicação do Instagram"
  ],
  [
    "Full signal, Wi-Fi connected, battery full", "Signal maximal, Wi-Fi connecté, batterie pleine",
    "Señal completa, wifi conectado, batería llena",
    "Volles Signal, WLAN verbunden, Akku voll",
    "Sinal completo, Wi-Fi ligado, bateria cheia"
  ],
  [
    "Follow", "S’abonner",
    "Seguir",
    "Folgen",
    "Seguir"
  ],
  [
    "Following", "Abonné",
    "Siguiendo",
    "Folge ich",
    "A seguir"
  ],
  [
    "Get the Link", "Obtenir le lien",
    "Obtener el enlace",
    "Link erhalten",
    "Obter a ligação"
  ],
  [
    "Follow request", "Demande d’abonnement",
    "Solicitud de seguimiento",
    "Folgeanfrage",
    "Pedido para seguir"
  ],
  [
    "DM with a link", "DM avec un lien",
    "Mensaje directo con enlace",
    "DM mit Link",
    "Mensagem direta com ligação"
  ],
  [
    "Link buttons", "Boutons de lien",
    "Botones de enlace",
    "Link-Schaltflächen",
    "Botões de ligação"
  ],
  [
    "Live after save", "Active après enregistrement",
    "Activa después de guardar",
    "Nach dem Speichern aktiv",
    "Ativa após guardar"
  ],
  [
    "Message", "Message",
    "Mensaje",
    "Nachricht",
    "Mensagem"
  ],
  [
    "Name", "Nom",
    "Nombre",
    "Name",
    "Nome"
  ],
  [
    "No account connected", "Aucun compte connecté",
    "Ninguna cuenta conectada",
    "Kein Konto verbunden",
    "Nenhuma conta ligada"
  ],
  [
    "Not selected", "Non sélectionné",
    "Sin seleccionar",
    "Nicht ausgewählt",
    "Não selecionado"
  ],
  [
    "On", "Activé",
    "Activado",
    "Ein",
    "Ativado"
  ],
  [
    "POST", "PUBLICATION",
    "PUBLICACIÓN",
    "BEITRAG",
    "PUBLICAÇÃO"
  ],
  [
    "youraccount", "votrecompte",
    "tucuenta",
    "deinkonto",
    "asuaconta"
  ],
  [
    "Only trigger when the comment contains one of your keywords.", "Déclencher uniquement si le commentaire contient l’un de vos mots-clés.",
    "Activar solo si el comentario contiene una de tus palabras clave.",
    "Nur auslösen, wenn der Kommentar eines deiner Schlüsselwörter enthält.",
    "Acionar apenas se o comentário contiver uma das suas palavras-chave."
  ],
  [
    "Trigger for every comment in the post scope. Best for small controlled launches.", "Déclencher pour chaque commentaire sur les publications ciblées. Idéal pour les petits lancements contrôlés.",
    "Activar con cada comentario en las publicaciones elegidas. Ideal para lanzamientos pequeños y controlados.",
    "Bei jedem Kommentar im gewählten Beitragsbereich auslösen. Geeignet für kleine, kontrollierte Aktionen.",
    "Acionar com cada comentário nas publicações escolhidas. Ideal para pequenos lançamentos controlados."
  ],
  [
    "Select post from {date}", "Sélectionner la publication du {date}",
    "Seleccionar publicación del {date}",
    "Beitrag vom {date} auswählen",
    "Selecionar publicação de {date}"
  ],
  [
    "REEL", "REEL",
    "REEL",
    "REEL",
    "REEL"
  ],
  [
    "CAROUSEL", "CARROUSEL",
    "CARRUSEL",
    "KARUSSELL",
    "CARROSSEL"
  ],
  [
    "Instagram post or Reel", "Publication ou Reel Instagram",
    "Publicación o Reel de Instagram",
    "Instagram-Beitrag oder Reel",
    "Publicação ou Reel do Instagram"
  ],
  [
    "Date unavailable", "Date indisponible",
    "Fecha no disponible",
    "Datum nicht verfügbar",
    "Data indisponível"
  ],
  [
    "Sent you a message! Check it out!", "Je vous ai envoyé un message ! Consultez-le !",
    "¡Te envié un mensaje! ¡Revísalo!",
    "Ich habe dir eine Nachricht geschickt! Schau nach!",
    "Enviei-lhe uma mensagem! Veja-a!"
  ],
  [
    "Nice! Check your DMs!", "Super ! Consultez vos DM !",
    "¡Genial! ¡Revisa tus mensajes directos!",
    "Super! Schau in deine DMs!",
    "Ótimo! Veja as suas mensagens diretas!"
  ],
  [
    "Here's the link I promised! 🎁", "Voici le lien promis ! 🎁",
    "¡Aquí tienes el enlace que te prometí! 🎁",
    "Hier ist der versprochene Link! 🎁",
    "Aqui está a ligação que prometi! 🎁"
  ],
  [
    "Thanks for reaching out! Here's what you asked for ✨", "Merci de nous avoir contactés ! Voici ce que vous avez demandé ✨",
    "¡Gracias por escribir! Aquí tienes lo que pediste ✨",
    "Danke für deine Nachricht! Hier ist, was du angefragt hast ✨",
    "Obrigado pelo contacto! Aqui está o que pediu ✨"
  ],
  [
    "Hey there! I’m so happy you’re here, thanks so much for your interest 😊 Click below and I’ll send you the link in just a sec ✨", "Bonjour ! Ravi de vous voir ici, merci pour votre intérêt 😊 Cliquez ci-dessous et je vous envoie le lien dans un instant ✨",
    "¡Hola! Me alegra verte aquí, gracias por tu interés 😊 Pulsa abajo y te enviaré el enlace enseguida ✨",
    "Hallo! Schön, dass du da bist. Danke für dein Interesse 😊 Klicke unten und ich sende dir gleich den Link ✨",
    "Olá! Fico muito feliz por estar aqui, obrigado pelo interesse 😊 Toque abaixo e envio-lhe a ligação num instante ✨"
  ],
  [
    "Nearly there! The link is especially for my followers ✨ Right after you follow me, I’ll send you the link so you can dive straight in! 🎉", "Vous y êtes presque ! Ce lien est réservé à mes abonnés ✨ Abonnez-vous et je vous l’enverrai pour commencer tout de suite ! 🎉",
    "¡Ya casi está! El enlace es para mis seguidores ✨ En cuanto me sigas, te lo enviaré para que empieces enseguida. 🎉",
    "Fast geschafft! Der Link ist für meine Follower ✨ Sobald du mir folgst, sende ich dir den Link, damit du direkt loslegen kannst! 🎉",
    "Está quase! A ligação é especial para os meus seguidores ✨ Assim que me seguir, envio-lhe a ligação para começar logo! 🎉"
  ],
  [
    "Send me the link", "Envoyez-moi le lien",
    "Envíame el enlace",
    "Sende mir den Link",
    "Envie-me a ligação"
  ],
  [
    "Please complete all required steps before activating.", "Veuillez compléter toutes les étapes requises avant d’activer.",
    "Completa todos los pasos obligatorios antes de activar.",
    "Schließe vor der Aktivierung alle erforderlichen Schritte ab.",
    "Conclua todos os passos obrigatórios antes de ativar."
  ],
  [
    "Add at least one keyword or switch the trigger to Any comment.", "Ajoutez au moins un mot-clé ou choisissez « Tout commentaire ».",
    "Añade al menos una palabra clave o elige «Cualquier comentario».",
    "Füge mindestens ein Schlüsselwort hinzu oder wähle „Jeder Kommentar“.",
    "Adicione pelo menos uma palavra-chave ou escolha «Qualquer comentário»."
  ],
  [
    "Choose a comment reply or DM before activating this automation.", "Choisissez une réponse au commentaire ou un DM avant d’activer cette automatisation.",
    "Elige responder al comentario o enviar un mensaje directo antes de activar esta automatización.",
    "Wähle vor der Aktivierung eine Kommentarantwort oder DM.",
    "Escolha uma resposta ao comentário ou uma mensagem direta antes de ativar esta automatização."
  ],
  [
    "Complete every link label and add a valid destination URL.", "Renseignez chaque libellé de lien et ajoutez une URL de destination valide.",
    "Completa cada etiqueta de enlace y añade una URL de destino válida.",
    "Vervollständige jede Link-Beschriftung und füge eine gültige Ziel-URL hinzu.",
    "Preencha todas as etiquetas e adicione um URL de destino válido."
  ],
  [
    "Add the follow request message and verification button.", "Ajoutez le message de demande d’abonnement et le bouton de vérification.",
    "Añade el mensaje de solicitud de seguimiento y el botón de verificación.",
    "Füge die Folgeanfrage und die Bestätigungsschaltfläche hinzu.",
    "Adicione a mensagem de pedido para seguir e o botão de verificação."
  ],
  [
    "Could not save automation. Please try again.", "Impossible d’enregistrer l’automatisation. Veuillez réessayer.",
    "No se pudo guardar la automatización. Inténtalo de nuevo.",
    "Die Automatisierung konnte nicht gespeichert werden. Versuche es erneut.",
    "Não foi possível guardar a automatização. Tente novamente."
  ],
  [
    "Specific post mode only reacts to comments on that selected post or Reel.", "Le mode de publication spécifique ne réagit qu’aux commentaires sur la publication ou le Reel sélectionné.",
    "El modo de publicación específica solo reacciona a comentarios en esa publicación o Reel.",
    "Der Modus für bestimmte Beiträge reagiert nur auf Kommentare zum ausgewählten Beitrag oder Reel.",
    "O modo de publicação específica só reage a comentários nessa publicação ou Reel."
  ],
  [
    "Posts could not be refreshed. Use Any post or reconnect Instagram, then refresh again.", "Impossible d’actualiser les publications. Choisissez « Toute publication » ou reconnectez Instagram, puis actualisez.",
    "No se pudieron actualizar las publicaciones. Elige «Cualquier publicación» o vuelve a conectar Instagram y actualiza de nuevo.",
    "Beiträge konnten nicht aktualisiert werden. Wähle „Beliebiger Beitrag“ oder verbinde Instagram erneut und aktualisiere dann.",
    "Não foi possível atualizar as publicações. Escolha «Qualquer publicação» ou volte a ligar o Instagram e atualize novamente."
  ],
  [
    "DMs are disabled in this comment-reply review mode.", "Les DM sont désactivés dans ce mode de vérification des réponses aux commentaires.",
    "Los mensajes directos están desactivados en este modo de revisión de respuestas a comentarios.",
    "DMs sind in diesem Prüfmodus für Kommentarantworten deaktiviert.",
    "As mensagens diretas estão desativadas neste modo de revisão de respostas a comentários."
  ],
  [
    "Instagram DM access may still be pending for this account. Test with a real comment before recording.", "L’accès aux DM Instagram peut encore être en attente pour ce compte. Testez avec un vrai commentaire avant d’enregistrer.",
    "El acceso a mensajes directos de Instagram puede estar pendiente en esta cuenta. Prueba con un comentario real antes de grabar.",
    "Der Instagram-DM-Zugriff für dieses Konto steht möglicherweise noch aus. Teste vor der Aufnahme mit einem echten Kommentar.",
    "O acesso a mensagens diretas do Instagram pode ainda estar pendente nesta conta. Teste com um comentário real antes de gravar."
  ],
  [
    "Write a question first.", "Écrivez d’abord une question.",
    "Escribe una pregunta primero.",
    "Schreibe zuerst eine Frage.",
    "Escreva primeiro uma pergunta."
  ],
  [
    "You have reached today's support-assistant limit. Email support@ap3k.com for more help.", "Vous avez atteint la limite quotidienne de l’assistant. Écrivez à support@ap3k.com pour obtenir de l’aide.",
    "Has alcanzado el límite diario del asistente. Escribe a support@ap3k.com para obtener más ayuda.",
    "Du hast das Tageslimit des Supportassistenten erreicht. Schreibe für weitere Hilfe an support@ap3k.com.",
    "Atingiu o limite diário do assistente. Envie um email para support@ap3k.com para obter mais ajuda."
  ],
  [
    "The support assistant is unavailable. Please use the Documentation or email support@ap3k.com.", "L’assistant est indisponible. Consultez la base de connaissances ou écrivez à support@ap3k.com.",
    "El asistente no está disponible. Consulta la base de conocimientos o escribe a support@ap3k.com.",
    "Der Supportassistent ist nicht verfügbar. Nutze die Wissensdatenbank oder schreibe an support@ap3k.com.",
    "O assistente está indisponível. Consulte a base de conhecimento ou envie um email para support@ap3k.com."
  ],
  [
    "Support is unavailable right now. Email support@ap3k.com.", "L’assistance est indisponible pour le moment. Écrivez à support@ap3k.com.",
    "El soporte no está disponible ahora. Escribe a support@ap3k.com.",
    "Der Support ist derzeit nicht verfügbar. Schreibe an support@ap3k.com.",
    "O suporte está indisponível neste momento. Envie um email para support@ap3k.com."
  ],
  [
    "Keyword: {word}", "Mot-clé : {word}",
    "Palabra clave: {word}",
    "Schlüsselwort: {word}",
    "Palavra-chave: {word}"
  ]
];

export const SETUP_COPY = Object.fromEntries(SUPPORTED_LOCALES.map((locale) => [locale, Object.fromEntries(SETUP_ROWS.map((row) => [row[0], row[LOCALE_SOURCE_COLUMN[locale]]]))])) as Record<Locale, Record<string, string>>;
