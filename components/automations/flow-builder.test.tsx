import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn(), save: vi.fn(), invalidate: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }), useSearchParams: () => new URLSearchParams("editor=basic") }));
vi.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({}) }));
vi.mock("@/actions/automation/flow", () => ({ saveAutomationFlow: mocks.save }));
vi.mock("@/actions/automation/flow-assistant", () => ({ generateAutomationFlow: vi.fn() }));
vi.mock("@/lib/automation-query-cache", () => ({ refreshSavedAutomation: mocks.invalidate }));
vi.mock("./basic-flow-editor", () => ({ default: ({ save, error }: any) => <><button onClick={() => save(true)}>Publish flow</button><button onClick={() => save(false)}>Save draft</button><p>{error}</p></> }));
vi.mock("./policy-scan-dialog", () => ({ default: ({ onPublish }: any) => <button onClick={onPublish}>Confirm publication</button> }));
vi.mock("./upgrade-dialog", () => ({ default: () => null }));
vi.mock("@/components/global/sidebar", () => ({ default: () => null }));
vi.mock("./flow-canvas", () => ({ default: () => null }));
vi.mock("./flow-preview", () => ({ default: () => null, needsSeparateFlowOpening: () => false }));
vi.mock("./flow-trigger-editor", () => ({ default: () => null, triggerLabel: () => "DM" }));
vi.mock("./flow-node-editor", () => ({ default: () => null, NODE_NAMES: {}, newFlowNode: vi.fn() }));
import FlowBuilder from "./flow-builder";

let tree: ReactTestRenderer;
const automation = { id: "flow-a", name: "Welcome", source: "DM", active: false, listener: { flowDefinition: { version: 1, entry: "welcome", oncePerContact: false, nodes: [{ id: "welcome", kind: "message", label: "Welcome", x: 0, y: 0, text: "Thanks for your message.", links: [], next: null }] } } };
beforeEach(async () => {
  vi.clearAllMocks();
  vi.stubGlobal("window", { addEventListener: vi.fn(), removeEventListener: vi.fn() });
  mocks.save.mockResolvedValue({ status: 200, id: "flow-a", revision: 1 });
  mocks.invalidate.mockResolvedValue(undefined);
  await act(async () => { tree = create(<FlowBuilder slug="owner" integrationId="ig-a" automation={automation} plan="PRO" refreshPosts={() => {}} />); });
});
afterEach(async () => { await act(async () => tree.unmount()); vi.unstubAllGlobals(); });
async function click(label: string) {
  await act(async () => { tree.root.findAllByType("button").find(button => button.props.children === label)!.props.onClick(); });
}
it("returns to Automations only after policy confirmation and a successful publish", async () => {
  await click("Publish flow");
  expect(mocks.save).not.toHaveBeenCalled();
  expect(mocks.push).not.toHaveBeenCalled();
  await click("Confirm publication");
  expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ id: "flow-a", active: true, integrationId: "ig-a" }));
  expect(mocks.invalidate).toHaveBeenCalledWith(expect.anything(), "flow-a");
  expect(mocks.push).toHaveBeenCalledWith("/dashboard/owner/automation?published=flow-a");
});
it("keeps draft saves in the editor", async () => {
  await click("Save draft");
  expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ active: false }));
  expect(mocks.push).not.toHaveBeenCalled();
});
it("keeps the editor and error visible when publication fails", async () => {
  mocks.save.mockResolvedValue({ status: 409, error: "This flow changed. Reload before publishing." });
  await click("Publish flow");
  await click("Confirm publication");
  expect(mocks.push).not.toHaveBeenCalled();
  expect(tree.root.findByType("p").props.children).toContain("Reload before publishing");
});
