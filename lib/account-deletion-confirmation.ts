export const ACCOUNT_DELETION_CONFIRMATION_PREFIX = "DELETE";

export function getAccountDeletionConfirmation(_email?: string) {
  return ACCOUNT_DELETION_CONFIRMATION_PREFIX;
}

export function isAccountDeletionConfirmationValid(value: string, _email?: string) {
  return value.trim().toUpperCase() === ACCOUNT_DELETION_CONFIRMATION_PREFIX;
}
