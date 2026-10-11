import { personalizeUsername } from "@/lib/automation-copy";
/** Display-only formatting. React escapes all user and generated copy. */
export function MentionText({ text, username = "username" }: { text: string; username?: string }) {
  return <>{personalizeUsername(text, username).split(/(@[A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)*)/g).map((part, i) => part.startsWith("@") ? <span key={i} className="text-[#1672e6] dark:text-[#77b4ff]">{part}</span> : part)}</>;
}
