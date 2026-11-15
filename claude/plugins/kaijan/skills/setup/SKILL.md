---
name: setup
description: Set up Kaijan in Claude Code CLI or the local Desktop Code tab and save the selected application context.
---

# Set up Kaijan

Welcome a new user briefly. Reuse the current project, work item and target.
Ask only for missing task inputs. Application setup needs no map.

Use the installed Kaijan Core and Local tools. With a missing connection, call
`kaijan_connect` only when the task needs that connection and the user wants to
continue. The browser sign-in grants Kaijan access; Claude subscription access
is separate. Do not ask for provider keys or copy another client's credentials.
Read [connection recovery](references/provider-setup.md) if sign-in fails.

Follow `application-setup` to save the selected source, work item and optional
target. Use `test-request` for a complete testing request, `plan-tests` for a
plan-only request and `run-test` only with target/action authority. Planning
does not authorize execution. Preserve the user's approval mode.

This package presents saved reports as text in the current CLI or Desktop Code
conversation. Use [host modes](../../references/host-modes.md) for local Desktop
installation, version checks and other surface limits.
Use `review-report`; do not request a report panel or a browser report preview.
For an update, follow [update recovery](references/update-recovery.md).

Use the exact result, `isError`, original IDs and supported next action.
Keep planned tests, observed execution and assessment verdicts separate.
