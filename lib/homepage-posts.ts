import type { BlogPost } from "./blog";

/** Optional discovery content must not delay or replace the public landing page. */
export async function loadHomepagePosts(
  load: () => Promise<BlogPost[]>,
  timeoutMs = 2000,
): Promise<BlogPost[]> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      load(),
      new Promise<BlogPost[]>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("Editorial feed timed out")),
          timeoutMs,
        );
      }),
    ]);
  } catch {
    // Never fall back to the static catalogue: the editor may have hidden posts.
    console.error("AP3K homepage: editorial feed unavailable");
    return [];
  } finally {
    clearTimeout(timer);
  }
}
