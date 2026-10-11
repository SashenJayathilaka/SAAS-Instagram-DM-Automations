/** Prisma's session-level migration lock must never use Neon's pooler. */
export function migrationUrl(env) {
  const value = env.DATABASE_URL_UNPOOLED || env.DATABASE_URL;
  if (!value) throw new Error("DATABASE_URL is not configured.");
  const url = new URL(value);
  if (url.hostname.endsWith(".neon.tech")) {
    url.hostname = url.hostname.replace(/-pooler(?=\.)/, "");
    url.searchParams.delete("pgbouncer");
  }
  return url.toString();
}
