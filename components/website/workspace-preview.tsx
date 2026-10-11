import Image from "next/image";
import Link from "next/link";
import s from "./public-pages.module.css";

/** Existing public tutorial capture; never render a customer's live workspace. */
export default function WorkspacePreview() {
  return (
    <figure className={s.workspacePreview}>
      <div className={s.workspacePreviewHeader}>
        <strong>Inside AP3K</strong>
        <Link href="/help/workspace-tour">Explore the workspace →</Link>
      </div>
      <Image
        src="/images/docs/dashboard.webp"
        width={1353}
        height={929}
        alt="AP3K dashboard with the connected @ap3kautomation Instagram profile"
        sizes="(max-width: 767px) 92vw, 1000px"
        className={s.workspaceScreenshot}
      />
      <figcaption>
        The connected @ap3kautomation workspace. Account activity and available features
        vary.
      </figcaption>
    </figure>
  );
}
