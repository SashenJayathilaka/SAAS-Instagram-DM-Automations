import { LOCALE_SOURCE_COLUMN, SUPPORTED_LOCALES, type Locale } from "./config";
export const REMAINING_ROWS = [
["Open Contacts to search people captured by AP3K. Use Last interacted on, Created on, Email and Phone filters.", "Ouvrez Contacts pour rechercher les personnes enregistrées par AP3K. Utilisez les filtres Dernière interaction, Date de création, E-mail et Téléphone.", "Abre Contactos para buscar personas registradas por AP3K. Usa los filtros Última interacción, Fecha de creación, Correo y Teléfono.", "Öffne Kontakte, um die von AP3K erfassten Personen zu suchen. Nutze die Filter Letzte Interaktion, Erstellt am, E-Mail und Telefon.", "Abra Contactos para pesquisar pessoas registadas pelo AP3K. Use os filtros Última interação, Data de criação, E-mail e Telefone."],
["Pro and Business can collect email and phone in supported automations and export filtered Contacts using Download CSV. Both fields update the same contact.", "Pro et Business permettent de recueillir l’e-mail et le téléphone dans les automatisations compatibles et d’exporter les contacts filtrés avec Télécharger CSV. Les deux champs mettent à jour le même contact.", "Pro y Business permiten recopilar correo y teléfono en automatizaciones compatibles y exportar los contactos filtrados con Descargar CSV. Ambos campos actualizan el mismo contacto.", "Pro und Business können E-Mail und Telefon in unterstützten Automatisierungen erfassen und gefilterte Kontakte über CSV herunterladen exportieren. Beide Felder aktualisieren denselben Kontakt.", "Pro e Business permitem recolher e-mail e telefone em automações compatíveis e exportar os contactos filtrados com Transferir CSV. Os dois campos atualizam o mesmo contacto."],
["After authorization, return to the dashboard. Open Manage account and check the connected username, Comments ready and DMs ready badges.", "Après autorisation, revenez au tableau de bord. Ouvrez Gérer le compte et vérifiez le nom connecté ainsi que les badges de disponibilité des commentaires et des DM.", "Tras autorizar, vuelve al panel. Abre Gestionar cuenta y comprueba el usuario conectado y los indicadores de comentarios y DM disponibles.", "Kehre nach der Autorisierung zum Dashboard zurück. Öffne Konto verwalten und prüfe den verbundenen Nutzernamen sowie die Bereitschaft für Kommentare und DMs.", "Após a autorização, volte ao painel. Abra Gerir conta e confirme o nome ligado e os indicadores de disponibilidade dos comentários e das DMs."],
["Choose AI in each eligible automation. Business knowledge and behavior customize its responses; no workspace master switch is required.", "Choisissez l’IA dans chaque automatisation éligible. Les connaissances et le comportement personnalisent ses réponses ; aucun interrupteur général n’est nécessaire.", "Elige IA en cada automatización compatible. Los conocimientos y el comportamiento personalizan sus respuestas; no hace falta un interruptor general.", "Wähle KI in jeder geeigneten Automatisierung. Wissen und Verhalten passen die Antworten an; ein zentraler Schalter ist nicht erforderlich.", "Escolha IA em cada automação compatível. O conhecimento e o comportamento personalizam as respostas; não é necessário um interruptor geral."],
["Refer friends and earn commissions", "Parrainez des amis et gagnez des commissions", "Invita a amigos y gana comisiones", "Freunde empfehlen und Provisionen verdienen", "Indique amigos e ganhe comissões"],
["Referral links offer 30% for up to 11 qualifying paid months. Personalized discount codes have separate plan and follower requirements; review the current program terms.", "Les liens de parrainage offrent 30 % pendant au maximum 11 mois payés éligibles. Les codes personnalisés ont des conditions distinctes de forfait et d’abonnés ; consultez les conditions actuelles.", "Los enlaces de referido ofrecen un 30 % durante un máximo de 11 meses pagados válidos. Los códigos personalizados tienen requisitos distintos de plan y seguidores; revisa las condiciones actuales.", "Empfehlungslinks bieten 30 % für bis zu 11 berechtigte bezahlte Monate. Personalisierte Rabattcodes haben eigene Tarif- und Follower-Anforderungen; prüfe die aktuellen Bedingungen.", "Os links de indicação oferecem 30% por até 11 meses pagos elegíveis. Os códigos personalizados têm requisitos próprios de plano e seguidores; consulte os termos atuais."],
  [
    "Intelligence center", "Centre d’intelligence artificielle",
    "Centro de inteligencia artificial",
    "KI-Zentrale",
    "Centro de inteligência artificial"
  ],
  [
    "Teach AI your business once, then use it safely in selected comment and DM automations.", "Présentez votre activité à l’IA, puis utilisez-la en toute sécurité dans les automatisations de commentaires et de DM de votre choix.",
    "Enseña a la IA sobre tu negocio y úsala de forma segura en las automatizaciones de comentarios y mensajes privados que elijas.",
    "Vermittle der KI Wissen über dein Unternehmen und nutze sie sicher in ausgewählten Kommentar- und DM-Automatisierungen.",
    "Ensine a IA sobre o seu negócio e utilize-a com segurança nas automações de comentários e mensagens privadas que escolher."
  ],
  [
    "AP3K AI is included with Pro and Business", "L’IA AP3K est incluse dans Pro et Business",
    "La IA de AP3K está incluida en Pro y Business",
    "AP3K KI ist in Pro und Business enthalten",
    "A IA do AP3K está incluída nos planos Pro e Business"
  ],
  [
    "View plans", "Voir les offres",
    "Ver planes",
    "Tarife ansehen",
    "Ver planos"
  ],
  [
    "AP3K AI sections", "Sections de l’IA AP3K",
    "Secciones de IA de AP3K",
    "Bereiche von AP3K KI",
    "Secções da IA do AP3K"
  ],
  [
    "Overview", "Vue d’ensemble",
    "Resumen",
    "Übersicht",
    "Visão geral"
  ],
  [
    "Knowledge", "Connaissances",
    "Conocimiento",
    "Wissen",
    "Conhecimento"
  ],
  [
    "Behavior", "Comportement",
    "Comportamiento",
    "Verhalten",
    "Comportamento"
  ],
  [
    "Playground", "Espace de test",
    "Zona de pruebas",
    "Testbereich",
    "Área de testes"
  ],
  [
    "Your AI readiness", "Préparation de votre IA",
    "Preparación de tu IA",
    "Bereitschaft deiner KI",
    "Preparação da sua IA"
  ],
  [
    "{count} of 3 essentials complete", "{count} éléments essentiels sur 3 terminés",
    "{count} de 3 requisitos completados",
    "{count} von 3 Grundlagen abgeschlossen",
    "{count} de 3 requisitos concluídos"
  ],
  [
    "Share business knowledge", "Ajouter les connaissances de votre entreprise",
    "Añadir información del negocio",
    "Unternehmenswissen hinzufügen",
    "Adicionar conhecimento do negócio"
  ],
  [
    "Add accurate products, services, policies, and FAQs.", "Ajoutez des informations exactes sur vos produits, services, politiques et questions fréquentes.",
    "Añade información precisa sobre productos, servicios, políticas y preguntas frecuentes.",
    "Ergänze genaue Angaben zu Produkten, Dienstleistungen, Richtlinien und häufigen Fragen.",
    "Adicione informações exatas sobre produtos, serviços, políticas e perguntas frequentes."
  ],
  [
    "Open knowledge", "Ouvrir les connaissances",
    "Abrir conocimiento",
    "Wissen öffnen",
    "Abrir conhecimento"
  ],
  [
    "Set voice and behavior", "Définir le style et le comportement",
    "Configurar estilo y comportamiento",
    "Stil und Verhalten festlegen",
    "Definir estilo e comportamento"
  ],
  [
    "Control tone, role, guardrails, and comment protection.", "Définissez le ton, le rôle, les garde-fous et la protection des commentaires.",
    "Controla el tono, el rol, las restricciones y la protección de comentarios.",
    "Lege Ton, Rolle, Leitplanken und Kommentarschutz fest.",
    "Controle o tom, o papel, as regras e a proteção de comentários."
  ],
  [
    "Open behavior", "Ouvrir le comportement",
    "Abrir comportamiento",
    "Verhalten öffnen",
    "Abrir comportamento"
  ],
  [
    "AI skills", "Capacités de l’IA",
    "Capacidades de IA",
    "KI-Fähigkeiten",
    "Capacidades da IA"
  ],
  [
    "AI replies to DMs using the knowledge you share.", "L’IA répond aux DM à partir des connaissances que vous partagez.",
    "La IA responde a los mensajes privados con la información que compartes.",
    "Die KI beantwortet DMs mithilfe des von dir bereitgestellten Wissens.",
    "A IA responde a mensagens privadas com o conhecimento que partilha."
  ],
  [
    "AI responds to safe, positive comments in your tone.", "L’IA répond aux commentaires sûrs et positifs avec votre ton.",
    "La IA responde a comentarios seguros y positivos con tu tono.",
    "Die KI beantwortet unbedenkliche, positive Kommentare in deinem Ton.",
    "A IA responde a comentários seguros e positivos no seu tom."
  ],
  [
    "These are workspace master switches. Each automation still chooses whether to use AI, so nothing turns on unexpectedly.", "Ces commandes s’appliquent à l’espace de travail. Chaque automatisation choisit ensuite d’utiliser l’IA : rien ne s’active par surprise.",
    "Estos controles son generales para el espacio de trabajo. Cada automatización decide si usa IA, por lo que nada se activa inesperadamente.",
    "Dies sind die Hauptschalter des Arbeitsbereichs. Jede Automatisierung legt zusätzlich fest, ob sie KI nutzt. So wird nichts unerwartet aktiviert.",
    "Estes são os controlos gerais do espaço de trabalho. Cada automação escolhe se utiliza IA, para que nada seja ativado inesperadamente."
  ],
  [
    "Share only facts you want AI to use. Short, focused notes produce clearer answers.", "Partagez uniquement les faits que l’IA doit utiliser. Des notes courtes et ciblées donnent des réponses plus claires.",
    "Comparte solo los datos que quieres que use la IA. Las notas breves y concretas producen respuestas más claras.",
    "Teile nur Fakten, die die KI verwenden soll. Kurze, gezielte Notizen ergeben klarere Antworten.",
    "Partilhe apenas os factos que pretende que a IA utilize. Notas breves e específicas produzem respostas mais claras."
  ],
  [
    "Topic", "Sujet",
    "Tema",
    "Thema",
    "Tópico"
  ],
  [
    "Pricing, delivery, course details…", "Tarifs, livraison, détails des formations…",
    "Precios, entregas, detalles de cursos…",
    "Preise, Lieferung, Kursdetails…",
    "Preços, entregas, detalhes dos cursos…"
  ],
  [
    "Facts AI may use", "Faits que l’IA peut utiliser",
    "Datos que puede usar la IA",
    "Fakten, die die KI nutzen darf",
    "Factos que a IA pode utilizar"
  ],
  [
    "Add exact, current information. Include what AP3K should say when details are unknown.", "Ajoutez des informations exactes et à jour. Précisez ce qu’AP3K doit répondre lorsque certains détails sont inconnus.",
    "Añade información exacta y actual. Indica qué debe responder AP3K cuando desconozca los detalles.",
    "Ergänze genaue, aktuelle Informationen. Gib an, was AP3K bei unbekannten Details sagen soll.",
    "Adicione informações exatas e atuais. Indique o que o AP3K deve dizer quando desconhecer os detalhes."
  ],
  [
    "No knowledge yet", "Aucune connaissance pour le moment",
    "Aún no hay información",
    "Noch kein Wissen hinterlegt",
    "Ainda não há conhecimento"
  ],
  [
    "Add your first reliable business note.", "Ajoutez votre première note fiable sur votre activité.",
    "Añade tu primera nota fiable sobre el negocio.",
    "Füge deine erste verlässliche Unternehmensnotiz hinzu.",
    "Adicione a primeira nota fiável sobre o seu negócio."
  ],
  [
    "One voice and safety policy is shared by every AI-enabled automation.", "Toutes les automatisations avec IA partagent le même style et la même politique de sécurité.",
    "Todas las automatizaciones con IA comparten el mismo estilo y la misma política de seguridad.",
    "Alle KI-Automatisierungen nutzen denselben Stil und dieselben Sicherheitsregeln.",
    "Todas as automações com IA partilham o mesmo estilo e a mesma política de segurança."
  ],
  [
    "AI role", "Rôle de l’IA",
    "Rol de la IA",
    "KI-Rolle",
    "Papel da IA"
  ],
  [
    "Brand voice & persona", "Style et personnalité de la marque",
    "Voz y personalidad de la marca",
    "Markenstimme und Persönlichkeit",
    "Voz e personalidade da marca"
  ],
  [
    "Default tone", "Ton par défaut",
    "Tono predeterminado",
    "Standardton",
    "Tom predefinido"
  ],
  [
    "Guardrails & escalation", "Garde-fous et transfert au support",
    "Restricciones y derivación a soporte",
    "Leitplanken und Eskalation",
    "Regras e encaminhamento para suporte"
  ],
  [
    "Insults & hate speech", "Insultes et propos haineux",
    "Insultos y discurso de odio",
    "Beleidigungen und Hassrede",
    "Insultos e discurso de ódio"
  ],
  [
    "Vulgar language, slurs, threats, or harassment", "Langage vulgaire, injures, menaces ou harcèlement",
    "Lenguaje vulgar, insultos, amenazas o acoso",
    "Vulgäre Sprache, Beschimpfungen, Drohungen oder Belästigung",
    "Linguagem vulgar, insultos, ameaças ou assédio"
  ],
  [
    "Critique & negative feedback", "Critiques et avis négatifs",
    "Críticas y opiniones negativas",
    "Kritik und negatives Feedback",
    "Críticas e opiniões negativas"
  ],
  [
    "Comments criticizing your content, product, or brand", "Commentaires critiquant votre contenu, produit ou marque",
    "Comentarios que critican tu contenido, producto o marca",
    "Kommentare, die deine Inhalte, Produkte oder Marke kritisieren",
    "Comentários que criticam o seu conteúdo, produto ou marca"
  ],
  [
    "Unanswerable questions", "Questions sans réponse disponible",
    "Preguntas sin respuesta disponible",
    "Nicht beantwortbare Fragen",
    "Perguntas sem resposta disponível"
  ],
  [
    "Questions the shared knowledge cannot answer", "Questions auxquelles les connaissances partagées ne permettent pas de répondre",
    "Preguntas que la información compartida no permite responder",
    "Fragen, die sich mit dem bereitgestellten Wissen nicht beantworten lassen",
    "Perguntas a que o conhecimento partilhado não permite responder"
  ],
  [
    "Begging & solicitation", "Demandes de dons et sollicitations",
    "Peticiones de dinero y donaciones",
    "Bettelei und Spendenanfragen",
    "Pedidos de dinheiro e donativos"
  ],
  [
    "Requests for money, gifts, free products, or donations", "Demandes d’argent, de cadeaux, de produits gratuits ou de dons",
    "Solicitudes de dinero, regalos, productos gratuitos o donaciones",
    "Anfragen nach Geld, Geschenken, kostenlosen Produkten oder Spenden",
    "Pedidos de dinheiro, presentes, produtos gratuitos ou donativos"
  ],
  [
    "Test your saved knowledge, voice, and guardrails in a persistent conversation.", "Testez vos connaissances, votre style et vos garde-fous dans une conversation enregistrée.",
    "Prueba la información guardada, el estilo y las restricciones en una conversación persistente.",
    "Teste gespeichertes Wissen, Stil und Leitplanken in einem gespeicherten Gespräch.",
    "Teste o conhecimento guardado, o estilo e as regras numa conversa guardada."
  ],
  [
    "Clear", "Effacer",
    "Borrar",
    "Leeren",
    "Limpar"
  ],
  [
    "Add at least one knowledge note for a meaningful test.", "Ajoutez au moins une note de connaissance pour un test pertinent.",
    "Añade al menos una nota para que la prueba sea útil.",
    "Füge mindestens eine Wissensnotiz für einen aussagekräftigen Test hinzu.",
    "Adicione pelo menos uma nota de conhecimento para um teste útil."
  ],
  [
    "Your conversation is saved. Tests count toward the monthly AI limit.", "Votre conversation est enregistrée. Les tests sont décomptés du quota mensuel d’IA.",
    "Tu conversación se guarda. Las pruebas cuentan para el límite mensual de IA.",
    "Dein Gespräch wird gespeichert. Tests zählen zum monatlichen KI-Limit.",
    "A conversa é guardada. Os testes contam para o limite mensal de IA."
  ],
  [
    "Save as business knowledge", "Enregistrer comme connaissance de l’entreprise",
    "Guardar como información del negocio",
    "Als Unternehmenswissen speichern",
    "Guardar como conhecimento do negócio"
  ],
  [
    "Ask a customer question…", "Posez une question de client…",
    "Haz una pregunta como cliente…",
    "Stelle eine Kundenfrage…",
    "Faça uma pergunta como cliente…"
  ],
  [
    "Chats are private to this workspace. Only facts you explicitly save are added to Knowledge.", "Les conversations restent privées dans cet espace de travail. Seuls les faits que vous enregistrez explicitement sont ajoutés aux connaissances.",
    "Los chats son privados para este espacio de trabajo. Solo se añade al conocimiento la información que guardas expresamente.",
    "Chats sind nur in diesem Arbeitsbereich verfügbar. Nur ausdrücklich gespeicherte Fakten werden zum Wissen hinzugefügt.",
    "As conversas são privadas neste espaço de trabalho. Apenas os factos que guardar explicitamente são adicionados ao conhecimento."
  ],
  [
    "Automate Instagram DMs Without Complicated Flows", "Automatisez vos DM Instagram sans scénarios complexes",
    "Automatiza los mensajes privados de Instagram sin flujos complicados",
    "Instagram-DMs automatisieren – ohne komplizierte Abläufe",
    "Automatize mensagens privadas do Instagram sem fluxos complicados"
  ],
  [
    "Send useful, timely Instagram DMs after comments, story interactions, or incoming messages—and see every delivery in one clear workspace.", "Envoyez des DM Instagram utiles au bon moment après un commentaire, une interaction avec une story ou un message reçu, et suivez chaque envoi dans un espace clair.",
    "Envía mensajes privados útiles en el momento adecuado tras comentarios, interacciones con historias o mensajes recibidos, y sigue cada envío en un mismo espacio.",
    "Sende passende Instagram-DMs nach Kommentaren, Story-Interaktionen oder eingehenden Nachrichten und verfolge jeden Versand in einem übersichtlichen Arbeitsbereich.",
    "Envie mensagens privadas úteis no momento certo após comentários, interações com histórias ou mensagens recebidas e acompanhe cada envio num espaço organizado."
  ],
  [
    "Reply to Instagram Comments While Interest Is Fresh", "Répondez aux commentaires Instagram au bon moment",
    "Responde a los comentarios de Instagram mientras el interés sigue vivo",
    "Instagram-Kommentare beantworten, solange das Interesse da ist",
    "Responda a comentários do Instagram enquanto o interesse está vivo"
  ],
  [
    "Match a keyword or any eligible new comment, publish a natural public reply, and optionally continue the conversation in DM.", "Détectez un mot-clé ou tout nouveau commentaire éligible, publiez une réponse naturelle et poursuivez si besoin la conversation en message privé.",
    "Detecta una palabra clave o cualquier comentario nuevo válido, publica una respuesta natural y continúa la conversación por mensaje privado si lo deseas.",
    "Erkenne ein Schlüsselwort oder jeden neuen berechtigten Kommentar, veröffentliche eine natürliche Antwort und setze das Gespräch bei Bedarf per DM fort.",
    "Detete uma palavra-chave ou qualquer novo comentário elegível, publique uma resposta natural e, se desejar, continue a conversa por mensagem privada."
  ],
  [
    "Turn an Instagram Comment Into a Delivered DM", "Transformez un commentaire Instagram en message privé automatique",
    "Convierte un comentario de Instagram en un mensaje privado automático",
    "Aus Instagram-Kommentaren automatisch Direktnachrichten machen",
    "Transforme um comentário do Instagram numa mensagem privada automática"
  ],
  [
    "Connect a clear post call-to-action to a private follow-up: detect the comment, acknowledge it if useful, and send the promised message or link.", "Reliez un appel à l’action clair dans votre publication à un suivi privé : détectez le commentaire, répondez si nécessaire et envoyez le message ou le lien promis.",
    "Conecta una llamada a la acción clara con un seguimiento privado: detecta el comentario, responde si hace falta y envía el mensaje o enlace prometido.",
    "Verknüpfe eine klare Handlungsaufforderung im Beitrag mit einer privaten Nachfassnachricht: Erkenne den Kommentar, bestätige ihn bei Bedarf und sende die versprochene Nachricht oder den Link.",
    "Ligue uma chamada à ação clara na publicação a um seguimento privado: detete o comentário, responda se necessário e envie a mensagem ou ligação prometida."
  ],
  [
    "Comment-to-DM automation", "Automatisation des commentaires vers les messages privés",
    "Automatización de comentarios a mensajes privados",
    "Automatisch vom Kommentar zur Direktnachricht",
    "Automação de comentários para mensagens privadas"
  ],
  [
    "Create Instagram Auto Replies That Stay Clear and Human", "Créez des réponses automatiques Instagram claires et naturelles",
    "Crea respuestas automáticas de Instagram claras y naturales",
    "Klare, natürliche automatische Antworten auf Instagram erstellen",
    "Crie respostas automáticas claras e naturais no Instagram"
  ],
  [
    "Respond to the right comments and DMs with saved messages or paid AI—while keeping triggers, tone, and delivery limits under your control.", "Répondez aux commentaires et DM pertinents avec des messages enregistrés ou l’IA des offres payantes, tout en gardant le contrôle des déclencheurs, du ton et des limites d’envoi.",
    "Responde a los comentarios y mensajes adecuados con respuestas guardadas o IA de pago, manteniendo el control de activadores, tono y límites de envío.",
    "Beantworte passende Kommentare und DMs mit gespeicherten Nachrichten oder kostenpflichtiger KI. Auslöser, Ton und Versandlimits bleiben unter deiner Kontrolle.",
    "Responda aos comentários e mensagens adequados com respostas guardadas ou IA dos planos pagos, mantendo o controlo dos acionadores, do tom e dos limites de envio."
  ],
  [
    "Continue Instagram Story Interest in the DMs", "Prolongez l’intérêt pour vos stories Instagram en message privé",
    "Continúa por mensaje privado el interés generado por tus historias",
    "Interesse an Instagram-Stories per DM weiterführen",
    "Continue por mensagem privada o interesse gerado pelas histórias"
  ],
  [
    "Turn eligible story interactions into organized DM follow-up for launches, resources, registrations, and product interest.", "Transformez les interactions éligibles avec vos stories en suivi organisé par DM pour vos lancements, ressources, inscriptions et produits.",
    "Convierte las interacciones válidas con historias en un seguimiento organizado por mensaje privado para lanzamientos, recursos, registros y productos.",
    "Verwandle berechtigte Story-Interaktionen in geordnete DM-Nachfassaktionen für Launches, Ressourcen, Anmeldungen und Produktinteresse.",
    "Transforme interações elegíveis com histórias num seguimento organizado por mensagem privada para lançamentos, recursos, inscrições e produtos."
  ],
  [
    "A Simpler Instagram Automation Alternative", "Une alternative plus simple pour automatiser Instagram",
    "Una alternativa más sencilla para automatizar Instagram",
    "Eine einfachere Alternative für Instagram-Automatisierung",
    "Uma alternativa mais simples para automatizar o Instagram"
  ],
  [
    "AP3K is built for teams that want focused Instagram comment, story, and DM automation without learning a broad multi-channel flow builder.", "AP3K s’adresse aux équipes qui veulent automatiser les commentaires, stories et DM Instagram sans apprendre à utiliser un outil complexe de scénarios multicanaux.",
    "AP3K está pensado para equipos que quieren automatizar comentarios, historias y mensajes privados de Instagram sin aprender a usar un amplio constructor de flujos multicanal.",
    "AP3K ist für Teams gedacht, die Instagram-Kommentare, Stories und DMs gezielt automatisieren möchten, ohne einen umfangreichen kanalübergreifenden Flow-Builder zu erlernen.",
    "O AP3K foi criado para equipas que querem automatizar comentários, histórias e mensagens privadas do Instagram sem aprender a utilizar um amplo construtor de fluxos multicanal."
  ],
  [
    "Focused ManyChat alternative", "Une alternative ciblée à ManyChat",
    "Una alternativa especializada a ManyChat",
    "Eine spezialisierte Alternative zu ManyChat",
    "Uma alternativa especializada ao ManyChat"
  ],
  [
    "Turn Creator Engagement Into Follow-Up That Scales", "Transformez l’engagement de votre communauté en suivi à grande échelle",
    "Convierte la interacción de tu audiencia en un seguimiento escalable",
    "Als Creator Interaktionen in skalierbare Nachfassaktionen verwandeln",
    "Transforme a interação do seu público num seguimento que cresce consigo"
  ],
  [
    "Deliver guides, links, launch details, and answers from Instagram comments and stories without spending the day repeating the same DM.", "Envoyez guides, liens, détails de lancement et réponses depuis les commentaires et stories Instagram, sans passer la journée à répéter le même DM.",
    "Envía guías, enlaces, detalles de lanzamientos y respuestas desde comentarios e historias sin pasar el día repitiendo el mismo mensaje privado.",
    "Versende Anleitungen, Links, Launch-Details und Antworten nach Instagram-Kommentaren und Story-Interaktionen, ohne den ganzen Tag dieselbe DM zu wiederholen.",
    "Envie guias, ligações, detalhes de lançamentos e respostas a partir de comentários e histórias, sem passar o dia a repetir a mesma mensagem privada."
  ],
  [
    "Instagram automation for creators", "Automatisation Instagram pour les créateurs",
    "Automatización de Instagram para creadores",
    "Instagram-Automatisierung für Creator",
    "Automação do Instagram para criadores"
  ],
  [
    "Move Coaching Interest From Comments to Conversation", "Transformez l’intérêt pour votre coaching en conversations privées",
    "Convierte el interés por tu coaching en conversaciones privadas",
    "Interesse an Coaching vom Kommentar ins Gespräch führen",
    "Transforme o interesse no seu coaching em conversas privadas"
  ],
  [
    "Use Instagram comments as a clear intent signal, then send the right resource, application, or booking step by DM.", "Utilisez les commentaires Instagram comme signal d’intérêt, puis envoyez la ressource, le formulaire ou l’étape de réservation adaptée par DM.",
    "Usa los comentarios de Instagram como señal de interés y envía por mensaje privado el recurso, formulario o paso de reserva adecuado.",
    "Nutze Instagram-Kommentare als klares Interessenssignal und sende die passende Ressource, Bewerbung oder den nächsten Buchungsschritt per DM.",
    "Utilize os comentários do Instagram como sinal de interesse e envie o recurso, formulário ou passo de reserva adequado por mensagem privada."
  ],
  [
    "Instagram automation for coaches", "Automatisation Instagram pour les coachs",
    "Automatización de Instagram para coaches",
    "Instagram-Automatisierung für Coaches",
    "Automação do Instagram para coaches"
  ],
  [
    "Connect Product Comments to the Right Buying Step", "Reliez les commentaires produits à la bonne étape d’achat",
    "Conecta los comentarios sobre productos con el siguiente paso de compra",
    "Produktkommentare mit dem passenden Kaufschritt verbinden",
    "Ligue comentários sobre produtos ao passo de compra adequado"
  ],
  [
    "Respond to product interest on Instagram, send the correct page by DM, and track which campaign created the lead.", "Répondez à l’intérêt pour vos produits sur Instagram, envoyez la bonne page par DM et identifiez la campagne à l’origine du prospect.",
    "Responde al interés por tus productos en Instagram, envía la página correcta por mensaje privado e identifica qué campaña generó el contacto.",
    "Reagiere auf Produktinteresse bei Instagram, sende die passende Seite per DM und verfolge, welche Kampagne den Lead erzeugt hat.",
    "Responda ao interesse nos seus produtos no Instagram, envie a página certa por mensagem privada e identifique a campanha que gerou o contacto."
  ],
  [
    "Instagram automation for ecommerce", "Automatisation Instagram pour le commerce en ligne",
    "Automatización de Instagram para comercio electrónico",
    "Instagram-Automatisierung für E-Commerce",
    "Automação do Instagram para comércio eletrónico"
  ],
  [
    "Instagram DM automation", "Automatisation des messages privés Instagram",
    "Automatización de mensajes privados de Instagram",
    "Instagram-DMs automatisieren",
    "Automação de mensagens privadas do Instagram"
  ],
  [
    "Instagram comment automation", "Automatisation des commentaires Instagram",
    "Automatización de comentarios de Instagram",
    "Instagram-Kommentare automatisieren",
    "Automação de comentários do Instagram"
  ],
  [
    "Instagram auto reply", "Réponse automatique Instagram",
    "Respuesta automática en Instagram",
    "Automatische Instagram-Antworten",
    "Respostas automáticas no Instagram"
  ],
  [
    "Instagram Story automation", "Automatisation des stories Instagram",
    "Automatización de historias de Instagram",
    "Instagram-Stories automatisieren",
    "Automação de histórias do Instagram"
  ],
  [
    "AP3K Help Center", "Centre d’aide AP3K",
    "Centro de ayuda de AP3K",
    "AP3K-Hilfezentrum",
    "Centro de ajuda do AP3K"
  ],
  [
    "AP3K Documentation", "Base de connaissances AP3K",
    "Base de conocimientos de AP3K",
    "AP3K-Wissensdatenbank",
    "Base de conhecimento do AP3K"
  ],
  [
    "Clear answers for Instagram connections, automations, AI, Inbox, billing, and account controls.", "Des réponses claires sur la connexion Instagram, les automatisations, l’IA, la messagerie, la facturation et les réglages du compte.",
    "Respuestas claras sobre conexiones de Instagram, automatizaciones, IA, bandeja de entrada, facturación y ajustes de cuenta.",
    "Klare Antworten zu Instagram-Verbindungen, Automatisierungen, KI, Posteingang, Abrechnung und Kontoeinstellungen.",
    "Respostas claras sobre ligações ao Instagram, automações, IA, caixa de entrada, faturação e definições da conta."
  ],
  [
    "Plans, usage & subscription", "Offres, utilisation et abonnement",
    "Planes, uso y suscripción",
    "Tarife, Nutzung und Abonnement",
    "Planos, utilização e subscrição"
  ],
  [
    "Let's connect your Instagram and launch it now.", "Connectons votre compte Instagram pour le lancer maintenant.",
    "Conectemos tu Instagram para ponerlo en marcha.",
    "Verbinden wir dein Instagram-Konto und starten jetzt.",
    "Vamos ligar o seu Instagram e começar agora."
  ],
  [
    "Let's connect your Instagram →", "Connectons votre compte Instagram →",
    "Conectemos tu Instagram →",
    "Verbinden wir dein Instagram-Konto →",
    "Vamos ligar o seu Instagram →"
  ],
  [
    "3. AP3K listens for comments through Meta's API. No password sharing, no scraping.", "3. AP3K reçoit les commentaires via l’API de Meta, sans partage de mot de passe ni extraction de données.",
    "3. AP3K recibe comentarios mediante la API de Meta, sin compartir contraseñas ni extraer datos.",
    "3. AP3K empfängt Kommentare über die Meta-API – ohne Passwortfreigabe oder Scraping.",
    "3. O AP3K recebe comentários através da API da Meta, sem partilha de palavras-passe nem extração de dados."
  ],
  [
    "I'll explore first", "Je vais d’abord explorer",
    "Primero voy a explorar",
    "Ich schaue mich erst um",
    "Vou explorar primeiro"
  ],
  [
    "{count} contacts", "{count} contacts",
    "{count} contactos",
    "{count} Kontakte",
    "{count} contactos"
  ],
  [
    "Page {current} of {total}", "Page {current} sur {total}",
    "Página {current} de {total}",
    "Seite {current} von {total}",
    "Página {current} de {total}"
  ]
];
export const REMAINING_COPY = Object.fromEntries(SUPPORTED_LOCALES.map((locale) => [locale, Object.fromEntries(REMAINING_ROWS.map(row => [row[0], row[LOCALE_SOURCE_COLUMN[locale]]]))])) as Record<Locale, Record<string, string>>;
