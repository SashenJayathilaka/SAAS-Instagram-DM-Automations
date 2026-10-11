import { render, toPlainText } from "@react-email/render";
import { createElement } from "react";
import { Ap3kEmail } from "@/emails/ap3k-email";
import { buildEmailTemplate, type EmailTemplateContent, type EmailTemplateContext, type EmailTemplateId } from "@/lib/email/catalog";

export async function renderAp3kEmail(input: {
  templateId: EmailTemplateId;
  context?: EmailTemplateContext;
  appUrl: string;
  preferenceUrl?: string | null;
  recipientHint?: string | null;
  contentOverride?: EmailTemplateContent;
}) {
  const content = input.contentOverride ?? buildEmailTemplate(input.templateId, input.context ?? {}, input.appUrl);
  const html = await render(
    createElement(Ap3kEmail, {
      content,
      appUrl: input.appUrl,
      preferenceUrl: input.preferenceUrl,
      recipientHint: input.recipientHint,
    }),
    { pretty: false }
  );

  return {
    ...content,
    html,
    text: toPlainText(html),
  };
}
