export function customerReplyCopy(value: string) {
  return value
    .replace(/monthly public reply limit/gi, "monthly automated-action limit")
    .replace(/monthly reply limit/gi, "monthly automated-action limit")
    .replace(/static replies?/gi, (match) =>
      match.toLowerCase().endsWith("ies") ? "automated actions" : "automated action"
    )
    .replace(/public replies/gi, "Comment replies")
    .replace(/public reply/gi, "Comment reply")
    .replace(/private replies/gi, "DMs")
    .replace(/private reply/gi, "DM")
    .replace(/private dm/gi, "DM");
}
