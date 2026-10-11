# Unified Instagram automation previews — 27 September 2026

The user's approved reference is the existing comment/chat/story editor preview, matching the supplied LinktoDM screenshots. All sixteen template cards route through FlowBuilder, which previously displayed an unrelated thick phone frame with a blank start screen.

## Changes
- Reuse EditorPreview for post, comment and DM views. Flow, AI, conversation-starter, and quick editors share the 300px Instagram surface, profile, typography, bubbles, composer and light/dark tokens.
- Supply the connected account username/photo and selected trigger/post, including multiple-trigger selection. Preserve quick-editor design.
- Initialize flow conversations immediately; retain safe local simulation of choices, captures, conditions, random branches, delays, actions, carousels, and link clicks.
- Match the publish/runtime comment opener contract: comments need an opener; a one-choice question entry is itself that opener and must not be duplicated. DM/story events enter the graph directly.
- Show input errors within the conversation. A preview link marks only simulated link-click state and never navigates or sends a message.
- Basic editors expose required opening message/button controls and hide public comment fields for DM/story-only triggers. Desktop preview is sticky and scrollable; phone preview uses the existing accessible dialog.
- Correct the `followers` template factory: its prior generic delivery-only graph bypassed the preset's follow flag because flow publication correctly disables the legacy gate. The new graph branches on `_followsBusiness`, pauses for an explicit reply, rechecks, and only delivers on a confirmed true status. Existing saved customer graphs are not silently rewritten.

## Validation
- TypeScript passed. 166 targeted template, preview, publication, engine, scheduler and action tests passed.
- All sixteen catalog previews rendered in the browser at 300px, without errors.
- Full basic editor checked on desktop; modal checked in dark mode at 390px; carousel checked at 320px without horizontal overflow; AI editor checked in light mode.
- Browser interactions verified email → phone → name → confirmation, qualifier follower threshold, delayed continuation, follower retry and success, and suppression of the follow-up after a simulated link click.
- No live Instagram messages are sent by preview controls. These checks verify the editor and local simulation; they are not a new live Meta delivery test.
- Temporary review routes are removed before production.
