import type { Locale } from "./config";

type Card = { title: string; subtitle: string; cta: string; alt: string; features: string[] };
type Copy = { title: string; subtitle: string; cards: [Card, Card] };

export const HOME_AUTOMATION_CHOICES: Record<Locale, Copy> = {
  en: {
    title: "Create automations your way",
    subtitle: "Start simple or build advanced flows with full control",
    cards: [
      { title: "Basic Automation", subtitle: "Quick and Easy Setup", cta: "Start with Basic Automation", alt: "Basic automation steps preview", features: ["Set up in minutes", "Ready to use automation templates", "Auto reply to comments and DMs", "Collect emails and leads effortlessly", "No technical skills required"] },
      { title: "Flow Builder", subtitle: "Advanced and Limitless Flows", cta: "Start with Flow Builder", alt: "Flow builder preview", features: ["Visual node based flow builder with templates", "Multi step DM sequences", "Conditional paths and smart triggers", "Delay, filters and advanced actions", "Fully customizable journeys"] },
    ],
  },
  fr: {
    title: "Créez vos automatisations à votre façon",
    subtitle: "Commencez simplement ou créez des scénarios avancés en gardant le contrôle",
    cards: [
      { title: "Automatisation simple", subtitle: "Configuration simple et rapide", cta: "Créer une automatisation simple", alt: "Aperçu des étapes d’une automatisation simple", features: ["Configuration en quelques minutes", "Modèles d’automatisation prêts à l’emploi", "Réponses automatiques aux commentaires et DM", "Collectez facilement des emails et des prospects", "Aucune compétence technique requise"] },
      { title: "Éditeur de scénarios", subtitle: "Des scénarios avancés et sans limites", cta: "Ouvrir l’éditeur de scénarios", alt: "Aperçu de l’éditeur de scénarios", features: ["Éditeur visuel par blocs avec modèles", "Séquences de DM en plusieurs étapes", "Parcours conditionnels et déclencheurs intelligents", "Délais, filtres et actions avancées", "Parcours entièrement personnalisables"] },
    ],
  },
  es: {
    title: "Crea automatizaciones a tu manera",
    subtitle: "Empieza con algo sencillo o crea flujos avanzados con control total",
    cards: [
      { title: "Automatización básica", subtitle: "Configuración rápida y sencilla", cta: "Crear una automatización básica", alt: "Vista previa de los pasos de automatización básica", features: ["Configúrala en minutos", "Plantillas de automatización listas para usar", "Responde automáticamente a comentarios y DM", "Recopila emails y clientes potenciales fácilmente", "Sin conocimientos técnicos"] },
      { title: "Constructor de flujos", subtitle: "Flujos avanzados y sin límites", cta: "Abrir el constructor de flujos", alt: "Vista previa del constructor de flujos", features: ["Constructor visual por nodos con plantillas", "Secuencias de DM de varios pasos", "Rutas condicionales y activadores inteligentes", "Esperas, filtros y acciones avanzadas", "Recorridos totalmente personalizables"] },
    ],
  },
  de: {
    title: "Automatisierungen nach deinen Vorstellungen",
    subtitle: "Starte einfach oder erstelle erweiterte Abläufe mit voller Kontrolle",
    cards: [
      { title: "Einfache Automatisierung", subtitle: "Schnell und einfach eingerichtet", cta: "Einfache Automatisierung starten", alt: "Vorschau einfacher Automatisierungsschritte", features: ["In wenigen Minuten eingerichtet", "Sofort nutzbare Automatisierungsvorlagen", "Automatische Antworten auf Kommentare und DMs", "E-Mail-Adressen und Leads mühelos erfassen", "Keine technischen Kenntnisse erforderlich"] },
      { title: "Flow Builder", subtitle: "Erweiterte Abläufe ohne Grenzen", cta: "Mit dem Flow Builder starten", alt: "Vorschau des Flow Builders", features: ["Visueller knotenbasierter Editor mit Vorlagen", "Mehrstufige DM-Sequenzen", "Bedingte Pfade und intelligente Auslöser", "Verzögerungen, Filter und erweiterte Aktionen", "Vollständig anpassbare Abläufe"] },
    ],
  },
  pt: {
    title: "Crie automações à sua maneira",
    subtitle: "Comece de forma simples ou crie fluxos avançados com controle total",
    cards: [
      { title: "Automação básica", subtitle: "Configuração rápida e fácil", cta: "Começar com automação básica", alt: "Prévia das etapas de automação básica", features: ["Configure em minutos", "Modelos de automação prontos para usar", "Respostas automáticas a comentários e DMs", "Colete emails e leads com facilidade", "Sem necessidade de conhecimentos técnicos"] },
      { title: "Construtor de fluxos", subtitle: "Fluxos avançados e sem limites", cta: "Abrir o construtor de fluxos", alt: "Prévia do construtor de fluxos", features: ["Construtor visual baseado em nós com modelos", "Sequências de DM com várias etapas", "Caminhos condicionais e gatilhos inteligentes", "Atrasos, filtros e ações avançadas", "Jornadas totalmente personalizáveis"] },
    ],
  },
};
