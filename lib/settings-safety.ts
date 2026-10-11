export function getEmailSettingsState(email?: string | null) {
  return {
    email: email || "Signed in with your provider",
    editable: false,
    label: "Managed by sign-in provider",
  };
}

export function getPasswordSettingsState() {
  return {
    editable: false,
    label: "Password managed by provider",
    helper: "Password is managed by your sign-in provider.",
  };
}

export function getMcpAccessTokenState() {
  return {
    enabled: false,
    badge: "Coming soon",
    helper: "No personal access tokens are generated or displayed.",
  };
}

export function getAccountDangerZoneState() {
  return {
    selfServiceDeleteEnabled: true,
    requiresTypedConfirmation: true,
    label: "Delete account permanently",
  };
}

export function getInstagramDisconnectState(safeImplementationAvailable = false) {
  return {
    enabled: safeImplementationAvailable,
    requiresTypedConfirmation: safeImplementationAvailable,
    label: safeImplementationAvailable ? "Disconnect Instagram Account" : "Contact support to remove Instagram account",
  };
}
