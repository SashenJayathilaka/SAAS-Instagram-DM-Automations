import { PRIMARY_NAVIGATION, primaryNavigationHref } from "@/constants/menu";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useI18n } from "@/providers/i18n-provider";

type Props = {
  page: string;
  slug: string;
};

function Items({ page, slug }: Props) {
  const { t } = useI18n();
  return PRIMARY_NAVIGATION.map((item) => {
    const Icon = item.icon;
    const isActive =
      item.segment === ""
        ? page === slug || page === ""
        : page === item.segment;

    return (
      <Link
        key={item.segment || "home"}
        href={primaryNavigationHref(slug, item.segment)}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "flex min-h-11 items-center gap-x-2 rounded-xl border border-transparent px-3 py-2.5 text-sm font-semibold transition-colors duration-fast",
          isActive
            ? "border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-400/20 dark:bg-violet-400/10 dark:text-violet-200"
            : "text-slate-500 light:text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-white/[0.06] dark:hover:text-white"
        )}
      >
        <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
        {t(item.messageKey)}
      </Link>
    );
  });
}

export default Items;
