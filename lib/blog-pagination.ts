export const BLOG_PAGE_SIZE = 9;
export function blogPagePath(page: number): string {
  return page === 1 ? "/blog" : `/blog?page=${page}`;
}
export function getBlogPage(value: string | string[] | undefined, total: number) {
  if (Array.isArray(value) || (value !== undefined && !/^[1-9]\d*$/.test(value))) return null;
  const page = value === undefined ? 1 : Number(value);
  const pages = Math.max(1, Math.ceil(total / BLOG_PAGE_SIZE));
  if (!Number.isSafeInteger(page) || page > pages) return null;
  return { page, pages, start: (page - 1) * BLOG_PAGE_SIZE, end: page * BLOG_PAGE_SIZE };
}
