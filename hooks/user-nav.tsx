import { usePathname } from "next/navigation";

export const usePath = () => {
  const pathname = usePathname();

  const safePathname = pathname ?? "";
  const path = safePathname.split("/");
  const page = path[path.length - 1] ?? "";

  return { pathname: safePathname, page };
};
