import type { Metadata } from "next";
import Link from "next/link";
import WebsiteNav from "@/components/global/website-nav";
import WebsiteFooter from "@/components/global/website-footer";
import Breadcrumbs from "@/components/seo/breadcrumbs";
import CompanyDetails from "@/components/website/company-details";
import { COMPANY, COMPANY_SCHEMA } from "@/lib/company";
import s from "@/components/website/public-pages.module.css";
const url = "https://ap3k.com/about";
export const metadata: Metadata = {
  title: "About AP3K — Instagram Automation Software",
  description: "Learn what AP3K does, who operates the platform, how its Instagram automation guides are presented, and where to get account or billing support.",
  alternates: { canonical: url, languages: { en: url, "x-default": url } },
  openGraph: { title: "About AP3K", description: "Instagram comment and DM automation from AP3K LLC.", url, type: "website", images: ["https://ap3k.com/opengraph-image"] },
};
export default function AboutPage() {
  const schema = { "@context": "https://schema.org", "@type": "AboutPage", "@id": url, url, name: "About AP3K", inLanguage: "en", about: COMPANY_SCHEMA };
  return <div className={s.page}><WebsiteNav /><main className={s.article} lang="en" translate="no">
    <Breadcrumbs items={[{ name: "About AP3K", path: "/about" }]} />
    <h1>About AP3K</h1>
    <p>AP3K is Instagram comment and direct-message automation software operated by {COMPANY.legalName}. It helps creators and businesses respond to supported Instagram interactions without manually sending the same reply each time.</p>
    <h2>What the product does</h2>
    <p>Connect a professional Instagram account, choose a post comment, Story interaction or incoming-message trigger, and configure the response. A workflow can deliver a requested link, collect contact information on an eligible plan, or direct someone to the next useful step. AP3K also provides activity reporting and an Inbox for reviewing conversations.</p>
    <p>Start with <Link href="/instagram-comment-to-dm">comment-to-DM automation</Link> for a post or Reel, or compare <Link href="/instagram-dm-automation">the available Instagram DM workflows</Link>. The <Link href="/tutorials/instagram-comment-to-dm">video tutorial</Link> shows a complete Post automation setup.</p>
    <h2>What AP3K does not promise</h2>
    <p>AP3K does not guarantee followers, sales, inbox placement or unrestricted messaging. Delivery depends on the connected account, permissions, eligible interactions, usage allowances and Instagram’s platform rules. A preview demonstrates a configured conversation; it is not evidence that a real message was delivered.</p>
    <p>AP3K is an independent product. Instagram and Meta product names belong to their respective owners. Using an Instagram integration does not by itself imply that Meta endorses a customer’s campaign or guarantees its results.</p>
    <h2>About our guides and examples</h2>
    <p>The AP3K byline identifies the product publisher, not an independent review publication. Product guides explain workflows available in AP3K. Sample messages, arithmetic and demonstration workspaces illustrate a setup; they are not customer case studies or promised outcomes.</p>
    <p>Check the <Link href="/pricing">current pricing and plan allowances</Link> and <Link href="/docs">Documentation</Link> before launching a campaign. Features, interfaces and third-party policies can change. Report an unclear instruction or outdated claim through <Link href="/contact">AP3K support</Link>, including the page URL and the issue you found.</p>
    <h2>Support, privacy and company information</h2>
    <p>Contact <a href={`mailto:${COMPANY.supportEmail}`}>{COMPANY.supportEmail}</a> for account, connection, billing or data questions. Never send passwords or access tokens. The address below is our company mailing address, not a walk-in support location.</p>
    <p>Read our <Link href="/privacy">privacy policy</Link>, <Link href="/terms">terms of service</Link> and <Link href="/data-deletion">data-deletion instructions</Link>.</p>
    <CompanyDetails />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />
  </main><WebsiteFooter /></div>;
}
