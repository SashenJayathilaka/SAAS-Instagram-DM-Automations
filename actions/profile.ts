"use server";

import { client } from "@/lib/prisma";
import { clerkClient, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

function cleanName(value: unknown) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function validName(value: string, required = false) {
  if (required && !value) return false;
  return value.length <= 80 && !/[\u0000-\u001f\u007f]/.test(value);
}

export async function updateProfileName(input: { firstName: string; lastName: string }) {
  const user = await currentUser();
  if (!user) return { ok: false as const, error: "Sign in again to update your name." };

  const firstName = cleanName(input.firstName);
  const lastName = cleanName(input.lastName);
  if (!validName(firstName, true) || !validName(lastName)) {
    return { ok: false as const, error: "Enter a first name and keep each name under 80 characters." };
  }

  try {
    const profile = await client.user.findUnique({ where: { clerkId: user.id }, select: { id: true } });
    if (!profile) return { ok: false as const, error: "AP3K account not found." };

    // Clerk remains the identity source. If the database write is interrupted,
    // the normal profile read synchronizes these values on the next request.
    const clerk = await clerkClient();
    await clerk.users.updateUser(user.id, { firstName, lastName });
    await client.user.update({ where: { id: profile.id }, data: { firstname: firstName, lastname: lastName } });

    revalidatePath(`/dashboard/${user.id}`);
    revalidatePath(`/dashboard/${user.id}/settings`);
    return { ok: true as const, name: [firstName, lastName].filter(Boolean).join(" ") };
  } catch {
    return { ok: false as const, error: "Could not update your name. Please try again." };
  }
}
