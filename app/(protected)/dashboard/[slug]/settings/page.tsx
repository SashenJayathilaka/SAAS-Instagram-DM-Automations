import { UiText } from "@/components/i18n/localized-copy";
import { getDashboardUser as onUserInfo } from "@/lib/dashboard-data";
import LanguageSwitcher from "@/components/global/language-switcher";
import ThemeToggle from "@/components/global/theme-toggle";
import { DeleteAccountButton } from "@/components/settings/delete-account-button";
import { ManageSignInSettings } from "@/components/settings/manage-sign-in-settings";
import { EmailPreferences } from "@/components/settings/email-preferences";
import { getEmailPreferences } from "@/lib/email/delivery";
import { getEmailSettingsState } from "@/lib/settings-safety";
import { LockKeyhole, Mail, Palette, ShieldAlert, Languages } from "lucide-react";
import type { ReactNode } from "react";

async function SettingsPage() {
  const userResult = await onUserInfo();
  const user = userResult.status === 200 ? userResult.data : null;
  const emailState = getEmailSettingsState(user?.email);
  const emailPreferences = user?.id
    ? await getEmailPreferences(user.id)
    : { productTips: true, weeklyReports: true, promotions: false };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-1 py-4 text-slate-950 dark:text-slate-50 sm:px-2 lg:py-6">
      <div className="ap3k-content-enter">
        <p className="ap3k-kicker">
          <UiText>{"Preferences"}</UiText>
        </p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">
          <UiText>{"Settings"}</UiText>
        </h1>
        <p className="mt-1 text-sm text-slate-500 light:text-slate-600 dark:text-slate-400">
          <UiText>{"Appearance, language, notifications, and account controls."}</UiText>
        </p>
      </div>

      <div className="grid items-stretch gap-4 sm:grid-cols-2">
        <SettingsSection
          icon={<Palette className="h-4.5 w-4.5" />}
          label="Appearance"
        >
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-sm font-black text-slate-950 dark:text-white">
                <UiText>{"Theme"}</UiText>
              </h2>
              <p className="mt-0.5 text-xs leading-5 text-slate-500 light:text-slate-600 dark:text-slate-400">
                <UiText>{"Switch AP3K between light and dark mode."}</UiText>
              </p>
            </div>
            <div className="w-full">
              <ThemeToggle className="!w-full" />
            </div>
          </div>
        </SettingsSection>

        <SettingsSection icon={<Languages className="h-4.5 w-4.5" />} label="Language">
          <h2 className="text-sm font-black text-slate-950 dark:text-white"><UiText>Display language</UiText></h2>
          <p className="mb-4 mt-0.5 text-xs leading-5 text-slate-500 dark:text-slate-400"><UiText>Choose the language you use in AP3K.</UiText></p>
          <LanguageSwitcher className="!h-12 !w-full !max-w-none !justify-between !rounded-xl !px-4" />
        </SettingsSection>
      </div>

        <SettingsSection
          icon={<LockKeyhole className="h-4.5 w-4.5" />}
          label="Account & authentication"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500 light:text-slate-600 dark:text-slate-400">
                <UiText>{"Signed-in email"}</UiText>
              </p>
              <p className="mt-1 truncate text-sm font-black text-slate-800 dark:text-slate-100">
                {emailState.email}
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500 light:text-slate-600 dark:text-slate-400">
                <UiText>
                  {
                    "Password and sign-in security are managed by your authentication provider."
                  }
                </UiText>
              </p>
            </div>
            <ManageSignInSettings />
          </div>
        </SettingsSection>

      <SettingsSection
        icon={<Mail className="h-4.5 w-4.5" />}
        label="Email notifications"
      >
        <div className="mb-4">
          <h2 className="text-sm font-black text-slate-950 dark:text-white">
            <UiText>{"Choose what reaches your inbox"}</UiText>
          </h2>
          <p className="mt-0.5 text-xs leading-5 text-slate-500 light:text-slate-600 dark:text-slate-400">
            <UiText>
              {"AP3K keeps optional email useful and gives you direct control."}
            </UiText>
          </p>
        </div>
        <EmailPreferences preferences={emailPreferences} />
      </SettingsSection>

      <section className="ap3k-content-enter rounded-2xl border border-red-200 bg-red-50/70 p-4 dark:border-red-500/25 dark:bg-red-500/[0.07] sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-red-200 bg-white text-red-600 light:text-red-700 dark:border-red-500/25 dark:bg-white/[0.04] dark:text-red-300">
              <ShieldAlert className="h-4.5 w-4.5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-red-600 light:text-red-700 dark:text-red-300">
                <UiText>{"Danger zone"}</UiText>
              </p>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-red-800 dark:text-red-200">
                <UiText>
                  {
                    "Permanently delete your automations, Instagram data, leads, billing profile, and sign-in account."
                  }
                </UiText>
              </p>
            </div>
          </div>
          <div className="shrink-0">
            <DeleteAccountButton email={emailState.email} />
          </div>
        </div>
      </section>
    </div>
  );
}

export default SettingsPage;

function SettingsSection({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <section className="ap3k-card ap3k-content-enter rounded-2xl p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-2.5 border-b border-slate-100 light:border-slate-200 pb-3 dark:border-white/[0.06]">
        <span className="grid h-8 w-8 place-items-center rounded-xl border border-slate-200 light:border-slate-300 bg-slate-50 text-rf-pink dark:border-white/10 dark:bg-white/[0.04]">
          {icon}
        </span>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-600 dark:text-slate-300">
          <UiText>{label}</UiText>
        </p>
      </div>
      {children}
    </section>
  );
}
