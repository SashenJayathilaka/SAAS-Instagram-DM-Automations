import {docsFont} from '@/components/docs/font';
import DocsShell from '@/components/docs/docs-shell';
import {DOCS_SEARCH} from '@/lib/docs';
import tokens from '@/components/docs/tokens.module.css';

export default function DocsLayout({children}:{children:React.ReactNode}){return <div className={`${tokens.root} ${docsFont.className}`} lang="en" dir="ltr" style={{fontFamily:docsFont.style.fontFamily}}><DocsShell entries={DOCS_SEARCH}>{children}</DocsShell></div>}
