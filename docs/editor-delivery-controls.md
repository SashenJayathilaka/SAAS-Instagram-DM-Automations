# Comment editor delivery controls

The onboarding completion page now offers Free, Pro and Business using `PLAN_CARDS` and the existing checkout handler. Nothing is billed by choosing or viewing the screen; paid choices proceed through checkout. Existing paid subscribers go to billing management.

New comment campaigns start with `send` and `dm me`. New drafts persist in session storage scoped by owner and Instagram integration. Publishing clears that local draft. Existing campaigns preserve the saved values rather than receiving the defaults again.

Free accounts can use up to 20 public-reply AI draft requests per month. These use the existing atomic PLAYGROUND quota reservation. This does not permit live AI delivery: save/publish and both alternate activation actions enforce the paid plan. Provider failure releases its reservation. Message variation generation keeps its existing paid entitlement.

A shared-post trigger requires Meta's `ig_post` attachment to identify `payload.ig_post_media_id`. Specific-post rules match that ID; Any post rules additionally verify ownership with the connected account. A share lacking reliable media identity is not matched to a comment campaign. Existing custom flow and DM triggers retain their routing.

One DM per user is one initial automation journey per recipient, enforced across comments and shares using a unique `(automationId,recipientIgId)` claim. Existing successful sends are honored when the switch is enabled later. Follow/collection callbacks continue the same journey. An ambiguous send failure retains its claim instead of risking duplicate delivery.

Delays persist before any delivery begins. Short waits (up to 15 seconds) can run in the acknowledged webhook's background lifetime; all delays are backed by a job row. The authenticated existing automation scheduler processes due jobs. Workers claim rows atomically, recheck campaign/account eligibility, cancel paused/archived/expired work and conversations that moved on, and avoid replay after ambiguous failures. Finished job payloads are cleared.

**Scheduler limitation:** GitHub's configured five-minute workflow has actually run hours apart. Follow-up configuration is now usable, but publishing keeps the existing 20-minute heartbeat check. Long-delay delivery is approximate and depends on that external scheduler; this release does not purchase a new scheduler or claim minute-accurate timing. A reliable scheduler that invokes the existing authenticated route is still required for a timing guarantee.

`/editor-review` is a preview/development-only visual fixture, returns 404 in production, and never publishes automations. It provides true iframe viewport widths for desktop/mobile review.

The two phone-preview portraits are illustrative local sample images from Random User, paired with the requested sample handles; they are not customer records.
