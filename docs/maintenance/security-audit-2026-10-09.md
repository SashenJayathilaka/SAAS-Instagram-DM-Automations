# AP3K security review — 2026-10-09

Baseline: main `b302e3958b2bc6e929164e719dfb214eb68fbc56` (PR #227).
Scope: focused source, dependency and build-artifact review. This is not a certification or a guarantee that the project has no other vulnerabilities.

## Changes

- Isolate internal user, integration and automation database modules with `server-only`. Keep authenticated application actions as the public interface. The previous production build registered 38 internal query helpers; the new build registers none. Add source regression tests and a post-build manifest gate to prevent recurrence. Existing trusted billing/webhook callers retain direct server access.
- Minimize the automation editor response: omit the joined owner object, including Instagram credentials and internal connection diagnostics. Preserve all editor fields and server-side media refresh behavior.
- Enforce the support assistant's 25 daily attempts using an atomic, persistent per-owner UTC-day counter. Chat deletion cannot reset it; simultaneous requests cannot share the last available slot. Existing messages seed the initial counter. Use the existing daily rate-limit table with an isolated hashed namespace and two-day retention, avoiding the webhook counter's shorter cleanup interval. Block suspended support users and fail closed if reservation fails. Provider failures consume attempts, limiting repeated expensive retries.
- Enforce suspended-account denial in the AI workspace and shared AI usage reservation, including paid users and missing accounts.
- Update Vitest/coverage to 4.1.11, resolving its mock-server traversal advisory and bringing Vite to 8.3.4. Override PostCSS selector parser to patched 7.1.6. Preserve Next 15.5.27 and Tailwind 3 to avoid a framework/design migration during this security release.

## Verification

- Baseline compiled manifest exposed the internal query modules; the new manifest gate failed on that baseline and passes on the patched build.
- Regression suite covers the server boundaries, editor response, support actions and suspended AI reservations. CI runs the complete suite for the final commit.
- Lint and TypeScript checks passed; existing non-fatal UI lint warnings remain.
- Final production build passed, including the manifest boundary gate.
- Tests cover concurrent support attempts, history clearing, owner/day isolation, storage failure, suspended/unauthenticated users, provider-call prevention at the cap, and editor data minimization.
- No intrusive exploit requests, credential rotation, charge creation, account deletion or Instagram sends were used for verification.

## Boundaries examined

Reviewed authentication and ownership in account/integration/automation actions, selected-account cookie resolution, contacts/inbox queries, owner-admin guards, checkout verification, Stripe signature handling, Meta signature/OAuth state handling, scheduler authentication, upload ownership and size validation, media delivery, outbound Flow webhook URL/DNS/IP/redirect restrictions, AI allowance paths, and selected HTML/script sinks. Existing regression coverage exercises tenant isolation, signed webhooks, billing entitlements, scheduler auth and outbound webhook protections.

Tracked-file credential-pattern scan found only documented local/example database URLs and synthetic test fixtures. This is a narrow pattern scan, not a complete historical secret scan. Application media URLs are intentionally publicly retrievable by unpredictable ID so Meta can fetch attachments.

## Remaining risks and limits

- `npm audit` drops from 13 affected package nodes (8 high, 5 moderate) to 7 high nodes, all caused by **one** underlying advisory: `GHSA-vfj7-8cjw-p6xm` in `braces <=3.0.3`. Upstream lists no patched version. `npm audit --omit=dev` still reports five nodes because Tailwind's peer dependency graph classifies them as production dependencies. None of 130 generated server-route dependency traces includes `braces`; no application code imports it or accepts user-supplied build glob patterns. Keep build/dev tooling inaccessible to untrusted users and re-evaluate the upstream patch or a planned Tailwind upgrade. Do not use `npm audit fix --force`, which proposes unrelated breaking changes/downgrades.
- This review did not establish whether historical exploitation occurred. Production access-log forensics, historical Git secret scanning, database/service IAM, backups/restores, account MFA and third-party platform configuration need separate operational review. Do not claim that credentials have never been exposed or that all infrastructure is secure.
- The Security Scan plugin's required runtime/reference resources were unavailable; this review used manual source and dependency inspection instead.
- Public endpoint abuse across many independently created accounts, volumetric DDoS protection and a full external penetration test remain outside this focused release.

References: https://nextjs.org/docs/app/guides/data-security and https://github.com/advisories/GHSA-vfj7-8cjw-p6xm.

## Follow-up review after PR #228

Baseline: `a6f484efba32abdd368e77ea8cb2b8db1cc03cb3`.

Two additional confirmed authorization/abuse-control defects:

- **Suspended Inbox access:** Inbox actions authenticated the Clerk session and scoped resources to its owner, but never loaded the AP3K suspension status. An existing session could still read conversations/contacts, export contacts on a paid plan, and send manual replies. Select and check the status in the shared Inbox profile resolver before any of those operations. Existing selected-account ownership, connection, token, plan-lock and 24-hour reply-window checks remain in effect. Regression testing demonstrated a successful mocked send for a suspended profile before the fix, then denial before reads, session takeover and sending after it.
- **Premature removal of referral invitation limits:** Referral invitations have a global, per-recipient calendar-month counter in the shared `MarketingRateLimit` table, but marketing cleanup removed every counter idle for two days. Preserve current UTC-month windows during cleanup, while retaining the two-day grace period for recently used older windows. Check this month's durable invitation history across all partners within the existing serializable reservation transaction, so surviving invite records still block repeat mail if previous cleanup erased a counter. Keep the atomic counter for concurrent reservations and cases where partner invitation history is later deleted. Failed attempts remain counted, as before. Existing deleted counters whose invitation history was also deleted cannot be reconstructed by this patch.

Added regression coverage for suspended Inbox reads/exports/sends, valid manual replies, foreign conversations, the 24-hour window, disconnected/reconnect-required/plan-locked/expired integrations, cleanup across year/leap-month boundaries, prior invitations after counter loss, and eligible referral invitations. All external sends in these tests are mocked. The complete suite passes **1,957 tests in 254 files**. Lint and TypeScript checks pass with the existing non-fatal lint warnings.

This pass also revisited owner-admin identity verification, CSV formula escaping, selected-account ownership, legacy automation mutations, referral transaction guards, and billing portal ownership. No additional exploit was established in those inspected paths. This remains a focused review, with the infrastructure, historical exposure and dependency limitations above still applicable. No real account was suspended and no Instagram reply or invitation email was sent for testing. No database migration is required; hashed rate-limit rows can now remain until their month ends instead of being purged after two idle days.

An unrelated browser-verification finding was corrected in the same release: the referral calculator used obsolete $9/$29 monthly price estimates. It now derives the Pro/Business prices from `AP3K_PRICING` ($15/$25 monthly). This changes displayed estimates only; actual commissions remain based on paid Stripe invoices.

## Requested third-party tool and payload review after PR #229

Baseline: main `7e72353c9d7d1e771ec1e280cad5130bbd86243b`.

| Resource | Actual use | Limit |
| --- | --- | --- |
| PayloadsAllTheThings | Reviewed SSRF and CSV injection references; added 14 alternate-address/DNS cases and 9 benign CSV formula-prefix cases against AP3K's actual guards | Local tests mock DNS/HTTPS; no metadata requests or spreadsheet formula execution |
| Nuclei 3.11.1 | Executed five reviewed custom HTTP templates against `https://ap3k.com`, at one request per second; all 14 requests completed with zero request errors | A small read-only, unauthenticated check, not the full community catalog or a complete pentest |
| Shannon | Reviewed source-access, Docker, model-provider and exploit-runner requirements | Not executed: Docker unavailable; no production secrets or source uploaded to a third-party AI service |
| Strix | Reviewed its code-audit skill and local runner requirements | Not executed: Docker unavailable; source review is not represented as a Strix result |
| Codex Security deep-scan skill | Read workflow requirements | Not executed: required deep-scan server/tool unavailable; no replacement coordinator was run |

The Nuclei Linux AMD64 release ZIP was downloaded from the official GitHub
release and checked against its published checksum:
`ea63d4ae232808cd7c6bc00d0142428e231fab59dae01042246097d195835ab6`.
All five custom templates passed Nuclei validation. The first direct-connection
attempt failed DNS and is **not** treated as security evidence. The completed run
used the environment's configured outbound proxy. Missing optional local
`.nuclei-ignore` warnings did not prevent the five explicitly selected templates
from loading or the 14 requests from completing.

The only scanner match was the expected informational HTTP-200 health baseline.
No configured-file signature, unexpected anonymous success on the four selected
private/admin APIs, credentialed CORS reflection, or missing configured security
header on the two selected pages matched. Raw request/response recording,
redirects, OAST, cloud upload and intrusive templates were disabled. Reusable
checks and limitations are in `scripts/security/nuclei/README.md`.

New regression cases cover short/octal/hex/percent-encoded/Unicode loopback
addresses, equivalent metadata IP encodings, IPv4-mapped IPv6, user-info/fragment
parser confusion, and public-looking DNS names returning loopback. All are
rejected before an HTTPS request. CSV tests cover leading formula characters,
spaces, tabs and line endings in username/email/phone cells, using harmless
expressions such as `=1+1`. These **passed the existing implementation**; they are
additional protection against regressions, not newly fixed vulnerabilities.

Further upload source review ruled out two candidates: the installed SDK deletes
objects when completion validation throws, and AP3K explicitly forces multipart
uploads even for small files, preventing reuse of a single object-PUT URL after
validation. Existing owner/deployment-scope checks, MIME/byte/size checks and
completion replay guards were re-tested. Storage cleanup failures and platform
permissions remain operational considerations; this review did not test a real
storage outage or inspect cloud IAM.

No additional exploitable application defect was confirmed in this pass, and no
production application behavior or dependency versions were changed. A fresh
`npm audit` still reports seven affected package nodes from the one previously
tracked `braces` advisory. The checkout is shallow; no complete Git-history secret
scan or retrospective incident-forensics claim is made. Authenticated live
cross-tenant exploitation, infrastructure/IAM review, denial-of-service testing,
and autonomous Shannon/Strix pentests were not performed.

Reference revisions: PayloadsAllTheThings SSRF file
`f436a3e64a5a17a890f5ef1740fe0b056bba259c`, CSV file
`51f80f2af84743ddd837f960ac7b836c76ede76a`; Strix code-audit skill
`b1829e9cba9db38d6d76e9fa274da3caa188ac75`.

Verification for this pass: all **1,980 tests in 254 files** pass, including the 23
new payload cases. Type checking and lint pass; existing non-fatal lint warnings
remain. Only tests, reviewed scanner templates and audit documentation change.
