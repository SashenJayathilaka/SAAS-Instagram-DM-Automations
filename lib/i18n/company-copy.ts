import type { Locale } from "./config";
const en = {
  heading: "Company details",
  operator: "AP3K is operated by AP3K LLC, a limited liability company formed in Wyoming, United States.",
  registration: "Wyoming registration number",
  mailing: "Company mailing address",
  formation: "Date of formation",
  support: "Support and legal enquiries",
  updated: "Last updated: September 16, 2026.",
  termsBody: "These terms govern the agreement between the person or organization using AP3K and AP3K LLC, a limited liability company formed in Wyoming, United States.",
  privacyBody: "AP3K LLC operates AP3K and is responsible for the personal information processed as described in this policy. Contact support@ap3k.com for privacy questions and data requests.",
  privacyIntro: "Last updated: September 29, 2026. This policy explains how AP3K handles data used for Instagram automation, billing, analytics, and account management.",
  termsIntro: "Last updated: September 16, 2026. These terms govern your use of AP3K. By creating an account, connecting Instagram, or purchasing a plan, you agree to these terms.",
};
export const COMPANY_COPY: Record<Locale, typeof en> = {
  en,
  fr: {
    heading: "Informations sur la société", operator: "AP3K est exploité par AP3K LLC, une société à responsabilité limitée constituée dans le Wyoming, aux États-Unis.",
    registration: "Numéro d’immatriculation au Wyoming", mailing: "Adresse postale de la société", formation: "Date de constitution", support: "Assistance et questions juridiques", updated: "Dernière mise à jour : 16 septembre 2026.",
    termsBody: "Ces conditions régissent l’accord entre la personne ou l’organisation utilisant AP3K et AP3K LLC, une société à responsabilité limitée constituée dans le Wyoming, aux États-Unis.",
    privacyBody: "AP3K LLC exploite AP3K et est responsable des informations personnelles traitées conformément à cette politique. Pour toute question de confidentialité ou demande concernant vos données, contactez support@ap3k.com.",
    privacyIntro: "Dernière mise à jour : 29 septembre 2026. Cette politique explique comment AP3K traite les données utilisées pour l’automatisation Instagram, la facturation, les analyses et la gestion des comptes.",
    termsIntro: "Dernière mise à jour : 16 septembre 2026. Ces conditions régissent votre utilisation d’AP3K. En créant un compte, en connectant Instagram ou en achetant une offre, vous acceptez ces conditions.",
  },
  es: {
    heading: "Datos de la empresa", operator: "AP3K está gestionado por AP3K LLC, una sociedad de responsabilidad limitada constituida en Wyoming, Estados Unidos.",
    registration: "Número de registro en Wyoming", mailing: "Dirección postal de la empresa", formation: "Fecha de constitución", support: "Soporte y consultas legales", updated: "Última actualización: 16 de septiembre de 2026.",
    termsBody: "Estas condiciones regulan el acuerdo entre la persona u organización que utiliza AP3K y AP3K LLC, una sociedad de responsabilidad limitada constituida en Wyoming, Estados Unidos.",
    privacyBody: "AP3K LLC gestiona AP3K y es responsable de la información personal tratada según esta política. Para consultas de privacidad y solicitudes de datos, contacta con support@ap3k.com.",
    privacyIntro: "Última actualización: 29 de septiembre de 2026. Esta política explica cómo AP3K trata los datos utilizados para la automatización de Instagram, la facturación, las estadísticas y la gestión de cuentas.",
    termsIntro: "Última actualización: 16 de septiembre de 2026. Estas condiciones regulan tu uso de AP3K. Al crear una cuenta, conectar Instagram o contratar un plan, aceptas estas condiciones.",
  },
  de: {
    heading: "Unternehmensangaben", operator: "AP3K wird von AP3K LLC betrieben, einer Gesellschaft mit beschränkter Haftung, die in Wyoming, USA, gegründet wurde.",
    registration: "Registrierungsnummer in Wyoming", mailing: "Postanschrift des Unternehmens", formation: "Gründungsdatum", support: "Support und rechtliche Anfragen", updated: "Zuletzt aktualisiert: 16. September 2026.",
    termsBody: "Diese Bedingungen regeln die Vereinbarung zwischen der Person oder Organisation, die AP3K nutzt, und AP3K LLC, einer in Wyoming, USA, gegründeten Gesellschaft mit beschränkter Haftung.",
    privacyBody: "AP3K LLC betreibt AP3K und ist für die gemäß dieser Richtlinie verarbeiteten personenbezogenen Daten verantwortlich. Wende dich bei Datenschutzfragen und Datenanfragen an support@ap3k.com.",
    privacyIntro: "Zuletzt aktualisiert: 29. September 2026. Diese Richtlinie erläutert, wie AP3K Daten für Instagram-Automation, Abrechnung, Analysen und Kontoverwaltung verarbeitet.",
    termsIntro: "Zuletzt aktualisiert: 16. September 2026. Diese Bedingungen regeln deine Nutzung von AP3K. Mit der Erstellung eines Kontos, der Verbindung mit Instagram oder dem Kauf eines Tarifs stimmst du diesen Bedingungen zu.",
  },
  pt: {
    heading: "Dados da empresa", operator: "O AP3K é operado pela AP3K LLC, uma sociedade de responsabilidade limitada constituída no Wyoming, Estados Unidos.",
    registration: "Número de registo no Wyoming", mailing: "Morada postal da empresa", formation: "Data de constituição", support: "Apoio e questões jurídicas", updated: "Última atualização: 16 de setembro de 2026.",
    termsBody: "Estes termos regulam o acordo entre a pessoa ou organização que utiliza o AP3K e a AP3K LLC, uma sociedade de responsabilidade limitada constituída no Wyoming, Estados Unidos.",
    privacyBody: "A AP3K LLC opera o AP3K e é responsável pelas informações pessoais tratadas conforme esta política. Para questões de privacidade e pedidos de dados, contacte support@ap3k.com.",
    privacyIntro: "Última atualização: 29 de setembro de 2026. Esta política explica como o AP3K trata os dados utilizados na automação do Instagram, faturação, análises e gestão de contas.",
    termsIntro: "Última atualização: 16 de setembro de 2026. Estes termos regulam a sua utilização do AP3K. Ao criar uma conta, ligar o Instagram ou subscrever um plano, aceita estes termos.",
  },
};
export const COMPANY_TRANSLATIONS = Object.fromEntries(Object.entries(COMPANY_COPY).map(([locale, copy]) => [locale, Object.fromEntries(Object.entries(en).map(([key, source]) => [source, copy[key as keyof typeof en]]))])) as Record<Locale, Record<string, string>>;
