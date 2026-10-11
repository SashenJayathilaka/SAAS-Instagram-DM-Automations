import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
vi.mock("@/components/i18n/localized-copy", () => ({ UiText: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
import { SupportReply } from "./support-reply";
let tree: ReactTestRenderer;
let reduced = false;
let hidden = false;
const finish = vi.fn();
beforeEach(() => {
  vi.useFakeTimers(); finish.mockClear(); reduced = false; hidden = false;
  vi.stubGlobal("window", { matchMedia: () => ({ matches: reduced, addEventListener: vi.fn(), removeEventListener: vi.fn() }) });
  vi.stubGlobal("document", { get hidden() { return hidden; }, addEventListener: vi.fn(), removeEventListener: vi.fn() });
});
afterEach(() => { act(() => tree?.unmount()); vi.useRealTimers(); vi.unstubAllGlobals(); });
it("reveals the complete answer within a bounded duration", () => {
  act(() => { tree = create(<SupportReply text={"Useful answer. ".repeat(120)} animate onComplete={finish} />); });
  expect(finish).not.toHaveBeenCalled();
  act(() => { vi.advanceTimersByTime(1850); });
  expect(finish).toHaveBeenCalledOnce();
  expect(tree.root.findByType("span").children.join("")).toBe("Useful answer. ".repeat(120));
});
it.each(["reduced", "hidden"])("skips animation for %s users", mode => {
  reduced = mode === "reduced"; hidden = mode === "hidden";
  act(() => { tree = create(<SupportReply text="Complete answer" animate onComplete={finish} />); });
  expect(finish).toHaveBeenCalledOnce();
  expect(tree.root.findAllByType("button")).toHaveLength(0);
});
it("cleans up timers when support closes mid-answer", () => {
  act(() => { tree = create(<SupportReply text="Example answer" animate onComplete={finish} />); });
  act(() => tree.unmount()); act(() => { vi.advanceTimersByTime(3000); });
  expect(finish).not.toHaveBeenCalled();
});
