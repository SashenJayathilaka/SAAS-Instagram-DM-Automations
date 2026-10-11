/** Public company facts from the Wyoming filing and certificate dated 2026-09-16. */
export const COMPANY = {
  brand: "AP3K",
  legalName: "AP3K LLC",
  formationDate: "2026-09-16",
  registrationNumber: "2026-002082793",
  supportEmail: "support@ap3k.com",
  streetAddress: "30 N Gould St, Ste N",
  locality: "Sheridan",
  region: "WY",
  postalCode: "82801",
  country: "US",
  mailingAddress: "30 N Gould St, Ste N, Sheridan, WY 82801, United States",
  detailsUpdated: "2026-09-16",
} as const;

export const COMPANY_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": "https://ap3k.com/#organization",
  name: COMPANY.brand,
  legalName: COMPANY.legalName,
  url: "https://ap3k.com",
  foundingDate: COMPANY.formationDate,
  email: COMPANY.supportEmail,
  logo: {
    "@type": "ImageObject",
    url: "https://ap3k.com/icon.png",
    width: 512,
    height: 512,
  },
  identifier: { "@type": "PropertyValue", propertyID: "Wyoming Secretary of State filing number", value: COMPANY.registrationNumber },
  address: {
    "@type": "PostalAddress",
    name: "Mailing address",
    streetAddress: COMPANY.streetAddress,
    addressLocality: COMPANY.locality,
    addressRegion: COMPANY.region,
    postalCode: COMPANY.postalCode,
    addressCountry: COMPANY.country,
  },
};
