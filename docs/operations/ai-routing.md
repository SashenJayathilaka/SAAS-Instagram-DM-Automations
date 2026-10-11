# AI routing and recovery

All AP3K generation paths use `withAiProvider` in `lib/ai-routing.ts`: comments, private replies, support, editor copy, Story intent, Flow Builder, policy checks, conversation plans, email copy and admin assistance. Keep quota reservations, database writes and message delivery outside its callback. It may invoke generation/validation again on another approved provider.

## Owner controls

In Admin → System, save and test a connection, then enable routing or allow it as an automatic backup. Model/key changes invalidate its test and backup approval. Pause AI stops all generation even when backups remain approved. Connection tests never enable or pause routing. Test results and health writes are conditional on the exact saved model/key, so an in-flight request cannot validate replacement credentials.

The rollout migration opts existing successfully tested Google, Groq and OpenRouter connections into backup routing. It does not change credentials, models or the current enabled flag. It adds columns only, allowing the previous release to keep running during deployment or rollback.

## Selection and deadlines

A claimed, parallel synthetic JSON check measures uncalibrated verified connections (maximum six seconds per check). No customer prompt is used for calibration. The fastest measured healthy connection is tried first; actual completion speed can vary with prompt length and provider load. A manual connection test or configuration change resets calibration. Unmeasured providers remain available after measured providers. Failed calibration is retried no sooner than ten minutes later.

Routine tasks have a nine-second attempt deadline and a 28-second generation budget. Flow Builder and policy checks receive 30 seconds per provider and 90 seconds total, plus initial calibration. SDK retries are disabled. An AbortSignal bounds compatibility and graph-repair calls within the same attempt. Protected routes allow up to 120 seconds. The surrounding authentication, database work and network transit also take time; these limits do not guarantee a particular user-visible latency.

Google Gemini 3 and Groq GPT-OSS use low reasoning effort for routine tasks; flow/policy tasks use medium effort and larger output budgets. Existing product knowledge retrieval, allowed links, template tokens, graph schemas and policy-reference checks remain authoritative.

## Failover and recovery

Only saved, enabled or explicitly approved backup providers receive requests. Reject empty/truncated replies and invalid task output; try the next candidate. Explicit model refusals are terminal. Optional JSON-format parameters are retried without the format field once on HTTP 400/422; parsers still require valid structured output.

Health persists in `AiProviderConfig`, shared across server instances. HTTP 429 honors Retry-After (bounded to one hour); transient network/server failures back off from 30 seconds to five minutes. Credential/access/model-not-found failures cool down for 15 minutes. Task-specific invalid output, complex-task timeouts and HTTP 400/413/422 do not globally quarantine a provider. Flow Builder explicitly requests JSON output. A slow complex draft must not block unrelated short support or customer replies. After cooldown, one request claims the recovery attempt while others continue to backups. A valid response clears the failure state. Runtime failures never permanently disable a provider.

If every approved provider is unavailable, AP3K returns the existing safe failure result; it does not invent a response or duplicate message delivery. Redundant providers reduce outages but cannot eliminate simultaneous outages, exhausted quotas or expired credentials. Provider usage may be incurred for failed attempts or synthetic calibration, while AP3K quota accounting stays at the logical-request boundary.

## Diagnosis and maintenance

Admin shows measured test latency, backup eligibility and cooldown status. Runtime logs use `[ai-routing]` with task, provider/model, duration and sanitized status code; never log keys or prompts. Inspect health columns and upstream quota/billing when all connections fail. Resolve the provider issue and test the saved connection to clear cooldown immediately. Do not repeatedly enable/disable providers to handle transient errors.

To add a provider, update `lib/ai-providers.ts`, its task budget compatibility and regression coverage. To add an AI feature, pass generation plus strict validation to the router and keep account effects outside. To change configured models, test real short JSON, longer support answers, flow graphs and policy output before allowing traffic.

Regression coverage includes fastest-provider selection, owner pause, excluded backups, 401/404/429/503 failover, aborts, malformed output, refusal handling, recovery claims, calibration claims, retry headers, conditional settings writes and the additive PostgreSQL migration. Existing suites cover preserved graph, message, policy and quota validation.
