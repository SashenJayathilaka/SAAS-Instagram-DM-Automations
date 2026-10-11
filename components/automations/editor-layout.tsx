"use client";

import { useId, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ChevronDown, Eye, Loader2, Pencil, X } from "lucide-react";
import Link from "next/link";
import { Inter } from "next/font/google";
import { useUi } from "@/components/i18n/use-ui";
import MobilePreviewDialog from "./mobile-preview-dialog";
import styles from "./editor-layout.module.css";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export default function EditorLayout({ slug, name, onNameChange, active, saving, onSave, error, children, preview, accountName, className = "", showSaveDraft = false }: {
  slug: string; name: string; onNameChange: (name: string) => void; active: boolean; saving: boolean;
  onSave: (active: boolean) => void; error?: string | null; children: ReactNode; preview: ReactNode; accountName?: string; className?: string; showSaveDraft?: boolean;
}) {
  const tr = useUi();
  const [showPreview, setShowPreview] = useState(false);
  const nameId = useId();
  return <div data-automation-editor className={`${styles.editor} ${inter.className} ${className}`}>
    <header className={styles.toolbar}>
      <div className={styles.breadcrumb}>
        <Link href={`/dashboard/${slug}/automation`} aria-label={tr("Back to automations")}><ArrowLeft size={19} /><span>{tr("Automations")}</span></Link>
        <span className={styles.slash}>/</span>
        <div className={styles.name}><input id={nameId} aria-label={tr("Automation name")} value={name} maxLength={120} placeholder={tr("Untitled automation")} onChange={e => onNameChange(e.target.value)} /><label htmlFor={nameId} aria-label={tr("Edit automation name")}><Pencil size={16} /></label></div>
        <span className={active ? styles.live : styles.draft}>{tr(active ? "Live" : "Draft")}</span>
      </div>
      <div className={styles.toolbarActions}>
        <button type="button" className={styles.mobilePreview} onClick={() => setShowPreview(true)}><Eye size={17} />{tr("Preview")}</button>

        {showSaveDraft && !active && <button type="button" className={styles.saveDraft} disabled={saving} onClick={() => onSave(false)}>{tr("Save draft")}</button>}
        <button type="button" className={styles.publish} disabled={saving} onClick={() => onSave(true)}>{saving ? <Loader2 size={16} className="animate-spin" /> : null}{tr(active ? "Save changes" : "Publish")}</button>
      </div>
    </header>
    {error && <div role="alert" className={`${styles.error} ${styles.saveError}`}>{tr(error)}</div>}
    <div className={styles.workspace}>
      <div className={styles.form} data-automation-scroll-region>
        {accountName && <p className={styles.account}><bdi>@{accountName.replace(/^@/, "")}</bdi></p>}
        
        {children}
      </div>
      <aside className={styles.preview}>{preview}</aside>
    </div>
    {showPreview && <MobilePreviewDialog onClose={() => setShowPreview(false)}>{preview}</MobilePreviewDialog>}
  </div>;
}

export function EditorGroup({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  const tr = useUi();
  return <section className={styles.group}><div className={styles.groupTitle}><h2>{tr(title)}</h2>{action}</div><div className={styles.timeline}>{children}</div></section>;
}

export function EditorRow({ title, summary, icon, open, onOpen, controls, children, onRemove }: {
  title: string; summary?: string; icon: ReactNode; open: boolean; onOpen: () => void; controls?: ReactNode; children: ReactNode; onRemove?: () => void;
}) {
  const tr = useUi(); const id = useId(); const reduced = useReducedMotion();
  return <div className={styles.row}>
    <span className={styles.rowIcon} aria-hidden="true">{icon}</span>
    <div className={styles.rowCard}>
      <div data-editor-row-header className={`${styles.rowHeader} ${open ? styles.rowHeaderOpen : ""}`}>
        <button type="button" data-editor-row-toggle className={styles.rowTrigger} aria-expanded={open} aria-controls={id} onClick={onOpen}><ChevronDown size={16} className={open ? styles.chevronOpen : styles.chevron} /><h3>{tr(title)}</h3>{summary && <span className={`${styles.summary} ${summary === tr("AI only available on paid plans.") ? styles.publishRestriction : ""}`}>{summary}</span>}</button>
        <div data-editor-row-controls className={styles.rowControls}>{controls}{onRemove && <button type="button" className={styles.remove} aria-label={`${tr("Remove")} ${tr(title)}`} onClick={onRemove}><X size={16} /></button>}</div>
      </div>
      <AnimatePresence initial={false}>{open && <motion.div id={id} className={styles.rowContent} initial={reduced ? false : { height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: reduced ? 0 : .2 }}><div className={styles.rowBody}>{children}</div></motion.div>}</AnimatePresence>
    </div>
  </div>;
}

export function EditorSwitch({ label, checked, onChange, disabled = false }: { label: string; checked: boolean; onChange: (value: boolean) => void; disabled?: boolean }) {
  const tr = useUi();
  return <button type="button" role="switch" aria-label={tr(label)} aria-checked={checked} disabled={disabled} onClick={() => onChange(!checked)} className={`${styles.switch} ${checked ? styles.switchOn : ""}`}><span /></button>;
}

export { styles as editorStyles };
