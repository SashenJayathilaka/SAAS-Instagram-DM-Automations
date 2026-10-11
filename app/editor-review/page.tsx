import { notFound } from "next/navigation";
import EditorReview from "./review";
export const metadata={robots:{index:false,follow:false}};
export default async function Page(props:{searchParams: Promise<{frame?:string;screen?:string}>}) {
  const searchParams = await props.searchParams;
  if(process.env.VERCEL_ENV !== "preview" && process.env.NODE_ENV === "production") notFound();
  return <EditorReview frame={searchParams.frame === "1"} screen={searchParams.screen === "pricing" ? "pricing" : "editor"}/>;
}
