# Multiple Instagram accounts

Free permits 1 connection, Pro 3, Business 10. Reply and AI quotas, subscription, referrals and account settings remain per AP3K user. Automations, leads, inbox conversations, analytics, AI knowledge and playground history belong to an Instagram integration.

## Boundaries

The account cookie is an untrusted preference. Every request resolves it against owned, unlocked integrations. Missing or foreign selections use an owned default, or a no-account sentinel that cannot match records. Account switches clear client caches and start a fresh document; other open tabs reload. New wizard and AI form submissions check the account that rendered the form.

OAuth matches immutable Instagram identity, never usernames. It locks the owner row before checking capacity. Reconnecting updates the same integration without replacing others. Subscription changes use the same owner lock; downgrades preserve data but lock extra accounts, retaining the oldest eligible connections. Webhooks resolve the receiving integration and reject locked accounts. Buttons and pending flows verify the same account.

Removing one Instagram account cascades only its data. A content-free deleted-reply usage ledger preserves already-consumed monthly replies. Deleting the entire AP3K user also removes that ledger.

## Two-stage deployment

1. Deploy additive account columns, backfill, account-aware runtime and compatibility triggers. Extra connections stay closed in production and previews. The legacy inbox index remains for the old runtime during the build.
2. After stage 1 is READY, remove the old user/recipient inbox uniqueness index and the legacy AI mirror trigger, then enable connections. The integration/recipient unique index remains.

After stage 2, rollback only to the account-aware stage-1 runtime. A pre-feature runtime cannot safely process multiple integrations. Do not restore the legacy inbox uniqueness index once users have separate conversations with the same recipient on two accounts.

## Verification

The isolated Neon rehearsal preserved 46 automations, 340 conversations, and both AI configurations. A disposable two-account database fixture verified identical recipients stay separate, deleting one integration preserves the other, consumed usage survives, and complete user deletion removes usage. Unit tests cover connection limits/reconnects, foreign and locked selections, webhook scopes, pending callbacks, shared usage and stale AI forms.
