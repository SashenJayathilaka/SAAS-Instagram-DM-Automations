function normalizeOrigin(value?: string, defaultProtocol = "https:") {
  const candidate = value?.trim();
  if (!candidate) return null;

  try {
    const url = new URL(candidate.includes("://") ? candidate : `${defaultProtocol}//${candidate}`);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function getApplicationUrl() {
  const vercelUrl = normalizeOrigin(process.env.VERCEL_URL);

  if (process.env.VERCEL_ENV === "preview" && vercelUrl) {
    return vercelUrl;
  }

  const configuredUrl = normalizeOrigin(process.env.NEXT_PUBLIC_HOST_URL);
  if (configuredUrl) return configuredUrl;
  if (vercelUrl) return vercelUrl;

  const port = /^\d+$/.test(process.env.PORT ?? "") ? process.env.PORT : "3000";
  return `http://localhost:${port}`;
}
