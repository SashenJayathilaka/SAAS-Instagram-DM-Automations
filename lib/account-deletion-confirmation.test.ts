import { describe, expect, it } from "vitest";
import { getAccountDeletionConfirmation, isAccountDeletionConfirmationValid } from "./account-deletion-confirmation";
describe("account deletion confirmation", () => {
  it("requires DELETE without an email", () => {
    expect(getAccountDeletionConfirmation("owner@example.com")).toBe("DELETE");
    expect(isAccountDeletionConfirmationValid(" DELETE ")).toBe(true);
    expect(isAccountDeletionConfirmationValid("delete")).toBe(true);
    for (const value of ["", "DELETE owner@example.com", "DELET", "DELETE ALL"]) {
      expect(isAccountDeletionConfirmationValid(value)).toBe(false);
    }
  });
});
