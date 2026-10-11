"use client";
import { COMPANY } from "@/lib/company";
import { COMPANY_COPY } from "@/lib/i18n/company-copy";
import { useI18n } from "@/providers/i18n-provider";

export default function CompanyDetails({ compact = false }: { compact?: boolean }) {
  const { locale } = useI18n();
  const copy = COMPANY_COPY[locale];
  if (compact) return <div className="mt-3 max-w-2xl space-y-1 text-xs leading-6 text-slate-500 dark:text-rf-muted">
    <p>{copy.operator}</p>
    <p>{copy.registration}: <bdi dir="ltr">{COMPANY.registrationNumber}</bdi></p>
    <p>{copy.mailing}: <bdi dir="ltr">{COMPANY.mailingAddress}</bdi></p>
  </div>;
  return <section className="mt-8 rounded-2xl border border-slate-200 bg-white/80 p-6 text-sm leading-7 dark:border-white/10 dark:bg-[#111827]">
    <h2 className="text-lg font-black">{copy.heading}</h2>
    <p className="mt-3 text-slate-600 dark:text-slate-300">{copy.operator}</p>
    <dl className="mt-4 grid gap-4 sm:grid-cols-2">
      <div><dt className="font-bold">{copy.registration}</dt><dd><bdi dir="ltr">{COMPANY.registrationNumber}</bdi></dd></div>
      <div><dt className="font-bold">{copy.formation}</dt><dd><time dateTime={COMPANY.formationDate}>{new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${COMPANY.formationDate}T00:00:00Z`))}</time></dd></div>
      <div><dt className="font-bold">{copy.mailing}</dt><dd><address className="not-italic"><bdi dir="ltr">{COMPANY.mailingAddress}</bdi></address></dd></div>
      <div><dt className="font-bold">{copy.support}</dt><dd><a className="break-all text-violet-600 underline underline-offset-4 dark:text-violet-300" href={`mailto:${COMPANY.supportEmail}`}><bdi dir="ltr">{COMPANY.supportEmail}</bdi></a></dd></div>
    </dl>
  </section>;
}
