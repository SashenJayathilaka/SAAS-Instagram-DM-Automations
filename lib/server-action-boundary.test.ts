import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

function queryModules(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filename = join(directory, entry.name);
    return entry.isDirectory() ? queryModules(filename) : entry.name === "queries.ts" ? [filename] : [];
  });
}

describe("internal database query boundary", () => {
  for (const filename of queryModules("actions")) {
    it(`${filename} cannot register RPC endpoints`, () => {
      const source = ts.createSourceFile(filename, readFileSync(filename, "utf8"), ts.ScriptTarget.Latest);
      const directives: string[] = [];
      function visit(node: ts.Node) {
        if (ts.isExpressionStatement(node) && ts.isStringLiteral(node.expression)) directives.push(node.expression.text);
        ts.forEachChild(node, visit);
      }
      visit(source);
      expect(directives).not.toContain("use server");
    });
  }
  for (const name of ["user", "integration", "automation"]) {
    it(`rejects client imports of ${name} queries`, () => {
      const source = ts.createSourceFile(name, readFileSync(`actions/${name}/queries.ts`, "utf8"), ts.ScriptTarget.Latest);
      expect(source.statements.some((node) => ts.isImportDeclaration(node) &&
        ts.isStringLiteral(node.moduleSpecifier) && node.moduleSpecifier.text === "server-only")).toBe(true);
    });
  }
});
