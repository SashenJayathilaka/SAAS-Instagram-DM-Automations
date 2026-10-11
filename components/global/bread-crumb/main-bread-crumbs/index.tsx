import { PAGE_ICONS } from "@/constants/pages";
import React from "react";

type Props = {
  page: string;
  slug: string;
};

function MainBreadCrumbs({ page, slug }: Props) {
  const title = page === "Home" ? "Home" : page;
  const subtitle =
    page === "Home"
      ? `Welcome back, ${slug}.`
      : page === "integrations"
      ? "Connect Instagram and manage official account access."
      : page === "automation"
      ? "Create and manage Instagram automations."
      : page === "billing"
      ? "Review plan limits, billing status, and monthly usage."
      : page === "settings"
      ? "Review your AP3K plan and account settings."
      : "Manage your AP3K workspace.";

  return (
    <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 px-5 py-5 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.03]">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl border border-rf-pink/20 bg-ap3k-gradient-soft">
          {PAGE_ICONS[page.toUpperCase()]}
        </span>
        <div>
          <h2 className="text-2xl font-black capitalize tracking-tight text-slate-950 dark:text-rf-text">
            {title}
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-rf-muted">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}

export default MainBreadCrumbs;
