"use client";

import { Button } from "@/components/ui/button";
import { AutomationDuoToneWhite } from "@/icons";
import Link from "next/link";
import { useI18n } from "@/providers/i18n-provider";

type Props = {
  slug?: string;
};

function CreateAutomation({ slug }: Props) {
  const { t } = useI18n();
  const href = slug ? `/dashboard/${slug}/automation/new` : "/dashboard";

  return (
    <Button
      asChild
      className="ap3k-gradient-button h-10 rounded-xl px-3 text-white sm:px-4 lg:px-5"
    >
      <Link href={href} className="whitespace-nowrap">
        <AutomationDuoToneWhite />
        <p className="hidden sm:inline">{t("createAutomation")}</p>
      </Link>
    </Button>
  );
}

export default CreateAutomation;

// 04.40
