export type TemplateVars = {
  username?: string;
  first_name?: string;
  keyword?: string;
  link?: string;
};

export function resolveTemplate(template: string, vars: TemplateVars): string {
  return template
    .replace(/\{\{username\}\}/gi, vars.username ?? "")
    .replace(/\{\{first_name\}\}/gi, vars.first_name ?? "")
    .replace(/\{\{keyword\}\}/gi, vars.keyword ?? "")
    .replace(/\{\{link\}\}/gi, vars.link ?? "");
}
