export type InstagramIntegrationSaveFailureCode =
  | "DUPLICATE_INSTAGRAM_ACCOUNT"
  | "PLAN_LIMIT_REACHED"
  | "MISSING_LOCAL_PROFILE"
  | "TOKEN_EXCHANGE_FAILED"
  | "PROFILE_FETCH_FAILED"
  | "DATABASE_SAVE_FAILED";

export class InstagramIntegrationSaveError extends Error {
  code: InstagramIntegrationSaveFailureCode;

  constructor(code: InstagramIntegrationSaveFailureCode, message: string = code) {
    super(message);
    this.name = "InstagramIntegrationSaveError";
    this.code = code;
  }
}

export function classifyInstagramIntegrationSaveError(error: unknown): InstagramIntegrationSaveFailureCode {
  if (error instanceof InstagramIntegrationSaveError) return error.code;
  const anyError = error as any;
  if (anyError?.code === "P2002") {
    const target: string[] = Array.isArray(anyError?.meta?.target) ? anyError.meta.target : [];
    if (target.includes("instagramId") || target.includes("pageId")) {
      return "DUPLICATE_INSTAGRAM_ACCOUNT";
    }
    return "DATABASE_SAVE_FAILED";
  }
  if (anyError?.message === "user_not_found") return "MISSING_LOCAL_PROFILE";
  if (anyError?.message === "invalid_page_access_token") return "TOKEN_EXCHANGE_FAILED";
  return "DATABASE_SAVE_FAILED";
}

export function instagramOAuthErrorParamForSaveFailure(code: InstagramIntegrationSaveFailureCode) {
  return code.toLowerCase();
}

export function reviewSafeInstagramOAuthErrorMessage(error: string) {
  switch (error) {
    case "duplicate_instagram_account":
      return "This Instagram account is already connected to another AP3K workspace. Remove it there first or contact support.";
    case "plan_limit_reached":
      return "Your Instagram account limit has been reached. Upgrade your plan to connect more accounts.";
    case "token_exchange_failed":
    case "profile_fetch_failed":
      return "Instagram authorization could not be completed. Please try again.";
    case "database_save_failed":
    case "integration_save_failed":
      return "Instagram authorization succeeded, but AP3K could not save the connection. Please try again.";
    default:
      return "Instagram connection could not be completed.";
  }
}

export function standardInstagramOAuthErrorMessage(error: string) {
  switch (error) {
    case "duplicate_instagram_account":
      return "This Instagram account is already connected to another AP3K workspace. Remove it there first or contact support.";
    case "plan_limit_reached":
      return "Your Instagram account limit has been reached. Upgrade your plan to connect more accounts.";
    case "missing_local_profile":
      return "Your AP3K workspace could not be found. Sign in again and retry.";
    case "token_exchange_failed":
    case "profile_fetch_failed":
      return "Instagram authorization could not be completed. Please try again.";
    case "database_save_failed":
    case "integration_save_failed":
      return "Instagram authorization succeeded, but AP3K could not save the connection. Please try again.";
    default:
      return "Instagram connection could not be completed.";
  }
}
