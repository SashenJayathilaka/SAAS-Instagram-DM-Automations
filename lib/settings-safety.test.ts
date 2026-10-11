import { describe, expect, it } from "vitest";
import {
  getAccountDangerZoneState,
  getEmailSettingsState,
  getInstagramDisconnectState,
  getMcpAccessTokenState,
  getPasswordSettingsState,
} from "@/lib/settings-safety";

describe("settings safety display states", () => {
  it("shows email as provider-managed when no backend update exists", () => {
    expect(getEmailSettingsState("creator@example.com")).toEqual({
      email: "creator@example.com",
      editable: false,
      label: "Managed by sign-in provider",
    });
  });

  it("shows password as provider-managed when no backend update exists", () => {
    expect(getPasswordSettingsState()).toEqual({
      editable: false,
      label: "Password managed by provider",
      helper: "Password is managed by your sign-in provider.",
    });
  });

  it("enables self-service account deletion with typed confirmation", () => {
    expect(getAccountDangerZoneState()).toEqual({
      selfServiceDeleteEnabled: true,
      requiresTypedConfirmation: true,
      label: "Delete account permanently",
    });
  });

  it("marks MCP tokens as coming soon without token generation", () => {
    expect(getMcpAccessTokenState()).toEqual({
      enabled: false,
      badge: "Coming soon",
      helper: "No personal access tokens are generated or displayed.",
    });
  });

  it("keeps Instagram disconnect disabled without a safe audited implementation", () => {
    expect(getInstagramDisconnectState()).toEqual({
      enabled: false,
      requiresTypedConfirmation: false,
      label: "Contact support to remove Instagram account",
    });
  });

  it("requires typed confirmation when a safe disconnect implementation is available", () => {
    expect(getInstagramDisconnectState(true)).toEqual({
      enabled: true,
      requiresTypedConfirmation: true,
      label: "Disconnect Instagram Account",
    });
  });
});
