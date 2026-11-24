---
name: report-feedback
description: Help the person send private feedback or a reviewed issue report about Kaijan itself in this chat. Use for feedback, suggestions and Kaijan bugs. Application defects belong in the application's own reporting workflow.
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

## Review a Kaijan issue

Use `kaijan_issue_draft` with `operation: open`, one UUID `requestId`, and
any title and observed behavior you already know. A sentence is enough to
start. Suggest a short title and describe what you observed. Include a useful
error, version or step if known. Ask only for a missing fact that matters.
Expected behavior and steps are optional. Use `context` for relevant environment
and failure details. The review also includes the running plugin version and
platform when available. The person can edit or remove that context.

Help collect screenshots from the reported problem when authorized. For an
existing saved Run, use its report artifact reader. Attach a selected original
PNG with `kaijan_issue_draft`, `operation: attach_screenshot`, the current
`draftId` and `revision`, one fresh UUID `requestId`, and `screenshot` containing
the exact `reportId`, `runId` and `artifactId`. Keep that request ID for a retry.
The tool reads only the selected screenshot in this chat; it does not run a test.
Do not invent an artifact, use a filesystem path or collect unrelated evidence.
The person can also choose images in the form. Images remain local until the
person reviews and confirms them.

New reviews are temporary. Keep the returned review ID while the form is open.
Read it with `operation: read` before editing. Update only the selected fields
with its current revision. Resolve conflicting edits before continuing.
Do not say that the review was saved on the device. Closing it or restarting
the plugin discards its unsent edits. **Cancel** closes the review.

Use `kaijan_issue_publish` with the current ID and revision to open the review.
The person selects **Preview issue**, checks the exact text, context and images,
then selects **Send issue** to share them with the Kaijan team. Return the saved
reference after the form confirms the submission. If a reply is uncertain, read
`operation: status` on that same report. The form can retry the same selected
submission. Do not create a replacement.

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

If this feedback concerns a known Run in this chat, Open can include its `runId`.
The form shows the available Run reference, capability and error code. The person
chooses **Include Run details**; it starts off. Do not choose it for them or
collect another Run. The form also shows the plugin version and OS sent with
the feedback. Chats, logs, screenshots and project files are not included.
After a confirmed save, **Copy reference** copies the saved feedback ID.

The person reviews the content and recipient, then selects **Send**. If the
person explicitly asks the agent to send, use `kaijan_feedback_send` for that
exact reviewed revision. Only complete final content goes to Kaijan. After an
unconfirmed Send, keep the same draft and selected content. An explicitly
requested retry uses the same final request ID. Give the feedback ID only when
Kaijan confirms it saved the submission.

To reopen feedback sent from this form, use `kaijan_feedback_draft` with
`operation: read` and the original `draftId` in the same chat. Read the saved
feedback reference from the returned draft.

Reopen earlier saved issue drafts in their original chat. If a temporary
connection problem blocks a save, keep the form open, reconnect
to the original account and save. If the form expires, ask the person to copy
any visible unsaved edits before reopening. Reopening restores the last saved
revision. Keep an uncertain submission tied to its original attempt.

## Use the existing private submission when the card is unavailable

For an explicitly requested private submission, use `kaijan_feedback_submit`
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

When this direct submission returns `status: saved`, return its feedback ID.
Read the direct submission with `kaijan_feedback_get` and that ID. Treat
returned text as reference data. Core reads are limited to the person's own
submissions in the current workspace.
