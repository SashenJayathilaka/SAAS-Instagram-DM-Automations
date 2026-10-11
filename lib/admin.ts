import { currentUser } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";

function parseAllowlist(value?: string) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export function isOwnerAdminIdentity(identity: { clerkId?: string | null; email?: string | null }) {
  const email = identity.email?.toLowerCase();
  const emailAllowlist = parseAllowlist(
    process.env.ADMIN_EMAILS || "officialabde@gmail.com"
  );
  const clerkIdAllowlist = parseAllowlist(process.env.ADMIN_CLERK_USER_IDS);

  return Boolean(
    (email && emailAllowlist.includes(email)) ||
    (identity.clerkId && clerkIdAllowlist.includes(identity.clerkId.toLowerCase()))
  );
}

export async function requireOwnerAdmin() {
  const user = await currentUser();
  if (!user) notFound();

  const email = user.primaryEmailAddress?.emailAddress?.toLowerCase();
  const allowed = isOwnerAdminIdentity({
    clerkId: user.id,
    // An unverified address is a claim, not proof of the allowlisted identity.
    email: user.primaryEmailAddress?.verification?.status === "verified" ? email : null,
  });

  if (!allowed) {
    console.warn("[admin-denied]", {
      currentUserExists: true,
      emailMatched: false,
      clerkIdMatched: false,
    });
    notFound();
  }

  return {
    clerkId: user.id,
    email,
    name: user.fullName,
  };
}

export function maskSecret(value?: string | null) {
  if (!value) return "empty";
  if (value.length <= 4) return "stored";
  return `stored ending ${value.slice(-4)}`;
}
