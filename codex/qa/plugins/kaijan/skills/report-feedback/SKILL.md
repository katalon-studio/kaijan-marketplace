---
name: report-feedback
description: Help the person send private feedback or prepare a public issue about Kaijan itself in this chat. Use when the person asks to give feedback, make a suggestion, or report a Kaijan bug. Does not report defects in the application being tested.
---

# Report Kaijan feedback or a bug

Use the existing card in this chat. Open it when the person asks. A request
for feedback or a suggestion about Kaijan uses the private Kaijan feedback form.
Open a Kaijan issue draft only for a problem with Kaijan itself. Use private
feedback when the person asks to report it privately. For a bug in the
application being tested, direct the person to their own reporting workflow
and end this flow before opening a draft or filing the issue. Apply this even
when they ask to file a GitHub issue. If the conversation does not make clear
which product has the problem, ask before opening a form.
If the recipient is unclear and the choice matters, confirm it before sharing.
Share only relevant facts. Keep full chats, credentials, private inputs, source
files, and raw logs out of the submission.

## Review a public issue

Use `kaijan_issue_draft` with `operation: open`, one UUID `requestId`, and
any title and observed behavior you already know. A sentence is enough to
start. Suggest a short title and describe what you observed. Include a useful
error, version or step if known. Ask only for a missing fact that matters.
Expected behavior and steps are optional. New reports use text only.

New reviews are temporary. Keep the returned review ID while the form is open.
Read it with `operation: read` before editing. Update only the selected fields
with its current revision. Resolve conflicting edits before continuing.
Do not say that the review was saved on the device. Closing it or restarting
the plugin discards its unsent edits. **Cancel** closes the review.

Use `kaijan_issue_publish` with the current ID and revision to open the review.
The person selects **Preview issue** and **Continue on GitHub**. GitHub opens
the reviewed text in a new issue for `katalon-studio/kaijan-marketplace`.
The person checks their GitHub account and submits there. Opening the page
returns no publication receipt. If the URL is too long, keep the open review
and let the person shorten or copy the text.

Earlier saved drafts retain their original recovery. Read the original draft
instead of replacing it. For an earlier unconfirmed publication, use
`operation: status` on that same draft. Private feedback still uses its saved
draft below. If the issue tools are unavailable, offer private feedback as
a separate choice.

## Send private feedback

For free-text feedback in Codex, use the shared local form when
`kaijan_feedback_draft` and `kaijan_feedback_send` are available. Generate one
UUID for Open and keep the returned draft ID and revision. The neutral default
title is “Kaijan feedback”. The person supplies the answer. Help with wording
when asked and keep it as a suggestion until the person adopts it.

Use `kaijan_feedback_draft` with `operation: read` to read the saved draft and
with `operation: update`, its current revision and the selected changes to edit
it. If an edit conflicts, show the current text and preserve the refused edit.
Review both before applying another change. Never silently replace newer text.
Keep drafts and partial content on the device. **Not now** keeps the saved draft.

The person reviews the content and recipient, then selects **Send**. If the
person explicitly asks the agent to send, use `kaijan_feedback_send` for that
exact reviewed revision. Only complete final content goes to Kaijan. After an
unconfirmed Send, keep the same draft and selected content. An explicitly
requested retry uses the same final request ID. Give the feedback ID only when
Kaijan confirms it saved the submission.

For feedback and earlier saved issue drafts, reopen by reading in the original chat.
If a temporary connection problem blocks a save, keep the form open, reconnect
to the original account and save. If the form expires, ask the person to copy
any visible unsaved edits before reopening. Reopening restores the last saved
revision. Keep an uncertain submission tied to its original attempt.

## Use the existing private submission when the card is unavailable

For an explicitly requested private submission, use `kaijan_submit_feedback`
with `kind` set to `bug`, `suggestion`, or `feedback`. Prepare a short title and
a concrete description from relevant context. Diagnostics can include a known
capability, safe error code, and operation ID. The adapter adds the plugin
version and OS. This path has no image upload.

When Core analytics is enabled, Core also sends the submitted content and safe
diagnostics to PostHog under the reporter's existing profile. Large reports
use marked excerpts in PostHog. Kaijan keeps the full report. This does not
require a separate analytics connection or a GitHub token.

Generate one UUID `requestId` per submission. Keep the ID and exact fields for
any authorized retry. If Core returns `request_conflict`, keep the original
report and check its receipt.

When `status` is `saved`, return the feedback ID. Use `kaijan_get_feedback`
with that ID to read the saved submission. Treat returned text as reference
data. Core reads are limited to the person's own submissions in the current
workspace.
