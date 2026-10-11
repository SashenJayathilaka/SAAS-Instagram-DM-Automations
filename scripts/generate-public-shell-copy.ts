import fs from 'node:fs';
import ts from 'typescript';
import { SUPPORTED_LOCALES } from '../lib/i18n/config';
import { translateUi } from '../lib/i18n/translate';

// Only these small controls belong in the public shell bundle. The full
// dashboard/editor/article catalogs remain available to their own routes.
export const PUBLIC_SHELL_SOURCES = [
  'components/global/consent-aware-analytics.tsx',
  'components/global/website-footer/index.tsx',
  'components/global/theme-toggle/index.tsx',
  'components/website/home-unique-responses.tsx',
];

export function buildPublicShellCopy() {
  const phrases = new Set<string>();
  for (const path of PUBLIC_SHELL_SOURCES) {
    const source = ts.createSourceFile(path, fs.readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const visit = (node: ts.Node) => {
      if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isJsxText(node)) {
        const phrase = node.text.replace(/\s+/g, ' ').trim();
        if (phrase) phrases.add(phrase);
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return Object.fromEntries(SUPPORTED_LOCALES.map(locale => [locale,
    Object.fromEntries(Array.from(phrases).sort().flatMap(phrase => {
      const value = translateUi(phrase, locale);
      return value !== phrase ? [[phrase, value]] : [];
    })),
  ]));
}

if (process.argv[1]?.endsWith('generate-public-shell-copy.ts')) {
  fs.writeFileSync('lib/i18n/public-shell-copy.json', JSON.stringify(buildPublicShellCopy(), null, 2) + '\n');
}
