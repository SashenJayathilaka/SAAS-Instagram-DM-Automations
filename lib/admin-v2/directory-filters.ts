import type { Prisma } from "@prisma/client";

export type DirectoryFilters = { q?: string; plan?: string; status?: string };
export function userDirectoryWhere(filters: DirectoryFilters = {}): Prisma.UserWhereInput {
  const q = typeof filters.q === "string" ? filters.q.trim().slice(0, 120) : "";
  const AND: Prisma.UserWhereInput[] = [];
  if (q) AND.push({ OR: [
    { email: { contains: q, mode: "insensitive" } },
    { firstname: { contains: q, mode: "insensitive" } },
    { lastname: { contains: q, mode: "insensitive" } },
    { integrations: { some: { instagramUsername: { contains: q.replace(/^@/, ""), mode: "insensitive" } } } },
  ] });
  if (filters.plan === "FREE") AND.push({ OR: [{ subscription: { is: null } }, { subscription: { plan: "FREE" } }] });
  else if (filters.plan === "PRO" || filters.plan === "BUSINESS") AND.push({ subscription: { plan: filters.plan } });
  if (filters.status === "ACTIVE" || filters.status === "SUSPENDED") AND.push({ status: filters.status });
  return { AND };
}

export function accountDirectoryWhere(filters: DirectoryFilters = {}): Prisma.IntegrationsWhereInput {
  const q = typeof filters.q === "string" ? filters.q.trim().slice(0, 120) : "";
  return {
    ...(q ? { OR: [
      { instagramUsername: { contains: q.replace(/^@/, ""), mode: "insensitive" } },
      { User: { email: { contains: q, mode: "insensitive" } } },
    ] } : {}),
    ...(filters.status === "attention" ? { AND: [{ OR: [{ reconnectRequired: true }, { status: "DISCONNECTED" }, { expiresAt: { lt: new Date() } }] }] } : {}),
    ...(filters.status === "locked" ? { planLocked: true } : {}),
    ...(filters.status === "connected" ? { status: "CONNECTED", planLocked: false, reconnectRequired: false, AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }] }] } : {}),
  };
}
