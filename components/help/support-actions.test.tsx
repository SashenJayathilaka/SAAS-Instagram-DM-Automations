import React from "react";
import { act, create } from "react-test-renderer";
import { expect, it, vi } from "vitest";
vi.mock("@/components/i18n/localized-copy", () => ({ UiText: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("next/link", () => ({ default: ({ children, href }: any) => <a href={href}>{children}</a> }));
vi.mock("@/components/global/billing/manage-billing-button", () => ({ ManageBillingButton: (props: any) => <button data-portal={props.intent}>{props.label}</button> }));
import { SupportActions } from "./support-actions";
it("requires explicit review before exposing the Stripe cancellation handoff", () => {
  let tree: ReturnType<typeof create>;
  act(() => { tree = create(<SupportActions actions={["cancel", "billing"]} workspace="owner" />); });
  expect(tree!.root.findAllByProps({ "data-portal": "cancel" })).toHaveLength(0);
  act(() => tree!.root.findAllByType("button")[0].props.onClick());
  expect(tree!.root.findAllByProps({ "data-portal": "cancel" })).toHaveLength(1);
  expect(tree!.root.findByType("a").props.href).toBe("/dashboard/owner/billing");
  act(() => tree!.unmount());
});
