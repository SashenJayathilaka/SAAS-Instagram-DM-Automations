export function getInstagramAvatarFallbackInitial(username?: string | null, label?: string | null) {
  const candidate = [username, label]
    .map((value) => String(value ?? "").trim().replace(/^@+/, ""))
    .find(Boolean);

  return candidate ? candidate.slice(0, 1).toLocaleUpperCase() : "IG";
}
