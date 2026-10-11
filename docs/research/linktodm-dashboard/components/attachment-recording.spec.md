# Attachment save and recording reference

Source: user-provided LinktoDM screenshots from 2026-10-01, 06.50.32 through 06.59.12. AP3K failure screenshot: 06.52.38. Native browser observation remains blocked; no live visual comparison is claimed.

## Save failure

Production logs at 06:49, 06:54 and 06:55 report PrismaClientUnknownRequestError at database-write. Production uploads include READY IMAGE, VIDEO and AUDIO rows. Read-only schema inspection confirms Listener_responseFormat_check still accepts only TEXT, LINK, MEDIA and PRODUCT_CARD. ATTACHMENT was omitted from the upload feature migration. Add a new forward migration that preserves existing formats and accepts ATTACHMENT. Do not edit a migration already applied in production.

Regression coverage reproduces the old rejection in PGlite/PostgreSQL, applies the real migration, inserts and updates normalized comment and DM attachment payloads for IMAGE, VIDEO, AUDIO and FILE, and checks invalid formats remain rejected.

## Recording states

- Record: one horizontal row with a small red recording indicator, pale background containing narrow blue amplitude bars, elapsed mm:ss timer, black square Stop, and X Discard. Amplitude is calculated from captured microphone PCM, not random values. Up to three minutes at 48kHz mono. Small screens retain the controls and shrink the flexible waveform.
- Stop: release microphone tracks and audio graph. Keep WAV locally; do not upload automatically. Show native audio playback and centered Upload (check, dark fill), Re-record (rotate arrow, bordered), Discard (X, borderless).
- Upload: green progress bar with filename and percentage. Retain local recording on failure or upload cancellation for retry.
- Re-record: discard local preview and request a new recording. Cancel during microphone permission must stop any stream that arrives after cancellation.
- Discard: revoke local preview URL, release microphone, return to chooser.
- Uploaded: audio player/video player above a pale filename card; image uses a thumbnail in its card. Card has extension tile (orange audio, violet video/document), filename, byte size, and X remove. Pick recent uses the same stored file metadata.
- Phone: compact playable audio bubble with black waveform; image/video rendered as media.

Preserve PNG/JPG/GIF 8MB, MP4/MOV/AAC/M4A/WAV/PDF 25MB limits, ownership and environment checks, private object storage and expiring signed delivery. WAV remains the recorder format; reference M4A encoding is not imitated by renaming bytes. Dark mode uses explicit readable text/surfaces and native audio color scheme. Reduced motion disables transitions while the meter still reflects input.
