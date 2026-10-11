# Message attachments

Attachment is an alternative message format in comment, story and DM editors. It sends one image/video/audio payload, without hidden text or buttons. PDFs explicitly send one Download PDF button instead of claiming native PDF support. Existing opener, follow gate, collection and delay stages continue before the final attachment. Native image/video/audio payload shape is documented in Meta's official collection:
https://raw.githubusercontent.com/fbsamples/messenger-platform-samples/main/postman/instagram-platform-api.postman_collection.json

## Storage setup

Set server-only `UPSTASH_BLOB_TOKEN` for a **private** Upstash Blob bucket on Production and isolated Preview environments. Never use a NEXT_PUBLIC variable. Without the token the upload endpoint reports503; do not report live uploads verified before configuring and testing this integration.

The browser sends file bytes directly to storage, avoiding Vercel's4.5MB function body limit. PostgreSQL retains ownership and file metadata only. Uploads require authenticated active users, same-origin requests, <=10 new reservations/minute, and <=500MB total pending/ready storage per owner. Images have an8,000,000-byte limit; video/audio/PDF have25,000,000. Actual stored bytes are streamed with an exact-length bound; signatures must match allowed formats, and image pixels are decoded with sharp before READY. Video/audio container signatures are validated; codec playback remains subject to Instagram support.

Only READY owner records appear in recent files or can be saved. Canonical AP3K UUID URLs are persisted. At native delivery time a fresh10-minute signed read URL is minted directly for Meta; no stale signed credentials are stored in scheduled jobs. UI previews use the current origin's canonical path so Preview deployments resolve their own database. PDF buttons retain stable canonical download URLs which redirect to fresh signed reads. These unguessable share URLs intentionally permit the eventual recipient to access the chosen attachment.

Multipart uploads and pending reservations older than24hours are reclaimed when that owner starts another upload. Cleanup conditional updates prevent a stale reservation from becoming ready afterward. Account deletion removes the owner's private storage prefix before removing ownership rows; storage failures stop deletion so cleanup can be retried.

Recording requests microphone permission only on user action, encodes real mono PCM WAV, stops after3minutes, and releases nodes/tracks on cancel or unmount. Storage/MIME errors are visible in the editor. PDF delivery mode is disclosed by the picker and preview.

## Deployment isolation

Object keys include production/development or a project-and-branch hash for Preview. Every read, recent-files query, save ownership check, signed delivery, quota reservation and cleanup filters the active scope. Copied Neon production records cannot expose or delete production objects from Preview even if the bucket token is shared. Direct-upload completion credentials are also bound to the scope, and stale multipart cleanup is limited to the active owner prefix. A Preview missing both branch and deployment identifiers fails closed.
