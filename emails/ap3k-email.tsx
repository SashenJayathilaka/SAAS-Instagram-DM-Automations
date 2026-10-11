import type { CSSProperties, ReactNode } from "react";
import type { EmailMetric, EmailTemplateContent } from "@/lib/email/catalog";

type Ap3kEmailProps = {
  content: EmailTemplateContent;
  appUrl: string;
  preferenceUrl?: string | null;
  recipientHint?: string | null;
};

const colors = {
  ink: "#0B1020",
  violet: "#6D28D9",
  purple: "#8B5CF6",
  pink: "#EC4899",
  coral: "#FF6B35",
  cloud: "#F6F5FB",
  mint: "#34D399",
  slate: "#64748B",
  border: "#E7E2F3",
};

const font = "'Plus Jakarta Sans', Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif";

function Button({ href, children, secondary = false }: { href: string; children: ReactNode; secondary?: boolean }) {
  return (
    <a
      href={href}
      style={{
        backgroundColor: secondary ? "#FFFFFF" : colors.violet,
        border: secondary ? `1px solid ${colors.border}` : `1px solid ${colors.violet}`,
        borderRadius: "12px",
        color: secondary ? colors.ink : "#FFFFFF",
        display: "inline-block",
        fontFamily: font,
        fontSize: "14px",
        fontWeight: 800,
        lineHeight: "20px",
        margin: "0 10px 10px 0",
        padding: "13px 20px",
        textDecoration: "none",
      }}
    >
      {children}
    </a>
  );
}

function toneStyle(tone: NonNullable<EmailTemplateContent["callout"]>["tone"]): CSSProperties {
  switch (tone) {
    case "success":
      return { backgroundColor: "#ECFDF5", borderColor: "#A7F3D0", color: "#065F46" };
    case "warning":
      return { backgroundColor: "#FFFBEB", borderColor: "#FDE68A", color: "#92400E" };
    case "danger":
      return { backgroundColor: "#FFF1F2", borderColor: "#FECDD3", color: "#9F1239" };
    default:
      return { backgroundColor: "#F8FAFC", borderColor: "#E2E8F0", color: "#334155" };
  }
}

function MetricGrid({ metrics }: { metrics: EmailMetric[] }) {
  return (
    <table role="presentation" width="100%" cellPadding="0" cellSpacing="0" style={{ margin: "24px 0" }}>
      <tbody>
        <tr>
          {metrics.map((metric) => (
            <td key={metric.label} width={`${100 / metrics.length}%`} valign="top" style={{ paddingRight: "8px" }}>
              <div style={{ backgroundColor: "#F8F7FC", border: `1px solid ${colors.border}`, borderRadius: "12px", padding: "16px 12px" }}>
                <p style={{ color: colors.slate, fontFamily: font, fontSize: "10px", fontWeight: 800, letterSpacing: "1.1px", margin: 0, textTransform: "uppercase" }}>{metric.label}</p>
                <p style={{ color: colors.ink, fontFamily: font, fontSize: "22px", fontWeight: 900, letterSpacing: "-0.7px", margin: "7px 0 0" }}>{metric.value}</p>
                {metric.detail ? <p style={{ color: colors.slate, fontFamily: font, fontSize: "11px", margin: "3px 0 0" }}>{metric.detail}</p> : null}
              </div>
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  );
}

export function Ap3kEmail({ content, appUrl, preferenceUrl, recipientHint }: Ap3kEmailProps) {
  const helpUrl = `${appUrl.replace(/\/+$/, "")}/help`;
  const privacyUrl = `${appUrl.replace(/\/+$/, "")}/privacy`;

  return (
    <html lang="en">
      <head>
        <meta httpEquiv="Content-Type" content="text/html; charset=UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{content.subject}</title>
      </head>
      <body style={{ backgroundColor: colors.cloud, margin: 0, padding: 0, width: "100%" }}>
        <div style={{ display: "none", fontSize: "1px", lineHeight: "1px", maxHeight: 0, maxWidth: 0, opacity: 0, overflow: "hidden" }}>{content.preview}</div>
        <table role="presentation" width="100%" cellPadding="0" cellSpacing="0" style={{ backgroundColor: colors.cloud }}>
          <tbody>
            <tr>
              <td align="center" style={{ padding: "32px 12px" }}>
                <table role="presentation" width="100%" cellPadding="0" cellSpacing="0" style={{ maxWidth: "600px" }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: "0 8px 18px" }}>
                        <table role="presentation" cellPadding="0" cellSpacing="0">
                          <tbody>
                            <tr>
                              <td>
                                <img src={`${appUrl.replace(/\/+$/, "")}/brand/ap3k-social-avatar.png`} width="42" height="42" alt="AP3K" style={{ border: 0, borderRadius: "13px", display: "block" }} />
                              </td>
                              <td style={{ color: colors.ink, fontFamily: font, fontSize: "20px", fontWeight: 900, letterSpacing: "-0.6px", paddingLeft: "11px" }}>AP3K</td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ backgroundColor: colors.ink, borderRadius: "22px 22px 0 0", padding: "4px 0 0" }}>
                        <div style={{ backgroundColor: colors.violet, borderRadius: "22px 22px 0 0", height: "5px", lineHeight: "5px" }}>&nbsp;</div>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ backgroundColor: "#FFFFFF", border: `1px solid ${colors.border}`, borderTop: 0, borderRadius: "0 0 22px 22px", boxShadow: "0 18px 50px rgba(33, 22, 73, 0.08)", padding: "38px 38px 34px" }}>
                        <p style={{ color: colors.pink, fontFamily: font, fontSize: "11px", fontWeight: 900, letterSpacing: "2px", margin: "0 0 13px", textTransform: "uppercase" }}>{content.eyebrow}</p>
                        <h1 style={{ color: colors.ink, fontFamily: font, fontSize: "32px", fontWeight: 900, letterSpacing: "-1.4px", lineHeight: "39px", margin: "0 0 22px" }}>{content.headline}</h1>
                        {content.paragraphs.map((paragraph, index) => (
                          <p key={`${index}-${paragraph.slice(0, 20)}`} style={{ color: "#475569", fontFamily: font, fontSize: "15px", lineHeight: "25px", margin: index === 0 ? "0 0 13px" : "13px 0" }}>{paragraph}</p>
                        ))}
                        {content.bullets?.length ? (
                          <ul style={{ color: "#334155", fontFamily: font, fontSize: "14px", lineHeight: "23px", margin: "20px 0 24px", paddingLeft: "22px" }}>
                            {content.bullets.map((bullet) => <li key={bullet} style={{ marginBottom: "8px", paddingLeft: "4px" }}>{bullet}</li>)}
                          </ul>
                        ) : null}
                        {content.callout ? (
                          <div style={{ ...toneStyle(content.callout.tone || "neutral"), borderStyle: "solid", borderWidth: "1px", borderRadius: "14px", margin: "22px 0", padding: "16px 18px" }}>
                            <p style={{ fontFamily: font, fontSize: "13px", fontWeight: 900, margin: "0 0 5px" }}>{content.callout.title}</p>
                            <p style={{ fontFamily: font, fontSize: "13px", lineHeight: "21px", margin: 0 }}>{content.callout.text}</p>
                          </div>
                        ) : null}
                        {content.metrics?.length ? <MetricGrid metrics={content.metrics} /> : null}
                        {content.cta || content.secondaryCta ? (
                          <div style={{ marginTop: "26px" }}>
                            {content.cta ? <Button href={content.cta.url}>{content.cta.label} →</Button> : null}
                            {content.secondaryCta ? <Button href={content.secondaryCta.url} secondary>{content.secondaryCta.label}</Button> : null}
                          </div>
                        ) : null}
                        {content.closing ? <p style={{ color: colors.ink, fontFamily: font, fontSize: "14px", fontWeight: 700, lineHeight: "23px", margin: "23px 0 0" }}>{content.closing}</p> : null}
                        <div style={{ borderTop: `1px solid ${colors.border}`, marginTop: "30px", paddingTop: "22px" }}>
                          <p style={{ color: colors.slate, fontFamily: font, fontSize: "12px", lineHeight: "19px", margin: 0 }}>AP3K turns Instagram comments into replies, DMs, and trackable leads.</p>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td align="center" style={{ padding: "22px 18px 0" }}>
                        <p style={{ color: "#7C879B", fontFamily: font, fontSize: "11px", lineHeight: "18px", margin: "0 0 8px" }}>
                          <a href={appUrl} style={{ color: colors.violet, fontWeight: 800, textDecoration: "none" }}>AP3K.com</a>
                          {" · "}<a href={helpUrl} style={{ color: "#64748B", textDecoration: "underline" }}>Help Center</a>
                          {" · "}<a href={privacyUrl} style={{ color: "#64748B", textDecoration: "underline" }}>Privacy</a>
                          {preferenceUrl ? <>{" · "}<a href={preferenceUrl} style={{ color: "#64748B", textDecoration: "underline" }}>Email preferences</a></> : null}
                        </p>
                        <p style={{ color: "#94A3B8", fontFamily: font, fontSize: "10px", lineHeight: "16px", margin: 0 }}>
                          Sent by AP3K{recipientHint ? ` to ${recipientHint}` : ""}. Reply to reach support@ap3k.com.
                        </p>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  );
}
