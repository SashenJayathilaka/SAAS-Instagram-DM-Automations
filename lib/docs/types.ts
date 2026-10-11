export type DocsHeading = { id: string; text: string; level: number };
export type DocsArticle = {
  slug: string;
  group: string;
  title: string;
  description: string;
  html: string;
  headings: DocsHeading[];
  updated: string;
  video?: boolean;
};
export type DocsGroup = { id: string; title: string; description: string; icon: string };
