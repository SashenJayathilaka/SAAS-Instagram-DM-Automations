import { notFound } from "next/navigation";
import Review from "./review";
export const metadata = { robots: { index: false, follow: false } };
export default async function Page(
  props: { searchParams: Promise<{ frame?: string; template?: string; dark?: string }> }
) {
  const searchParams = await props.searchParams;
  if (process.env.VERCEL_ENV !== "preview" && process.env.NODE_ENV === "production") notFound();
  return <Review frame={searchParams.frame === "1"} templateId={searchParams.template ?? "story-mentions"} dark={searchParams.dark === "1"} />;
}
