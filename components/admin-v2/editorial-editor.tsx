"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Circle,
  Eye,
  Plus,
  Save,
  Send,
  Trash2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import type { BlogPost, BlogSection } from "@/lib/blog";
import { editorialChecks } from "@/lib/editorial";
import {
  TUTORIAL_SCREENSHOTS,
  type TutorialScreenshotId,
} from "@/lib/tutorial-content";
import BlogVisual from "@/components/website/blog-visual";
import TutorialScreenshot from "@/components/website/tutorial-screenshot";
import { saveEditorialPost } from "@/actions/admin/editorial";
import { adminAssistantAction } from "@/actions/admin/assistant";
import LocalTime from "@/components/global/local-time";

export function EditorialEditor({
  initial,
  version: initialVersion,
  existing,
  history = [],
}: {
  initial: BlogPost;
  version: number;
  existing: boolean;
  history?: { id: string; date: string; action: string; post: BlogPost }[];
}) {
  const [post, setPost] = useState(initial),
    [version, setVersion] = useState(initialVersion),
    [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState(false),
    [confirm, setConfirm] = useState<"publish" | "unpublish" | null>(null),
    [word, setWord] = useState("");
  const [removeSection, setRemoveSection] = useState<number | null>(null);
  const [ai, setAi] = useState(""),
    [aiBusy, setAiBusy] = useState(false);
  const router = useRouter();
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const change = (value: Partial<BlogPost>) => {
    setPost((p) => ({ ...p, ...value }));
    setDirty(true);
  };
  const section = (index: number, value: Partial<BlogSection>) =>
    change({
      sections: post.sections.map((s, i) =>
        i === index ? { ...s, ...value } : s,
      ),
    });
  const move = (index: number, delta: number) => {
    const sections = [...post.sections];
    [sections[index], sections[index + delta]] = [
      sections[index + delta],
      sections[index],
    ];
    change({ sections });
  };
  const save = async (operation: "save" | "publish" | "unpublish") => {
    if (pending) return;
    setPending(true);
    setMessage("");
    try {
      const result = await saveEditorialPost(post, version, operation, word);
      setError(!result.ok);
      setMessage(result.message);
      if (result.ok) {
        setVersion(result.version);
        setDirty(false);
        setConfirm(null);
        setWord("");
        if (!existing) {
          router.replace(`/admin/content/${post.slug}`);
        }
        router.refresh();
      }
    } catch {
      setError(true);
      setMessage(
        "The request could not finish. Your editor content is still here. Retry after checking your connection.",
      );
    } finally {
      setPending(false);
    }
  };
  const review = async () => {
    setAiBusy(true);
    try {
      const r = await adminAssistantAction("editorial", JSON.stringify(post));
      setAi(r.message);
    } catch {
      setAi("AI review is unavailable. Your draft has not changed.");
    } finally {
      setAiBusy(false);
    }
  };
  const checks = editorialChecks(post);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#10141e] p-4">
        <div>
          <p className="text-sm font-semibold text-slate-950 dark:text-white">
            {dirty ? "Unsaved changes" : "Draft workspace"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground dark:text-slate-400">
            English content · Revision {version} · Saving does not publish
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => save("save")}
          >
            <Save className="mr-2 h-4 w-4" />
            Save draft
          </Button>
          <Button
            disabled={pending}
            onClick={() => {
              setMessage("");
              setWord("");
              setConfirm("publish");
            }}
          >
            <Send className="mr-2 h-4 w-4" />
            Publish
          </Button>
        </div>
      </div>
      {message && (
        <p
          role={error ? "alert" : "status"}
          className={`rounded-xl border p-4 text-sm ${error ? "border-red-400/30 bg-red-500/10 text-red-700 dark:text-red-200" : "border-emerald-400/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200"}`}
        >
          {message}
        </p>
      )}
      <fieldset
        disabled={pending}
        className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_300px]"
        aria-busy={pending}
      >
        <Tabs defaultValue="write" className="min-w-0">
          <TabsList>
            <TabsTrigger value="write">Write</TabsTrigger>
            <TabsTrigger value="preview">
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </TabsTrigger>
            <TabsTrigger value="history">Revisions</TabsTrigger>
          </TabsList>
          <TabsContent value="write" className="space-y-5">
            <div className="admin-panel space-y-4">
              <Field title="Article title" id="post-title">
                <Input
                  id="post-title"
                  maxLength={160}
                  value={post.title}
                  onChange={(e) => change({ title: e.target.value })}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field title="URL slug" id="post-slug">
                  <Input
                    id="post-slug"
                    disabled={existing || version > 0}
                    value={post.slug}
                    onChange={(e) => change({ slug: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground dark:text-slate-400">
                    Locked after first save to protect links.
                  </p>
                </Field>
                <Field title="Category" id="post-category">
                  <Input
                    id="post-category"
                    maxLength={60}
                    value={post.category}
                    onChange={(e) => change({ category: e.target.value })}
                  />
                </Field>
              </div>
              <Field title="Introduction" id="post-intro">
                <Textarea
                  id="post-intro"
                  rows={5}
                  value={post.intro}
                  onChange={(e) => change({ intro: e.target.value })}
                />
              </Field>
              <Field title="Cover image" id="post-cover">
                <select
                  id="post-cover"
                  className="admin-input"
                  value={post.cover || ""}
                  onChange={(e) =>
                    change({
                      cover: (e.target.value || undefined) as
                        TutorialScreenshotId | undefined,
                    })
                  }
                >
                  <option value="">Illustrated cover</option>
                  {Object.entries(TUTORIAL_SCREENSHOTS).map(([id, s]) => (
                    <option key={id} value={id}>
                      {s.title}
                    </option>
                  ))}
                </select>
              </Field>
              {!post.cover && (
                <Field title="Cover style" id="post-visual">
                  <select
                    id="post-visual"
                    className="admin-input"
                    value={post.visual}
                    onChange={(e) =>
                      change({ visual: e.target.value as BlogPost["visual"] })
                    }
                  >
                    {[
                      "workflow",
                      "connect",
                      "keyword",
                      "any-comment",
                      "dm-link",
                      "analytics",
                      "troubleshoot",
                    ].map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </Field>
              )}
              {!post.cover && (
                <>
                  <Field title="Image alternative text" id="post-alt">
                    <Input
                      id="post-alt"
                      maxLength={250}
                      value={post.visualAlt}
                      onChange={(e) => change({ visualAlt: e.target.value })}
                    />
                  </Field>
                  <Field title="Image caption" id="post-caption">
                    <Input
                      id="post-caption"
                      maxLength={400}
                      value={post.visualCaption}
                      onChange={(e) =>
                        change({ visualCaption: e.target.value })
                      }
                    />
                  </Field>
                </>
              )}
            </div>
            {post.importedArchive ? <p className="rounded-xl border p-4 text-sm">This imported article preserves its original HTML and images. Metadata can be edited here. <Link href={`/blog/${post.slug}`} className="underline" target="_blank">Open the full article</Link> to review its content.</p> : post.sections.map((s, i) => (
              <section key={i} className="admin-panel space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold">Section {i + 1}</h2>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Move section ${i + 1} up`}
                      disabled={i === 0}
                      onClick={() => move(i, -1)}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Move section ${i + 1} down`}
                      disabled={i === post.sections.length - 1}
                      onClick={() => move(i, 1)}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Remove section ${i + 1}`}
                      disabled={post.sections.length === 1}
                      onClick={() => setRemoveSection(i)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <Field title="Heading" id={`heading-${i}`}>
                  <Input
                    id={`heading-${i}`}
                    value={s.heading}
                    onChange={(e) => section(i, { heading: e.target.value })}
                  />
                </Field>
                <Field
                  title="Paragraphs (separate with a blank line)"
                  id={`body-${i}`}
                >
                  <Textarea
                    id={`body-${i}`}
                    rows={7}
                    value={s.paragraphs.join("\n\n")}
                    onChange={(e) =>
                      section(i, { paragraphs: e.target.value.split("\n\n") })
                    }
                  />
                </Field>
                <Field title="Bullet points (one per line)" id={`bullets-${i}`}>
                  <Textarea
                    id={`bullets-${i}`}
                    rows={3}
                    value={(s.bullets || []).join("\n")}
                    onChange={(e) =>
                      section(i, {
                        bullets: e.target.value
                          ? e.target.value.split("\n")
                          : [],
                      })
                    }
                  />
                </Field>
                <details>
                  <summary className="cursor-pointer text-sm text-violet-700 dark:text-violet-300">
                    Steps, links and screenshot
                  </summary>
                  <div className="mt-4 space-y-4">
                    <Field title="Screenshot" id={`screen-${i}`}>
                      <select
                        id={`screen-${i}`}
                        className="admin-input"
                        value={s.screenshot || ""}
                        onChange={(e) =>
                          section(i, {
                            screenshot: (e.target.value || undefined) as
                              TutorialScreenshotId | undefined,
                          })
                        }
                      >
                        <option value="">No screenshot</option>
                        {Object.entries(TUTORIAL_SCREENSHOTS).map(
                          ([id, img]) => (
                            <option key={id} value={id}>
                              {img.title}
                            </option>
                          ),
                        )}
                      </select>
                    </Field>
                    {(s.steps || []).map((step, n) => (
                      <div key={n} className="space-y-2">
                        <Input
                          aria-label={`Section ${i + 1} step ${n + 1} title`}
                          value={step.title}
                          onChange={(e) =>
                            section(i, {
                              steps: s.steps?.map((v, k) =>
                                k === n ? { ...v, title: e.target.value } : v,
                              ),
                            })
                          }
                        />
                        <Textarea
                          aria-label={`Section ${i + 1} step ${n + 1} body`}
                          value={step.body}
                          onChange={(e) =>
                            section(i, {
                              steps: s.steps?.map((v, k) =>
                                k === n ? { ...v, body: e.target.value } : v,
                              ),
                            })
                          }
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            section(i, {
                              steps: s.steps?.filter((_, k) => k !== n),
                            })
                          }
                        >
                          Remove step
                        </Button>
                      </div>
                    ))}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        section(i, {
                          steps: [...(s.steps || []), { title: "", body: "" }],
                        })
                      }
                    >
                      Add step
                    </Button>
                    {(s.links || []).map((link, n) => (
                      <div
                        key={n}
                        className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"
                      >
                        <Input
                          aria-label={`Section ${i + 1} link ${n + 1} label`}
                          value={link.label}
                          onChange={(e) =>
                            section(i, {
                              links: s.links?.map((v, k) =>
                                k === n ? { ...v, label: e.target.value } : v,
                              ),
                            })
                          }
                        />
                        <Input
                          aria-label={`Section ${i + 1} link ${n + 1} URL`}
                          value={link.href}
                          onChange={(e) =>
                            section(i, {
                              links: s.links?.map((v, k) =>
                                k === n ? { ...v, href: e.target.value } : v,
                              ),
                            })
                          }
                        />
                        <Button
                          variant="ghost"
                          onClick={() =>
                            section(i, {
                              links: s.links?.filter((_, k) => k !== n),
                            })
                          }
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        section(i, {
                          links: [...(s.links || []), { label: "", href: "/" }],
                        })
                      }
                    >
                      Add link
                    </Button>
                  </div>
                </details>
              </section>
            ))}
            <Button
              disabled={post.importedArchive}
              variant="outline"
              onClick={() =>
                change({
                  sections: [
                    ...post.sections,
                    { heading: "New section", paragraphs: [""] },
                  ],
                })
              }
            >
              <Plus className="mr-2 h-4 w-4" />
              Add section
            </Button>
          </TabsContent>
          <TabsContent value="preview">
            <article className="admin-panel space-y-6">
              <p className="text-xs uppercase tracking-wider text-violet-700 dark:text-violet-300">
                Private draft preview · not indexed
              </p>
              <h1 className="text-3xl font-bold">{post.title}</h1>
              <p className="leading-7 text-slate-800 dark:text-slate-300">{post.intro}</p>
              {post.cover ? (
                <TutorialScreenshot id={post.cover} />
              ) : (
                <BlogVisual variant={post.visual} alt={post.visualAlt} />
              )}{" "}
              {post.sections.map((s, i) => (
                <section key={i} className="space-y-3">
                  <h2 className="text-xl font-semibold">{s.heading}</h2>
                  {s.paragraphs.map((p, n) => (
                    <p
                      key={n}
                      className="whitespace-pre-wrap leading-7 text-slate-800 dark:text-slate-300"
                    >
                      {p}
                    </p>
                  ))}
                  {s.bullets?.length ? (
                    <ul className="list-disc space-y-2 pl-5 text-slate-800 dark:text-slate-300">
                      {s.bullets.map((b, n) => (
                        <li key={n}>{b}</li>
                      ))}
                    </ul>
                  ) : null}
                  {s.steps?.map((step, n) => (
                    <div key={n}>
                      <h3 className="font-semibold">
                        {n + 1}. {step.title}
                      </h3>
                      <p className="text-slate-800 dark:text-slate-300">{step.body}</p>
                    </div>
                  ))}
                  {s.screenshot && <TutorialScreenshot id={s.screenshot} />}{" "}
                  {s.links?.map((l, n) => (
                    <p key={n} className="text-sm text-violet-700 dark:text-violet-300">
                      {l.label} · {l.href}
                    </p>
                  ))}
                </section>
              ))}
            </article>
          </TabsContent>
          <TabsContent value="history">
            <div className="admin-panel space-y-4">
              <h2 className="font-semibold">Recent saved revisions</h2>
              <p className="text-sm text-muted-foreground dark:text-slate-400">
                Load a snapshot into the editor, review it, then save or
                publish. This does not change the live page.
              </p>
              {history.length === 0 ? (
                <p className="text-sm">No revisions yet.</p>
              ) : (
                history.map((h) => (
                  <div
                    key={h.id}
                    className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 dark:border-white/10 pt-4"
                  >
                    <div className="text-sm">
                      <p>{h.action.replace("EDITORIAL_", "")}</p>
                      <p className="text-xs text-muted-foreground dark:text-slate-400"><LocalTime value={h.date}/></p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        change({ ...h.post, slug: post.slug });
                        setMessage(
                          "Revision loaded into the editor. Review before saving.",
                        );
                        setError(false);
                      }}
                    >
                      Load revision
                    </Button>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
        <aside className="space-y-5">
          <div className="admin-panel space-y-4">
            <h2 className="font-semibold">Search appearance</h2>
            <Field title="SEO title" id="seo-title">
              <Input
                id="seo-title"
                maxLength={70}
                value={post.seoTitle || ""}
                placeholder={post.title}
                onChange={(e) => change({ seoTitle: e.target.value })}
              />
            </Field>
            <Field title="Meta description" id="seo-description">
              <Textarea
                id="seo-description"
                maxLength={170}
                rows={5}
                value={post.description}
                onChange={(e) => change({ description: e.target.value })}
              />
              <p className="text-xs text-muted-foreground dark:text-slate-400">
                {post.description.length}/170 characters
              </p>
            </Field>
            <Field title="Keywords (comma separated)" id="seo-keywords">
              <Input
                id="seo-keywords"
                value={post.keywords.join(", ")}
                onChange={(e) =>
                  change({
                    keywords: e.target.value.split(",").map((v) => v.trim()),
                  })
                }
              />
            </Field>
            <Field title="Publication date" id="post-date">
              <Input
                id="post-date"
                type="date"
                value={post.publishedAt}
                onChange={(e) => change({ publishedAt: e.target.value })}
              />
            </Field>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={post.noIndex || false}
                onChange={(e) => change({ noIndex: e.target.checked })}
                className="mt-1"
              />
              Keep this article out of search results (noindex)
            </label>
            <div className="rounded-lg border border-slate-200 dark:border-white/10 p-3">
              <p className="truncate text-xs text-muted-foreground dark:text-slate-400">
                ap3k.com/blog/{post.slug}
              </p>
              <p className="mt-2 text-lg text-violet-700 dark:text-violet-300">
                {post.seoTitle || post.title}
              </p>
              <p className="mt-1 text-sm text-muted-foreground dark:text-slate-400">{post.description}</p>
            </div>
          </div>
          <div className="admin-panel space-y-3">
            <h2 className="font-semibold">Editorial checklist</h2>
            {checks.map((c) => (
              <p
                key={c.label}
                className="flex gap-2 text-xs leading-5 text-slate-800 dark:text-slate-300"
              >
                {c.ok ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-400" />
                ) : (
                  <Circle className="mt-0.5 h-4 w-4 shrink-0 text-amber-800 dark:text-amber-300" />
                )}
                {c.label}
              </p>
            ))}
            <p className="text-xs text-muted-foreground">
              Guidance, not a ranking score or guarantee.
            </p>
          </div>
          <div className="admin-panel space-y-3">
            <h2 className="font-semibold">AI editorial review</h2>
            <p className="text-xs leading-5 text-muted-foreground dark:text-slate-400">
              Send this draft to your active AI provider for titles, gaps and
              factual-risk checks. Suggestions only.
            </p>
            <Button variant="outline" disabled={aiBusy} onClick={review}>
              <Sparkles className="mr-2 h-4 w-4" />
              {aiBusy ? "Reviewing…" : "Review draft"}
            </Button>
            {ai && (
              <p className="whitespace-pre-wrap text-sm leading-6 text-slate-800 dark:text-slate-300">
                {ai}
              </p>
            )}
          </div>
          {existing && (
            <div className="admin-panel space-y-3">
              <Link
                href={`/blog/${post.slug}`}
                target="_blank"
                className="block text-sm text-violet-700 dark:text-violet-300"
              >
                Open public URL ↗
              </Link>
              <Button
                variant="outline"
                disabled={pending}
                onClick={() => {
                  setMessage("");
                  setWord("");
                  setConfirm("unpublish");
                }}
              >
                Unpublish article
              </Button>
              <p className="text-xs text-muted-foreground dark:text-slate-400">
                Removes the page from the public blog and sitemap; keeps all
                content.
              </p>
            </div>
          )}
        </aside>
      </fieldset>
      <AlertDialog
        open={removeSection !== null}
        onOpenChange={(open) => {
          if (!open) setRemoveSection(null);
        }}
      >
        <AlertDialogContent className="admin-dialog border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-950 dark:text-white">
          <AlertDialogTitle>Remove this section?</AlertDialogTitle>
          <AlertDialogDescription>
            This only changes the draft. Reloading before saving can recover the
            last saved version.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              onClick={() => {
                change({
                  sections: post.sections.filter((_, n) => n !== removeSection),
                });
                setRemoveSection(null);
              }}
            >
              Remove section
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog
        open={Boolean(confirm)}
        onOpenChange={(open) => {
          if (!pending && !open) setConfirm(null);
        }}
      >
        <AlertDialogContent className="admin-dialog border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-950 dark:text-white">
          <AlertDialogTitle>
            {confirm === "publish"
              ? "Publish this article?"
              : "Unpublish this article?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {confirm === "publish"
              ? "Your current editor content will replace the public article immediately."
              : "The public article will become unavailable. Saved content remains recoverable."}{" "}
            Type {confirm?.toUpperCase()} to confirm.
          </AlertDialogDescription>
          {error && message && (
            <p role="alert" className="text-sm text-red-700 dark:text-red-300">
              {message}
            </p>
          )}
          <Input
            disabled={pending}
            aria-label="Publication confirmation"
            value={word}
            onChange={(e) => setWord(e.target.value)}
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <Button
              disabled={pending || word !== confirm?.toUpperCase()}
              onClick={() => confirm && save(confirm)}
            >
              {pending ? "Saving…" : "Confirm"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
function Field({
  title,
  id,
  children,
}: {
  title: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{title}</Label>
      {children}
    </div>
  );
}
