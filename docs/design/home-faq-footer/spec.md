# Homepage FAQ, footer, and compact dashboard shortcuts

Requested 27 September 2026, using the attached LinktoDM FAQ and AP3K footer/dashboard screenshots.

- FAQ reference: https://linktodm.com/#faq. Observed 16 question topics, independent expandable answers, 885px content width, Inter typography, 30px/24px desktop/mobile heading, 16px questions, 16px vertical trigger padding, no row borders, and 16px chevrons.
- Answers use AP3K functionality and plan limits: one/three/ten Instagram accounts, 500 free actions, five free active automations. Historical comment backtracking and CSV export are unavailable; the FAQ does not claim otherwise.
- FAQ data in `lib/i18n/home-faq.ts` drives both rendered questions and FAQPage JSON-LD in all five supported locales.
- Meta Business Partner status was previously confirmed by the user and recorded in `docs/design/home-hero/spec.md` under Partner badge update. Reuse the existing local light/dark logo artwork. Trust text describes secure connection, partner status, and official Instagram API use; it does not add a separate certification claim.
- Desktop footer places the brand alongside five link groups. Creator/coach/ecommerce links are grouped under Solutions. All previous destinations, social links, legal links, and cookie preferences remain.
- Footer navigation uses two columns on phones, three on tablets, and five on wide desktops; brand joins it horizontally from 1024px. Footer maximum width is 1320px.
- Dashboard quick starts return to horizontal cards with 40px gradient icons, 14px titles, and 16px padding. Destinations remain comment/story/dm. Cards stack below 1024px to account for dashboard sidebar space.
- Temporary visual review routes are preview-only and must be removed before production.
