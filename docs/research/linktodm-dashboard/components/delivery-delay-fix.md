# Delivery delay repair — 2026-10-01

Production inspection found Automation_deliveryDelaySeconds_check still restricted to 0, 3, 5, 10 and 30, while the editor/server accept every whole second through 82,800 (23 hours). The recurring QStash schedule is healthy but only wakes every five minutes; the previous worker only ran delays of 15 seconds or less inside the webhook lifetime.

A new forward migration accepts the same 0–82,800 range as normalization. It preserves existing data and rejects values outside the range. PostgreSQL regression coverage reproduces rejection of 60 seconds before applying the migration and persists representative second/minute/hour values afterward.

After storing a unique pending delivery, publish an empty signed QStash POST to the existing authenticated scheduler endpoint. Set Upstash-Not-Before from the persisted deadline rounded up to a Unix second, and deduplicate by durable job ID. Replayed webhooks preserve the original deadline; completed jobs do not publish new wakes. No recipients or webhook content are sent to QStash. Production-only publishing honors the integration's allowed regional origin, prohibits redirects, bounds network time, and never logs upstream bodies or errors containing credentials. The existing periodic queue sweep and short-delay local worker remain fallbacks.

Reference: https://upstash.com/docs/qstash/api-reference/messages/publish-a-message and https://upstash.com/docs/qstash/features/deduplication . Network/provider latency can still make delivery later than its deadline; no exact-to-the-millisecond guarantee is made. Existing database claims prevent concurrent workers from delivering the same job twice.

Validation: database range regression; persisted-deadline scheduling; completed-job suppression; regional API origin; deduplication response; provider quota/network fallback; existing queue claims/cancellation; signed scheduler authorization and route tests. Live Instagram send testing is not performed by this release.
