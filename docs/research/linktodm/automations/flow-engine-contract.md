# Observed flow behavior and engine contract

Observed live 2026-09-27 in authenticated console. Templates:
- Comment to DM after Delay: comment keyword `link` -> message `Thanks for your comment .Want the details?` with `Get info` button -> delay 10 seconds -> `Here is your details`.
- Ask to follow: comment keyword `link` -> `Hey glad you reached out. Please follow us to unlock full details` button `Yes, I followed` -> delay 30 seconds -> condition is_user_follow_business true -> `Thanks for following. Here is everything you need`; false -> `Follow us and message again to continue` button `Yes, I followed` loops to delay.
- DM Qualifier: DM contains `collab` -> question `Are you a creator or brand`, Creator -> follower_count >1000 -> yes `Thanks we will review your profile`, no `Atleast 1000 followers needed for collab`; Brand -> follower_count >500 -> yes `Great, can I have your contact details. I'll reach out shortly`, no `Oops, we are currently not open for collabs.`

Flow node menu: Send message, Delay, Conditions, Action, Collect payment, Randomizer. Delay units Seconds/Minutes/Hours/Days. Conditions: If user followed me, If business follows user, Verified on Instagram, Followers count, Contact email, Contact phone, Custom field. Trigger drawer: post/reel comment, story reply, incoming DM, story mention, shared post/reel. AI interface observed; generation is Pro gated in reference account.

Extend existing version-1 schema compatibly, not replace historic definitions:
- `delay {seconds: integer 1..604800, next}`; persist scheduled dueAt. Delays must never sleep inside webhooks. Expired messaging windows must cancel, not send illegally. UI explain window if delay crosses it.
- `phone {text,next,skip}` analogous email. Persist phone to Lead via migration if missing (root handles schema).
- question accepts 1..3 replies (one-button callback is valid).
- condition adds optional `operator: eq|neq|contains|gt|lt|exists` default eq while retaining equals. Reserved fields `_followsBusiness`, `_businessFollows`, `_verified`, `_followerCount`, plus email/phone/custom fields. Unknown profile data must not satisfy comparison.
- `setfield {field,value,next}` durable session value, tag unchanged.
- `carousel {text,cards:[{title,subtitle,image,links}],next}` 1..10 cards; card image and links validation mirrors existing product card. Root owns Instagram outbound helper adaptation if needed.
- Allow loops only through a customer-response step (question/email/phone). Continue blocking autonomous cycles and runaway bursts. Max 50 nodes, 6 outbound messages per execution turn.
- Scheduler resumes delay with ownership, plan, active, window, manual reply and lease checks. Duplicate cron requests cannot double send. STOP cancels delayed sessions. Editing cancels active sessions as today.
- reserved profile fields must be fetched freshly before checking conditions; follow observations call root's observeAutomationFollow only with known boolean and scope. Never fake missing profile counts.

Root owns shared Prisma schema/migrations, existing instagram-dm.ts and webhook integration. Report requested fields/API changes rather than concurrently editing them. Other files can be delegated with explicit ownership.
