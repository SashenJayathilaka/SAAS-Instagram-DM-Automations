# AI availability incident — 2026-10-08

## Cause and immediate restoration

Production remained on PR #223. The live AI playground failed with the provider-unavailable message; admin assistant logs reported failure at the provider stage. A scoped read of provider metadata found all supported providers disabled. Google's latest connection test failed with HTTP 503. OpenRouter's subsequent connection test passed, but it was inactive.

`testAiProviderAction` disabled an active provider on any failed test, turning a temporary upstream failure into a persistent AP3K outage. The admin UI also marked a provider inactive after both successful and failed tests, independently of server routing state.

Restored the existing successfully tested OpenRouter Free Router configuration. The update required the exact observed test timestamp, model, update timestamp and no other active provider; it recorded an audit entry in the same SQL statement. No provider keys were changed. A live playground test then returned a valid reply. No automation was published or Instagram message sent during diagnosis.

## Code correction

- Connection tests update health results without changing provider activation. Explicit Pause still disables generation. Changed keys/models still require a fresh test before activation.
- The admin UI preserves the selected provider's activation state after a test and explains this behavior.
- Support, admin assistance and email personalization now use the existing model-aware completion budget, as comment/DM generation already does. This avoids their older small output limits consuming all space on reasoning tokens.
- Regression tests cover active/inactive test outcomes, transient failure recovery, explicit pause, authorization, key redaction and the assistant completion budgets.

## Verification and limits

The production configuration restoration was confirmed by a real in-app playground response. CI/build and final production checks are recorded in the PR/release result. Google remains available for owner-directed re-testing; its 503 was not treated as a credential failure. OpenRouter's free capacity can still be rate-limited or unavailable. The change does not introduce silent cross-provider failover or guarantee uninterrupted upstream service.
