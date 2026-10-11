import { onIntegrate, recordInstagramOAuthError } from "@/actions/integration";
import { dashboardPath } from "@/lib/dashboard";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

type Props = {
  searchParams: Promise<{
    code?: string;
    state?: string;
    error?: string;
    error_reason?: string;
    error_description?: string;
    message?: string;
  }>;
};

function integrationRedirect(slug?: string, error?: string) {
  const target = error && slug ? `${dashboardPath(slug)}/integrations` : dashboardPath(slug);
  if (!error) return redirect(target);

  const separator = target.includes("?") ? "&" : "?";
  return redirect(`${target}${separator}integration_error=${encodeURIComponent(error)}`);
}

function isInsufficientDeveloperRole(params: Awaited<Props["searchParams"]>) {
  const combined = [
    params.error,
    params.error_reason,
    params.error_description,
    params.message,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return combined.includes("insufficient developer role");
}

async function Page(props: Props) {
  const searchParams = await props.searchParams;
  const { code, state, error, error_reason, error_description, message } = searchParams;

  if (error || error_reason || error_description || message) {
    const clerkUser = await currentUser();
    const errorCode = isInsufficientDeveloperRole(searchParams)
      ? "insufficient_developer_role"
      : "provider_denied";

    if (errorCode === "insufficient_developer_role") {
      await recordInstagramOAuthError(errorCode);
    }

    console.warn("[oauth] callback returned provider error", {
      hasCode: Boolean(code),
      providerError: true,
      errorCode,
    });
    return integrationRedirect(clerkUser?.id, errorCode);
  }

  if (code) {
    const user = await onIntegrate(code.split("#_")[0], state);
    const slug = user.data?.clerkId || "";

    if (user.status === 200) {
      const integrationId = user.data && "integrationId" in user.data ? user.data.integrationId : null;
      if (typeof integrationId === "string") return redirect(`/api/instagram/selected?integrationId=${encodeURIComponent(integrationId)}`);
      return integrationRedirect(slug);
    }

    if (user.status === 202) {
      return redirect(`${dashboardPath(slug)}/integrations/select-account`);
    }

    return integrationRedirect(slug, user.error ?? "oauth_failed");
  }

  return integrationRedirect(undefined, "missing_code");
}

export default Page;
