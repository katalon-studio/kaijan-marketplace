# Continue after a Kaijan update

An update can install new instructions while an open chat still uses the earlier
Kaijan connection. Installed files do not prove which version answers this chat.

## Check before new work

1. Read `loki-build.json` from the installed package that supplies this skill.
   Keep its version, build identity and source revision as the expected package.
2. Inspect this chat's callable tools. If `loki_capabilities_list` is available,
   read its runtime identity and the requirements for the selected action.
   Compare the returned identity with the expected package. A missing identity
   is unknown, not a match.
3. Check that the tools required by the installed owning skill are callable in
   this chat. For normal test execution, these include `loki_test_execute`,
   `loki_test_get` and `loki_test_stop`. Do not run a paid test to probe availability.

If the identities differ or required tools are absent, explain the exact problem
once. For a confirmed older version: “This chat still uses the earlier Kaijan
version. Keep this chat while we check its connection.” If no tool responds:
“Kaijan is installed, but its tools are not available in this chat. Keep this
chat and its saved report links while we check recovery.” Do not call an unknown
connection an old version. Keep exact versions in the diagnostic record; do not
make the tester interpret build hashes. Claim that saved results remain
available only after reading the original records through the recovered route.

Do not fall back to an older multi-tool test flow, copy code into the installed
cache, delete saved state, or request Core sign-in to fix missing local tools.

## Preserve the work

Before any reconnect or restart, record the original goal, selected application,
source revision, target, action limits and actual run/report/configuration IDs.
Keep secrets in their approved private source. Do not copy keys or passwords
into a handoff message.

If execution is active or its effects are unknown, reconcile it through the
original connection's advertised read or Stop tools first. Preserve the original
request key and result. If that connection is unavailable, state the unresolved
run and its possible effects. Do not start a replacement run or stop an unrelated
worker. A new chat does not prove that an earlier run stopped.

## Recover in the same chat

On the tested desktop hosts, the plugin enable switch restored missing Kaijan
tools in the same chat. Use this route when the host exposes the switch:

1. Reconcile active work as described above. Check other chats that use this
   Kaijan installation too; the switch affects the plugin, not just this chat.
2. Open **Settings > Plugins**. Find the installed Kaijan profile, such as
   **Kaijan — QA**. Turn its enable switch off and wait for the disabled state.
3. Turn the same switch on and wait for the enabled state. Keep the same chat.
4. On the next turn, check the callable tools and responding package identity.
   Read the original saved configuration, run and report before continuing.

An enabled switch alone does not prove recovery. If tools remain unavailable or
the identity differs, keep the original chat and records. Do not repeat the
switch cycle or send the user between old and new chats. Continue with the
restart check below.

Use a reconnect or refresh control only if the active host exposes it for this
connection. Name the actual control; do not invent a slash command or claim that
a marketplace refresh also replaces this chat's running connection. Afterward,
repeat the identity, tool and original-record checks above.

## Check restart recovery

For a changed local plugin, OpenAI documents restarting the ChatGPT desktop app
to load the new files. A restart can interrupt other chats. Preserve work and
check active operations first. Use the host's supported restart flow with the
required human control. Do not edit host databases or force-kill the host.

After restart, return to the **original chat and project**. Check its callable
tools and selected runtime identity. Read the original Setup, test and report by
their saved IDs, then open the native report. Compare the original result hashes
and statuses, including stopped work, incomplete execution and unknown charges.
A responding tool or rendered new report alone does not prove recovery.

If restart cannot be checked now, say: “This chat cannot open its saved report
yet. Keep the chat and report link. After active work ends, restart the desktop
app and return here to check it.” Mark recovery as pending. If the same failure
remains after restart, retain the host version, expected and responding package
identities, original IDs, error and observed controls for host support. Do not
infer data loss from an unreadable record or claim that restart must fix it.

## Use a fresh chat for separate new work

A fresh chat can restore tool access for separately authorized new work. It is
not a recovery route for a report bound to the old chat. The same private profile
does not grant access to another chat's saved records. Keep the original chat
and report links; do not change scope identifiers, copy private stores or repeat
completed actions to recreate the report.

The user can select **New chat** in the same project and Kaijan profile. Create a
chat only when authorized. Check its actual tool inventory and responding
runtime identity before analysis or execution. If a supplied report cannot be
read here, state that limit once and keep its recovery in the original chat.
Do not treat a new record with the same title as retained work.

## Evidence and limits

Merlin's installed trial in [#2680](https://github.com/katalon-studio/loki/issues/2680)
confirmed new chats used the updated package while an existing chat retained the
old connection. It did not establish same-chat reconnect or restart recovery.
Later, Kestrel restored same-chat discovery with the plugin enable switch on
VL26. Rowan repeated that route on nam mac with no active Runner process: native
discovery returned the selected `0.4.0-rowan.20261104.2` build, and native reads
returned the exact original Setup, completed test and report. This verifies that
route on these hosts; it does not prove desktop restart recovery or recovery
during active work.

The later RRKY check in [#2747](https://github.com/katalon-studio/loki/issues/2747)
did not recover the original chat after an observed off/wait/on cycle. A new
chat used the selected package, but could not read the old chat's report. The old
native card failed to display. Desktop restart remains untested there. This is
a separate host result; it does not erase the successful checks above.

Record the host, expected and responding package identities, retained record IDs,
control used and readback result for each new check. Do not claim acceptance from
this guide alone.

Official references: [install and use plugins](https://learn.chatgpt.com/docs/plugins)
and [update a local plugin](https://developers.openai.com/plugins/build/plugins).
